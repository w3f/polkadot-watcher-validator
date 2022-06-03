import { ApiPromise } from '@polkadot/api';
import { Event } from '@polkadot/types/interfaces/system';
import { Header, SessionIndex, ValidatorId, Address } from '@polkadot/types/interfaces';
import { DeriveStakingQuery } from '@polkadot/api-derive/types';
import { Tuple, Vec } from '@polkadot/types/codec';
import { LoggerSingleton } from './logger';

import {
    InputConfig,
    Subscribable,
    PromClient,
    ValidatorImOnlineParameters
} from './types';
import { getActiveEraIndex, isHeadAfterHeartbeatBlockThreshold, hasValidatorProvedOnline, isNewSessionEvent, isOfflineEvent } from './utils';

export class Subscriber {
    private validators: Array<Subscribable>;
    private currentEraIndex: number;
    private validatorActiveSet: Vec<ValidatorId>;
    private sessionIndex: SessionIndex;

    private readonly logger = LoggerSingleton.getInstance()

    constructor(
        cfg: InputConfig,
        private readonly api: ApiPromise,
        private readonly promClient: PromClient) {

        this.validators = cfg.validators
    }

    public async start(): Promise<void> {
        
        await this._initInstanceVariables();
        this._initCounterMetrics()

        await this._handleNewHeadSubscriptions();
        await this._subscribeEvents();
    }

    public triggerConnectivityTest(): void {
      const testAccountName = "CONNECTIVITY_TEST_NO_ACTION_REQUIRED"
      this.promClient.increaseOfflineReports(testAccountName,testAccountName);
    }

    private async _initInstanceVariables(): Promise<void>{
      this.sessionIndex = await this.api.query.session.currentIndex();
      this.currentEraIndex = await getActiveEraIndex(this.api);
      this.validatorActiveSet = await this.api.query.session.validators();
      await this._initValidatorsControllers()
    }

    private async _initValidatorsControllers(): Promise<void>{
      for (const validator of this.validators) {
        const controller = await this.api.query.staking.bonded(validator.address)
        validator.controllerAddress = controller.unwrapOr("").toString()
      }
    }

    private async _handleNewHeadSubscriptions(): Promise<void> {
      this.api.rpc.chain.subscribeNewHeads(async (header) => {
        this._producerHandler(header);
        this._validatorStatusHandler(header);
        this._payeeChangeHandler(header);
        this._commissionChangeHandler(header);
        this._checkUnexpected();
      })
    }

    private async _checkUnexpected(): Promise<void> {
      const tmp = await this.api.derive.staking.queryMulti(this.validators.map(v=>v.address),{withDestination:true,withPrefs:true})
      const stakingMap = new Map<string,DeriveStakingQuery>()
      tmp.forEach(t=>stakingMap.set(t.accountId.toString(),t))

      this.validators.forEach(v => {
        const actualCommission = stakingMap.get(v.address).validatorPrefs.commission.toNumber()
        if(!v.expected?.commission || v.expected.commission == actualCommission){
          this.promClient.resetStatusValidatorCommissionUnexpected(v.name,v.address)
        } else {
          this.logger.info(`Detected Unexpected commission for validator ${v.name}: expected ${v.expected.commission}, actual ${actualCommission}`)
          this.promClient.setStatusValidatorCommissionUnexpected(v.name,v.address)
        }

        const actualRewardDestination = stakingMap.get(v.address).rewardDestination
        if(v.expected?.payee && (!actualRewardDestination.isAccount || v.expected.payee != actualRewardDestination.asAccount.toString())){
          this.logger.info(`Detected Unexpected payee for validator ${v.name}: expected ${v.expected.payee}, actual ${JSON.stringify(actualRewardDestination)}`)
          this.promClient.setStatusValidatorPayeeUnexpected(v.name,v.address)
        } else {
          this.promClient.resetStatusValidatorPayeeUnexpected(v.name,v.address)
        }
      })
    }

