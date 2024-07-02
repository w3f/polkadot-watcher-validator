import * as promClient from 'prom-client';
import { Logger, LoggerSingleton } from './logger';
import { PromClient } from './types';

export class Prometheus implements PromClient {

    private blocksProducedReports: promClient.Counter<"network" | "name" | "address" | "environment">;
    private slashedReports: promClient.Counter<"network" | "name" | "address" | "environment">;
    private stateOutOfActiveSet: promClient.Gauge<"network" | "name" | "address" | "environment">;
    
    private payeeChangedReports: promClient.Counter<"network" | "name" | "address" | "environment">;
    private stateUnexpectedPayee: promClient.Gauge<"network" | "name" | "address" | "environment">;

    private commissionChangedReports: promClient.Counter<"network" | "name" | "address" | "environment">;
    private stateUnexpectedCommission: promClient.Gauge<"network" | "name" | "address" | "environment">;

    private readonly logger: Logger = LoggerSingleton.getInstance()

    constructor(private readonly network: string, private readonly environment: string) {
        this._initMetrics()
    }

    startCollection(): void {
        this.logger.info(
            'Starting the collection of metrics, the metrics are available on /metrics'
        );
        promClient.collectDefaultMetrics();
    }

    increaseBlocksProducedReports(name: string, address: string): void {
        this.blocksProducedReports.inc({network:this.network, name, address, environment: this.environment })
    }

    increaseSlashedReports(name: string, address: string): void {
        this.slashedReports.inc({network:this.network, name, address, environment: this.environment });
    }

    setStatusOutOfActiveSet(name: string, address: string): void{
      this.stateOutOfActiveSet.set({network:this.network, name, address, environment: this.environment }, 1);
    }

    resetStatusOutOfActiveSet(name: string, address: string): void{
      this.stateOutOfActiveSet.set({network:this.network, name, address, environment: this.environment }, 0);        
    }

    increasePayeeChangedReports(name: string, address: string): void{
      this.payeeChangedReports.inc({network:this.network, name, address, environment: this.environment});
    }

    setStatusValidatorPayeeUnexpected(name: string, address: string): void{
      this.stateUnexpectedPayee.set({network:this.network, name,address, environment: this.environment }, 1);        
    }

    resetStatusValidatorPayeeUnexpected(name: string, address: string): void{
      this.stateUnexpectedPayee.set({network:this.network, name,address, environment: this.environment }, 0);        
    }

    increaseCommissionChangedReports(name: string, address: string): void{
      this.commissionChangedReports.inc({network:this.network, name, address, environment: this.environment});
    }

    setStatusValidatorCommissionUnexpected(name: string, address: string): void{
      this.stateUnexpectedCommission.set({network:this.network, name, address, environment: this.environment }, 1);        
    }

    resetStatusValidatorCommissionUnexpected(name: string, address: string): void{
      this.stateUnexpectedCommission.set({network:this.network, name, address, environment: this.environment }, 0);        
    }

    _initMetrics(): void {
        this.blocksProducedReports = new promClient.Counter({
            name: 'polkadot_validator_blocks_produced',
            help: 'Number of blocks produced by a validator',
            labelNames: ['network', 'name', 'address', 'environment']
        });
        this.slashedReports = new promClient.Gauge({
            name: 'polkadot_validator_slashed_reports',
            help: 'Times a validator has been reported for slashing',
            labelNames: ['network', 'name', 'address', 'environment']
        });
        this.stateOutOfActiveSet = new promClient.Gauge({
          name: 'polkadot_validator_out_of_active_set_state',
          help: 'Whether a validator is reported as outside of the current Era validators active set',
          labelNames: ['network', 'name', 'address', 'environment']
        });
        this.payeeChangedReports = new promClient.Counter({
          name: 'polkadot_validator_payee_changed_reports',
          help: 'Times a validator has changed the payee destination',
          labelNames: ['network', 'name', 'address', 'environment']
        });
        this.stateUnexpectedPayee = new promClient.Gauge({
          name: 'polkadot_validator_unexpected_payee_state',
          help: 'Whether a validator has an unexpected payee destination',
          labelNames: ['network', 'name', 'address', 'environment']
        });
        this.commissionChangedReports = new promClient.Counter({
          name: 'polkadot_validator_commission_changed_reports',
          help: 'Times a validator has changed the commission rate',
          labelNames: ['network', 'name', 'address', 'environment']
        });
        this.stateUnexpectedCommission = new promClient.Gauge({
          name: 'polkadot_validator_unexpected_commission_state',
          help: 'Whether a validator has an unexpected commission rate',
          labelNames: ['network', 'name', 'address', 'environment']
        });
    }
}
