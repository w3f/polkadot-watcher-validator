import { ApiPromise, WsProvider } from '@polkadot/api';
import { Event } from '@polkadot/types/interfaces/system';
import { Tuple } from '@polkadot/types/codec';
import { Logger } from '@w3f/logger';

import {
    InputConfig,
    SubscriberConfig,
    Subscribable,
    PromClient,
    Notifier,
    TransactionType
} from './types';
import { asyncForEach } from './async';

interface InitializedMap {
    [name: string]: boolean;
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
        for (const subscription of this.subscribe.transactions) {
            this._initializedTransactions[subscription.name] = false;
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
        await asyncForEach(this.subscribe.transactions, async (account) => {
            await this.api.query.system.account(account.address, async (acc) => {
                const nonce = acc.nonce;
                this.logger.info(`The nonce for ${account.name} is ${nonce}`);
                if (this._initializedTransactions[account.name]) {
                    this.logger.info(`New transaction from ${account.name}`);
                    // send data to notifier
                    const data = {
                        name: account.name,
                        address: account.address,
                        networkId: this.networkId,
                        txType: TransactionType.Sent
                    };
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

    private _isOfflineEvent(event: Event): boolean {
        return event.section == 'imOnline' && event.method == 'SomeOffline';
    }
}
