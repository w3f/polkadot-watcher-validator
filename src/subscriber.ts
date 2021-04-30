import { ApiPromise, WsProvider } from '@polkadot/api';
import { Event } from '@polkadot/types/interfaces/system';
import { Header, SessionIndex, ValidatorId } from '@polkadot/types/interfaces';
import { Tuple, Vec } from '@polkadot/types/codec';
import { Logger } from '@w3f/logger';

import {
    InputConfig,
    Subscribable,
    PromClient,
    ValidatorImOnlineParameters
} from './types';
import { getActiveEraIndex, getHeartbeatBlockThreshold, hasValidatorProvedOnline, isNewSessionEvent, isOfflineEvent } from './utils';

export class Subscriber {
    private api: ApiPromise;
    private endpoint: string;
    private validators: Array<Subscribable>;
    private currentEraIndex: number;
    private validatorActiveSet: Vec<ValidatorId>;
    private sessionIndex: SessionIndex;

    constructor(
        cfg: InputConfig,
        private readonly promClient: PromClient,
        private readonly logger: Logger) {

        this.endpoint = cfg.endpoint;
        this.validators = cfg.validators

    }

    public async start(): Promise<void> {
        await this._initAPI();
        await this._initInstanceVariables();

        await this._handleNewHeadSubscriptions();
        await this._subscribeEvents();
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
      this.currentEraIndex = await getActiveEraIndex(this.api);
      this.validatorActiveSet = await this.api.query.session.validators();
    }

    private async _handleNewHeadSubscriptions(): Promise<void> {
      this._initProducerMetrics();
      this._initSessionOfflineMetrics();
      this._initOutOfActiveSetMetrics();
      
      this.api.rpc.chain.subscribeNewHeads(async (header) => {
        this._producerHandler(header);
        this._validatorStatusHandler(header);
      })
    }

    private async _subscribeEvents(): Promise<void> {
      this._initTotalOfflineMetrics();

      this.api.query.system.events((events) => {

          events.forEach(async (record) => {
              const { event } = record;

              if(isOfflineEvent(event)){
                  this._offlineEventHandler(event)
              }

              if(isNewSessionEvent(event)){
                await this._newSessionEventHandler()
              }
          });
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
              
              //solve potential offline status
              this._solveOfflineStatus(account)
          }
      }
    }

    private _solveOfflineStatus(account: Subscribable): void{
      this.promClient.resetStatusValidatorOffline(account.name);
      this.promClient.resetTotalValidatorOfflineReports(account.name);
    }

    private async _validatorStatusHandler(header: Header): Promise<void> {
      const parameters = await this._getImOnlineParametersAtomic(header)

      this.validators.forEach(async account => {

        const validatorActiveSetIndex = parameters.validatorActiveSet.indexOf(account.address)
        if ( validatorActiveSetIndex < 0 ) {
          this.logger.debug(`Target ${account.name} is not present in the validation active set of era ${parameters.eraIndex}`);
          this.promClient.setStatusValidatorOutOfActiveSet(account.name);
          this._solveOfflineStatus(account)
          return 
        }
        this.promClient.resetStatusValidatorOutOfActiveSet(account.name);

        await this._checkValidatorOfflineStatus(parameters,account,validatorActiveSetIndex)
      }) 
      
    }

    private async _checkValidatorOfflineStatus(parameters: ValidatorImOnlineParameters,validator: Subscribable,validatorActiveSetIndex: number): Promise<void>{
  
      if(parameters.isHeartbeatExpected) {
        if ( await hasValidatorProvedOnline(validator,validatorActiveSetIndex,parameters.sessionIndex,this.api) ) {
          this._solveOfflineStatus(validator)
        }
        else {
          this.logger.info(`Target ${validator.name} has either not authored any block or sent any heartbeat yet in session:${parameters.sessionIndex}/era:${parameters.eraIndex}`);
          this.promClient.setStatusValidatorOffline(validator.name);
        }
      }
      else if ( this.promClient.isValidatorStatusOffline(validator.name) ) {
        // first half of a session...
        if ( await hasValidatorProvedOnline(validator,validatorActiveSetIndex,parameters.sessionIndex,this.api) ){
          this._solveOfflineStatus(validator)
        }
      }
      
    }

    private _offlineEventHandler(event: Event): void {
      const items = event.data[0];

      (items as Tuple).forEach((item) => {
          const offlineValidator = item[0];
          this.logger.debug(`${offlineValidator} found offline`);
          const account = this.validators.find((subject) => subject.address == offlineValidator);

          if (account) {
              this.logger.info(`Really bad... Target ${account.name} found offline`);
              this.promClient.increaseTotalValidatorOfflineReports(account.name, account.address);
          }
      });
    }

    private async _newSessionEventHandler(): Promise<void> {
      this.sessionIndex = await this.api.query.session.currentIndex(); // TODO improve, check if it is present in event
                  
      const newEraIndex = await getActiveEraIndex(this.api);
      if( newEraIndex > this.currentEraIndex ){
        await this._newEraHandler(newEraIndex)
      }
    }

    private async _newEraHandler(newEraIndex: number): Promise<void>{
      this.currentEraIndex = newEraIndex;
      this.validatorActiveSet = await this.api.query.session.validators();
    }

    private async _getImOnlineParametersAtomic(header: Header): Promise<ValidatorImOnlineParameters> {
    
      const sessionIndex = this.sessionIndex
      const eraIndex = this.currentEraIndex
      const validatorActiveSet = this.validatorActiveSet
      this.logger.debug(`Current EraIndex: ${eraIndex}\tCurrent SessionIndex: ${sessionIndex}`);
      const isHeartbeatExpected = await this._isHeadAfterHeartbeatBlockThreshold(header)

      return {
        isHeartbeatExpected,
        sessionIndex,
        eraIndex,
        validatorActiveSet
      } 
    }

    private async _isHeadAfterHeartbeatBlockThreshold(header: Header): Promise<boolean> {
        const currentBlock = header.number.toBn()
        const blockThreshold = await getHeartbeatBlockThreshold(this.api)
        this.logger.debug(`Current Block: ${currentBlock}\tHeartbeatBlock Threshold: ${blockThreshold}`);
        return currentBlock.cmp(blockThreshold) > 0
    }

    private _initProducerMetrics(): void {
      this.validators.forEach((account) => {
        // always increase metric even the first time, so that we initialize the time serie
        // https://github.com/prometheus/prometheus/issues/1673
        this.promClient.initTotalBlocksProduced(account.name, account.address)
      });
    }

    private _initSessionOfflineMetrics(): void {
      this.validators.forEach((account) => {
        // always increase metric even the first time, so that we initialize the time serie
        // https://github.com/prometheus/prometheus/issues/1673
        this.promClient.resetStatusValidatorOffline(account.name);
      });
    }

    private _initOutOfActiveSetMetrics(): void {
      this.validators.forEach((account) => {
        // always increase metric even the first time, so that we initialize the time serie
        // https://github.com/prometheus/prometheus/issues/1673
        this.promClient.resetStatusValidatorOutOfActiveSet(account.name);
      });
    }

    private _initTotalOfflineMetrics(): void {
      this.validators.forEach((account) => {
        // always increase metric even the first time, so that we initialize the time serie
        // https://github.com/prometheus/prometheus/issues/1673
        this.promClient.resetTotalValidatorOfflineReports(account.name);
      });
    }

}
