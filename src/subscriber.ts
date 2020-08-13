import { ApiPromise, WsProvider } from '@polkadot/api';
import { Event } from '@polkadot/types/interfaces/system';
import { Balance, BlockNumber, Header } from '@polkadot/types/interfaces';
import { Tuple } from '@polkadot/types/codec';
import { Logger } from '@w3f/logger';

import {
    InputConfig,
    SubscriberConfig,
    Subscribable,
    PromClient,
    Notifier,
    TransactionType,
    TransactionData
} from './types';
import { ZeroBalance, ZeroBN } from './constants';
import { asyncForEach } from './async';

interface InitializedMap {
    [name: string]: boolean;
}

interface FreeBalance {
    [name: string]: Balance;
}

export class Subscriber {
    private api: ApiPromise;
    private endpoint: string;
    private networkId: string;
    private subscribe: SubscriberConfig;
    private validators: Array<Subscribable>;
    private _initializedTransactions: InitializedMap;

    constructor(
        cfg: InputConfig,
        private readonly promClient: PromClient,
        private readonly notifier: Notifier,
        private readonly logger: Logger) {

        this.endpoint = cfg.endpoint;
        this.networkId = cfg.networkId
        this.subscribe = cfg.subscribe
        this.validators = cfg.validators

        this._initializedTransactions = {};
        if(this.subscribe.transactions){
            for (const subscription of this.subscribe.transactions) {
                this._initializedTransactions[subscription.name] = false;
            }
        }
    }

    public async start(): Promise<void> {
        await this._initAPI();

        if (this.subscribe.transactions) {
            await this._subscribeTransactions();
        }
        if (this.subscribe.producers) {
            await this._subscribeProducers();
        }
        if (this.subscribe.offline) {
            await this._subscribeOffline();
        }
        if (this.subscribe.offline) {
            await this._subscribePreventiveSessionOffline();
        }
    }

    get isInitialized(): InitializedMap {
        return this._initializedTransactions;
    }

    private async _initAPI(): Promise<void> {
        const provider = new WsProvider(this.endpoint);
        this.api = await ApiPromise.create({ provider });

        const [chain, nodeName, nodeVersion] = await Promise.all([
            this.api.rpc.system.chain(),
            this.api.rpc.system.name(),
            this.api.rpc.system.version()
        ]);
        this.logger.info(
            `You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`
        );
    }

    private async _subscribeTransactions(): Promise<void> {
        const freeBalance: FreeBalance = {};
        await asyncForEach(this.subscribe.transactions, async (account) => {
            const { data: { free: previousFree } } = await this.api.query.system.account(account.address);
            freeBalance[account.address] = previousFree;
            await this.api.query.system.account(account.address, async (acc) => {
                const nonce = acc.nonce;
                this.logger.info(`The nonce for ${account.name} is ${nonce}`);
                const currentFree = acc.data.free;

                if (this._initializedTransactions[account.name]) {
                    const data: TransactionData = {
                        name: account.name,
                        address: account.address,
                        networkId: this.networkId
                    };

                    // check if the action was performed by the account or externally
                    const change = currentFree.sub(freeBalance[account.address]);
                    if (!change.gt(ZeroBalance)) {
                        this.logger.info(`Action performed from account ${account.name}`);

                        data.txType = TransactionType.Sent;
                    } else {
                        this.logger.info(`Transfer received in account ${account.name}`);

                        data.txType = TransactionType.Received;
                    }

                    freeBalance[account.address] = currentFree;

                    try {
                        await this.notifier.newTransaction(data);
                    } catch (e) {
                        this.logger.error(`could not notify transaction: ${e.message}`);
                    }
                } else {
                    this._initializedTransactions[account.name] = true;
                }
            });
        });
    }