    private async _subscribeEvents(): Promise<void> {

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
              this.promClient.increaseBlocksProducedReports(account.name, account.address);
          }
      }
    }

    private async _validatorStatusHandler(header: Header): Promise<void> {
      const parameters = await this._getImOnlineParametersAtomic(header)

      this.validators.forEach(async account => {

        const validatorActiveSetIndex = parameters.validatorActiveSet.indexOf(account.address)
        if ( validatorActiveSetIndex < 0 ) {
          this.logger.debug(`Target ${account.name} is not present in the validation active set of era ${parameters.eraIndex}`);
          this.promClient.setStatusOutOfActiveSet(account.name);
        } else {
          this.promClient.resetStatusOutOfActiveSet(account.name);
          await this._checkOfflineRiskStatus(parameters,account,validatorActiveSetIndex)
        }
      }) 
      
    }

    private async _payeeChangeHandler(header: Header): Promise<void> {

      const currentBlock = header.number.unwrap()
      const blockHash = await this.api.rpc.chain.getBlockHash(currentBlock)
      const block = await this.api.rpc.chain.getBlock(blockHash)

      block.block.extrinsics.forEach( async (extrinsic) => {

        const { signer } = extrinsic;
        if(this.api.tx.staking.setPayee.is(extrinsic) || this.api.tx.staking.bond.is(extrinsic)){
          this._handlePayeeChangeDetection(signer)
        }
        else if(this.api.tx.utility.batch.is(extrinsic) || this.api.tx.utility.batchAll.is(extrinsic)){
          //this.logger.debug(`detected new utility > batch extrinsic`)
          const { signer, method: { args } } = extrinsic;
          for (const callAny of args[0] as any) {
            const call = this.api.registry.createType('Call',callAny)
            if(this.api.tx.staking.setPayee.is(call) || this.api.tx.staking.bond.is(call)){
              this._handlePayeeChangeDetection(signer)
            }
          }
        }
      })
    }

    private _handlePayeeChangeDetection(signer: Address): void{
      for (const validator of this.validators) {
        if(signer.toString() == validator.address || signer.toString() == validator.controllerAddress){
          this.logger.info(`Found setPayee or bond extrinsic for validator ${validator.name}`)
          this.promClient.increasePayeeChangedReports(validator.name, validator.address)
        }
      }
    }

    private async _commissionChangeHandler(header: Header): Promise<void> {

      const currentBlock = header.number.unwrap()
      const blockHash = await this.api.rpc.chain.getBlockHash(currentBlock)
      const block = await this.api.rpc.chain.getBlock(blockHash)

      block.block.extrinsics.forEach( async (extrinsic) => {

        const { signer } = extrinsic;
        if(this.api.tx.staking.validate.is(extrinsic)){
          this._handleCommissionChangeDetection(signer)
        }
        else if(this.api.tx.utility.batch.is(extrinsic) || this.api.tx.utility.batchAll.is(extrinsic)){
          //this.logger.debug(`detected new utility > batch extrinsic`)
          const { signer, method: { args } } = extrinsic;
          for (const callAny of args[0] as any) {
            const call = this.api.registry.createType('Call',callAny)
            if(this.api.tx.staking.validate.is(call)){
              this._handleCommissionChangeDetection(signer)
            }
          }
        }
      })
    }

    private _handleCommissionChangeDetection(signer: Address): void{
      for (const validator of this.validators) {
        if(signer.toString() == validator.address || signer.toString() == validator.controllerAddress){
          this.logger.info(`Found validate extrinsic for validator ${validator.name}`)
          this.promClient.increaseCommissionChangedReports(validator.name, validator.address)
        }
      }
    }

    private async _checkOfflineRiskStatus(parameters: ValidatorImOnlineParameters,validator: Subscribable,validatorActiveSetIndex: number): Promise<void>{
      if ( await hasValidatorProvedOnline(validator,validatorActiveSetIndex,parameters.sessionIndex,this.api) ) {
        this.promClient.resetStatusOfflineRisk(validator.name);
      } else if(parameters.isHeartbeatExpected) {
        this.logger.info(`Target ${validator.name} has either not authored any block or sent any heartbeat yet in session:${parameters.sessionIndex}/era:${parameters.eraIndex}`);
        this.promClient.setStatusOfflineRisk(validator.name);
      }
      // else let it be as it is.
      // with this solution, if a validator has been caught offline, it will eventually remain in a risk status also for the first half of the subsequent session.
    }

    private _offlineEventHandler(event: Event): void {
      const items = event.data[0];

      (items as Tuple).forEach((item) => {
          const offlineValidator = item[0];
          this.logger.debug(`${offlineValidator} found offline`);
          const account = this.validators.find((subject) => subject.address == offlineValidator);

          if (account) {
              this.logger.info(`Really bad... Target ${account.name} found offline`);
              this.promClient.increaseOfflineReports(account.name, account.address);
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
      await this._initValidatorsControllers();
    }

    private async _getImOnlineParametersAtomic(header: Header): Promise<ValidatorImOnlineParameters> {
    
      const sessionIndex = this.sessionIndex
      const eraIndex = this.currentEraIndex
      const validatorActiveSet = this.validatorActiveSet
      this.logger.debug(`Current EraIndex: ${eraIndex}\tCurrent SessionIndex: ${sessionIndex}`);
      const isHeartbeatExpected = await isHeadAfterHeartbeatBlockThreshold(this.api,header)

      return {
        isHeartbeatExpected,
        sessionIndex,
        eraIndex,
        validatorActiveSet
      } 
    }

    private _initCounterMetrics(): void {
      this._initBlocksProducedMetrics();
      this._initOfflineReportsMetrics()
      this._initPayeeChangedMetrics();
      this._initCommissionChangedMetrics();
    }

    private _initBlocksProducedMetrics(): void {
      this.validators.forEach((account) => {
        // always increase counters even the first time, so that we initialize the time series
        // https://github.com/prometheus/prometheus/issues/1673
        this.promClient.increaseBlocksProducedReports(account.name, account.address)
      });
    }

    private _initOfflineReportsMetrics(): void {
      this.validators.forEach((account) => {
        // always increase counters even the first time, so that we initialize the time series
        // https://github.com/prometheus/prometheus/issues/1673
        this.promClient.increaseOfflineReports(account.name, account.address);
      });
    }

    private _initPayeeChangedMetrics(): void {
      this.validators.forEach((account) => {
        // always increase counters even the first time, so that we initialize the time series
        // https://github.com/prometheus/prometheus/issues/1673
        this.promClient.increasePayeeChangedReports(account.name, account.address)
      });
    }

    private _initCommissionChangedMetrics(): void {
      this.validators.forEach((account) => {
        // always increase counters even the first time, so that we initialize the time series
        // https://github.com/prometheus/prometheus/issues/1673
        this.promClient.increaseCommissionChangedReports(account.name, account.address)
      });
    }

}
