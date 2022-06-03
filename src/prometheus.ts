import * as promClient from 'prom-client';
import { Logger, LoggerSingleton } from './logger';
import { PromClient } from './types';

export class Prometheus implements PromClient {

    static readonly nameOfflineRiskMetric  = 'polkadot_validator_offline_risk_state';

    private blocksProducedReports: promClient.Counter<"network" | "name" | "address">;
    private offlineReports: promClient.Counter<"network" | "name" | "address">;
    private stateOfflineRisk: promClient.Gauge<"network" | "name" >;
    private stateOutOfActiveSet: promClient.Gauge<"network" | "name" >;
    
    private payeeChangedReports: promClient.Counter<"network" | "name" | "address">;
    private stateUnexpectedPayee: promClient.Gauge<"network" | "name" | "address">;

    private commissionChangedReports: promClient.Counter<"network" | "name" | "address">;
    private stateUnexpectedCommission: promClient.Gauge<"network" | "name" | "address">;

    private readonly logger: Logger = LoggerSingleton.getInstance()

    constructor(private readonly network: string) {
        this._initMetrics()
    }

    startCollection(): void {
        this.logger.info(
            'Starting the collection of metrics, the metrics are available on /metrics'
        );
        promClient.collectDefaultMetrics();
    }

    increaseBlocksProducedReports(name: string, address: string): void {
        this.blocksProducedReports.inc({network:this.network, name, address })
        this.resetStatusOfflineRisk(name) //solve potential risk status
    }

    increaseOfflineReports(name: string, address: string): void {
        this.offlineReports.inc({network:this.network, name, address });
    }

    setStatusOfflineRisk(name: string): void {
        this.stateOfflineRisk.set({network:this.network, name }, 1);        
    }

    resetStatusOfflineRisk(name: string): void {
        this.stateOfflineRisk.set({network:this.network, name }, 0);
    }

    isStatusOfflineRiskFiring(name: string): boolean {
      try {
        return promClient.register.getSingleMetric(Prometheus.nameOfflineRiskMetric)['hashMap'][`name:${name},network:${this.network}`]['value'] == 1
      } catch (error) {
        this.resetStatusOfflineRisk(name)
        return promClient.register.getSingleMetric(Prometheus.nameOfflineRiskMetric)['hashMap'][`name:${name},network:${this.network}`]['value'] == 1
      }
    }

    setStatusOutOfActiveSet(name: string): void{
      this.stateOutOfActiveSet.set({network:this.network, name }, 1);
      this.resetStatusOfflineRisk(name) //solve potential risk status
    }

    resetStatusOutOfActiveSet(name: string): void{
      this.stateOutOfActiveSet.set({network:this.network, name }, 0);        
    }

    increasePayeeChangedReports(name: string, address: string): void{
      this.payeeChangedReports.inc({network:this.network, name, address});
    }

    setStatusValidatorPayeeUnexpected(name: string, address: string): void{
      this.stateUnexpectedPayee.set({network:this.network, name,address }, 1);        
    }

    resetStatusValidatorPayeeUnexpected(name: string, address: string): void{
      this.stateUnexpectedPayee.set({network:this.network, name,address }, 0);        
    }

    increaseCommissionChangedReports(name: string, address: string): void{
      this.commissionChangedReports.inc({network:this.network, name, address}, 0);
    }

    setStatusValidatorCommissionUnexpected(name: string, address: string): void{
      this.stateUnexpectedCommission.set({network:this.network, name,address }, 1);        
    }

    resetStatusValidatorCommissionUnexpected(name: string, address: string): void{
      this.stateUnexpectedCommission.set({network:this.network, name,address }, 0);        
    }

    _initMetrics(): void {
        this.blocksProducedReports = new promClient.Counter({
            name: 'polkadot_validator_blocks_produced',
            help: 'Number of blocks produced by a validator',
            labelNames: ['network', 'name', 'address']
        });
        this.offlineReports = new promClient.Gauge({
            name: 'polkadot_validator_offline_reports',
            help: 'Times a validator has been reported offline',
            labelNames: ['network', 'name', 'address']
        });
        this.stateOfflineRisk = new promClient.Gauge({
            name: Prometheus.nameOfflineRiskMetric,
            help: 'Whether a validator has not produced a block and neither has sent an expected heartbeat yet. It is risking to be caught offline',
            labelNames: ['network', 'name']
        });
        this.stateOutOfActiveSet = new promClient.Gauge({
          name: 'polkadot_validator_out_of_active_set_state',
          help: 'Whether a validator is reported as outside of the current Era validators active set',
          labelNames: ['network', 'name']
        });
        this.payeeChangedReports = new promClient.Gauge({
          name: 'polkadot_validator_payee_changed_reports',
          help: 'Times a validator has changed the payee destination',
          labelNames: ['network', 'name', 'address']
        });
        this.stateUnexpectedPayee = new promClient.Gauge({
          name: 'polkadot_validator_unexpected_payee_state',
          help: 'Whether a validator has an unexpected payee destination',
          labelNames: ['network', 'name', 'address']
        });
        this.commissionChangedReports = new promClient.Gauge({
          name: 'polkadot_validator_commission_changed_reports',
          help: 'Times a validator has changed the commission rate',
          labelNames: ['network', 'name', 'address']
        });
        this.stateUnexpectedCommission = new promClient.Gauge({
          name: 'polkadot_validator_unexpected_commission_state',
          help: 'Whether a validator has an unexpected commission rate',
          labelNames: ['network', 'name', 'address']
        });
    }
}