    private async _subscribeProducers(): Promise<void> {
        this.validators.forEach((account) => {
            // always increase metric even the first time, so that we initialize the time serie
            // https://github.com/prometheus/prometheus/issues/1673
            this.promClient.increaseTotalBlocksProduced(account.name, account.address)
        });

        this.api.rpc.chain.subscribeNewHeads(async (header) => {
            // get block author
            const hash = await this.api.rpc.chain.getBlockHash(header.number.toNumber());
            const deriveHeader = await this.api.derive.chain.getHeader(hash);
            const author = deriveHeader.author;
            if (author) {
                const account = this.validators.find((producer) => producer.address == author.toString());
                if (account) {
                    this.logger.info(`New block produced by ${account.name}`);
                    this.promClient.increaseTotalBlocksProduced(account.name, account.address);

                    // reset potential offline counters
                    this.promClient.resetTotalValidatorOfflineReports(account.name);
                }
            }
        });
    }

    private async _subscribeOffline(): Promise<void> {
        this.validators.forEach((account) => {
            // always increase metric even the first time, so that we initialize the time serie
            // https://github.com/prometheus/prometheus/issues/1673
            this.promClient.resetTotalValidatorOfflineReports(account.name);
        });

        this.api.query.system.events((events) => {
            events.forEach((record) => {
                const { event } = record;

                if (this._isOfflineEvent(event)) {
                    const items = event.data[0];

                    (items as Tuple).forEach((item) => {
                        const offlineValidator = item[0];
                        this.logger.info(`${offlineValidator} found offline`);
                        const account = this.validators.find((subject) => subject.address == offlineValidator);

                        if (account) {
                            this.logger.info(`Target ${account.name} found offline`);
                            this.promClient.increaseTotalValidatorOfflineReports(account.name, account.address);
                        }
                    });
                }
            });
        });
    }

    private async _subscribePreventiveSessionOffline(): Promise<void> {

        this.validators.forEach((account) => {
            // always increase metric even the first time, so that we initialize the time serie
            // https://github.com/prometheus/prometheus/issues/1673
            this.promClient.resetStateValidatorOfflineSessionReports(account.name);
        });

        this.api.rpc.chain.subscribeNewHeads(async (lastHeader) => {
            let isHeartbeatExpected = await this._isHeadAfterHeartbeatBlockThreshold(lastHeader)
            await asyncForEach(this.validators, async (account) => {
                if( isHeartbeatExpected && ! await this._hasValidatorAuthoredBlocks(account) && ! await this._hasValidatorSentHeartbeat(account) ){
                    this.logger.info(`Target ${account.name} has either not authored any block or sent any heartbeat yet`);
                    this.promClient.setStateValidatorOfflineSessionReports(account.name)
                }
                else{
                    this.promClient.resetStateValidatorOfflineSessionReports(account.name)
                }
            })
        });
    }

    private _isOfflineEvent(event: Event): boolean {
        return event.section == 'imOnline' && event.method == 'SomeOffline';
    }

    private async _getHeartbeatBlockThreshold(): Promise<BlockNumber> {
        return this.api.query.imOnline.heartbeatAfter()
    }

    private async _isHeadAfterHeartbeatBlockThreshold(header: Header) : Promise<boolean> {
        let currentBlock = header.number.toBn()
        let blockThreshold = await this._getHeartbeatBlockThreshold()
        return currentBlock.cmp(blockThreshold) > 0
    }

    private async _hasValidatorAuthoredBlocks(validator: Subscribable) : Promise<boolean> {
        const sessionIndex = await this.api.query.session.currentIndex()
        const numBlocksAuthored = await this.api.query.imOnline.authoredBlocks(sessionIndex,validator.address)
        return numBlocksAuthored.cmp(ZeroBN) > 0
    }

    private async _hasValidatorSentHeartbeat(validator: Subscribable) : Promise<boolean> {
        //TODO this function needs a refactoring
        const sessionIndex = await this.api.query.session.currentIndex()
        
        const validators = await this.api.query.session.validators() 
        if ( ! validators.includes(validator.address) ) {
            return false
        }
        let validatorIndex = validators.indexOf(validator.address)
        
        let hb = await this.api.query.imOnline.receivedHeartbeats(sessionIndex,validatorIndex) 
        return hb.toHuman() ? true : false
    }

   




}
