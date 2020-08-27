import { ApiPromise, WsProvider } from '@polkadot/api';
import { Event } from '@polkadot/types/interfaces/system';
import { Balance, BlockNumber, Header, SessionIndex, ValidatorId } from '@polkadot/types/interfaces';
import { Tuple, Vec } from '@polkadot/types/codec';
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
    private currentEraIndex: number;
    private validatorActiveSet: Vec<ValidatorId>;
    private sessionIndex: SessionIndex;

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
        await this._initInstanceVariables();

        this.subscribe.transactions && await this._subscribeTransactions();
        await this._handleNewHeadSubscriptions();
        await this._subscribeEvents();
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

    private async _initInstanceVariables(): Promise<void>{
      this.sessionIndex = await this.api.query.session.currentIndex();
      this.currentEraIndex = await this._getActiveEraIndex();
      this.validatorActiveSet = await this.api.query.session.validators();
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

    private async _handleNewHeadSubscriptions(): Promise<void> {
      this.subscribe.producers && this._initProducerHandler();
      if (this.subscribe.offline) {
        this._initSessionOfflineHandler();
        this._initOutOfActiveSetHandler();
      }
      
      this.api.rpc.chain.subscribeNewHeads(async (header) => {
        this.subscribe.producers && this._producerHandler(header);
        this.subscribe.offline && this._validatorStatusHandler(header);
      })
    }

    private _initProducerHandler(): void {
      this.validators.forEach((account) => {
        // always increase metric even the first time, so that we initialize the time serie
        // https://github.com/prometheus/prometheus/issues/1673
        this.promClient.increaseTotalBlocksProduced(account.name, account.address)
      });
    }

    private _initSessionOfflineHandler(): void {
      this.validators.forEach((account) => {
        // always increase metric even the first time, so that we initialize the time serie
        // https://github.com/prometheus/prometheus/issues/1673
        this.promClient.resetStatusValidatorOffline(account.name);
      });
    }

    private _initOutOfActiveSetHandler(): void {
      this.validators.forEach((account) => {
        // always increase metric even the first time, so that we initialize the time serie
        // https://github.com/prometheus/prometheus/issues/1673
        this.promClient.resetStatusValidatorOutOfActiveSet(account.name);
      });
    }

    private async _producerHandler(header: Header): Promise<void> {
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
    }

    private async _validatorStatusHandler(header: Header): Promise<void> {
      const isHeartbeatExpected = await this._isHeadAfterHeartbeatBlockThreshold(header)

      this.validators.forEach(async account => {

        const validatorActiveSetIndex = this._getValidatorActiveSetIndex(account)
        if ( validatorActiveSetIndex < 0 ) {
          this._handleValidatorOutOfActiveSetTrue(account)
          return 
        }
        else{
          this._handleValidatorOutOfActiveSetFalse(account)
        }

        await this._handleValidatorOffline(isHeartbeatExpected,account,validatorActiveSetIndex)
      }) 
      
    }

    private async _handleValidatorOffline(isHeartbeatExpected: boolean,validator: Subscribable,validatorActiveSetIndex: number): Promise<void>{
  
      if(isHeartbeatExpected) {
        if ( await this._hasValidatorProvedOnline(validator,validatorActiveSetIndex,this.sessionIndex) ) {
          this.promClient.resetStatusValidatorOffline(validator.name);
        }
        else {
          this.logger.info(`Target ${validator.name} has either not authored any block or sent any heartbeat yet`);
          this.promClient.setStatusValidatorOffline(validator.name);
        }
      }
      else if ( this.promClient.isValidatorStatusOffline(validator.name) ) {
        if ( await this._hasValidatorProvedOnline(validator,validatorActiveSetIndex, this.sessionIndex) ){
          this.promClient.resetStatusValidatorOffline(validator.name);
        }
      }
      
    }

    private _handleValidatorOutOfActiveSetTrue(account: Subscribable): void{
      this.logger.debug(`Target ${account.name} is not presente in the current validation active set`);
      this.promClient.resetStatusValidatorOffline(account.name);
      this.promClient.setStatusValidatorOutOfActiveSet(account.name);
    }

    private _handleValidatorOutOfActiveSetFalse(account: Subscribable): void{
      this.promClient.resetStatusValidatorOutOfActiveSet(account.name);
    }

    private async _hasValidatorProvedOnline(account: Subscribable, validatorIndex: number, sessionIndex: SessionIndex): Promise<boolean> {
      return await this._hasValidatorAuthoredBlocks(account,sessionIndex) || await this._hasValidatorSentHeartbeat(validatorIndex,sessionIndex)
    }

    private async _subscribeEvents(): Promise<void> {
        this.subscribe.offline && this._initTotalValidatorOffline();

        this.api.query.system.events((events) => {

            events.forEach(async (record) => {
                const { event } = record;

                if (this.subscribe.offline && this._isOfflineEvent(event)) {
                    this._offlineEventHandler(event)
                }

                if (this._isNewSessionEvent(event)){
                  await this._newSessionEventHandler()
                }
            });
        });
    }

    private _initTotalValidatorOffline(): void {
      this.validators.forEach((account) => {
        // always increase metric even the first time, so that we initialize the time serie
        // https://github.com/prometheus/prometheus/issues/1673
        this.promClient.resetTotalValidatorOfflineReports(account.name);
      });
    }

    private _isOfflineEvent(event: Event): boolean {
        return event.section == 'imOnline' && event.method == 'SomeOffline';
    }

    private _offlineEventHandler(event: Event): void {
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

    private async _newSessionEventHandler(): Promise<void> {
      this.sessionIndex = await this.api.query.session.currentIndex(); // TODO improve, for sure it is present in event
                  
      const newEraIndex = await this._getActiveEraIndex();
      if( newEraIndex > this.currentEraIndex ){
        await this._newEraHandler(newEraIndex)
      }
    }

    private async _getActiveEraIndex(): Promise<number>{
      return (await this.api.query.staking.activeEra()).toJSON()['index']; 
    }

    private async _newEraHandler(newEraIndex: number): Promise<void>{
      this.currentEraIndex = newEraIndex;
      this.validatorActiveSet = await this.api.query.session.validators();
    }

    private _isNewSessionEvent(event: Event): boolean {
      return event.section == 'session' && event.method == 'NewSession';
    }

    private async _getHeartbeatBlockThreshold(): Promise<BlockNumber> {
        return this.api.query.imOnline.heartbeatAfter()
    }

    private async _isHeadAfterHeartbeatBlockThreshold(header: Header): Promise<boolean> {
        const currentBlock = header.number.toBn()
        const blockThreshold = await this._getHeartbeatBlockThreshold()
        this.logger.debug(`Current Block: ${currentBlock}\tHeartbeatBlock Threshold: ${blockThreshold}`);
        return currentBlock.cmp(blockThreshold) > 0
    }

    private async _hasValidatorAuthoredBlocks(validator: Subscribable, sessionIndex: SessionIndex): Promise<boolean> {
        const numBlocksAuthored = await this.api.query.imOnline.authoredBlocks(sessionIndex,validator.address)
        return numBlocksAuthored.cmp(ZeroBN) > 0
    }

    private async _hasValidatorSentHeartbeat(validatorIndex: number, sessionIndex: SessionIndex): Promise<boolean> {
        if (validatorIndex < 0) return false;
        const hb = await this.api.query.imOnline.receivedHeartbeats(sessionIndex,validatorIndex) 
        return hb.toHuman() ? true : false
    }

    private _getValidatorActiveSetIndex(validator: Subscribable): number{
      return this.validatorActiveSet.indexOf(validator.address)
    }

   




}
