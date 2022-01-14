import * as express from 'express';
import { register } from 'prom-client';
import * as promClient from 'prom-client';
import { Logger } from '@w3f/logger';
import { PromClient } from './types';
import { payeeMetricAutoresolveMillis } from './constants';


export class Prometheus implements PromClient {

    static readonly nameValidatorOfflineSessionMetric  = 'polkadot_offline_validator_session_reports_state';

    private totalBlocksProduced: promClient.Counter;
    private totalValidatorOfflineReports: promClient.Gauge;
    private stateValidatorOfflineSessionReports: promClient.Gauge;
    private stateValidatorOutOfActiveSetReports: promClient.Gauge;
    
    private stateValidatorPayeeReports: promClient.Gauge;
    private payeeTimeouts = new Map<string,NodeJS.Timeout>()

    constructor(private readonly network: string, private readonly logger: Logger) {
        this._initMetrics()
    }

    startCollection(): void {
        this.logger.info(
            'Starting the collection of metrics, the metrics are available on /metrics'
        );
        promClient.collectDefaultMetrics();
    }

    injectMetricsRoute(app: express.Application): void {
        app.get('/metrics', (req: express.Request, res: express.Response) => {
            res.set('Content-Type', register.contentType)
            res.end(register.metrics())
        })
    }

    increaseTotalBlocksProduced(name: string, address: string): void {
        this.totalBlocksProduced.inc({network:this.network, name, address })
    }

    initTotalBlocksProduced(name: string, address: string): void {
      this.totalBlocksProduced.inc({network:this.network, name, address },0)
    }

    /* condition where you have been reported offline */
    increaseTotalValidatorOfflineReports(name: string, address: string): void {
        this.totalValidatorOfflineReports.inc({network:this.network, name, address });
    }

    resetTotalValidatorOfflineReports(name: string, address: string): void {
        this.totalValidatorOfflineReports.set({network:this.network, name, address }, 0);
    }

    /* condition where you are risking to be reported as offline */
    setStatusValidatorOffline(name: string): void {
        this.stateValidatorOfflineSessionReports.set({network:this.network, name }, 1);        
    }

    resetStatusValidatorOffline(name: string): void {
        this.stateValidatorOfflineSessionReports.set({network:this.network, name }, 0);
    }

    isValidatorStatusOffline(name: string): boolean {
      return promClient.register.getSingleMetric(Prometheus.nameValidatorOfflineSessionMetric)['hashMap'][`name:${name},network:${this.network}`]['value'] === 1
    }

    setStatusValidatorOutOfActiveSet(name: string): void{
      this.stateValidatorOutOfActiveSetReports.set({network:this.network, name }, 1);        
    }

    resetStatusValidatorOutOfActiveSet(name: string): void{
      this.stateValidatorOutOfActiveSetReports.set({network:this.network, name }, 0);        
    }

    setStatusValidatorPayeeChanged(name: string, address: string): void{
      const key = JSON.stringify({name,address})
      if(this.payeeTimeouts.has(key)){
        clearTimeout(this.payeeTimeouts.get(key))
        this.payeeTimeouts.delete(key)
      }

      this.stateValidatorPayeeReports.set({network:this.network, name, address}, 1);
      
      const timeoutID = setTimeout(()=>this.resetStatusValidatorPayeeChanged(name,address),payeeMetricAutoresolveMillis)
      this.payeeTimeouts[key] = timeoutID
    }

    resetStatusValidatorPayeeChanged(name: string, address: string): void{
      this.stateValidatorPayeeReports.set({network:this.network, name,address }, 0);        
    }

    _initMetrics(): void {
        this.totalBlocksProduced = new promClient.Counter({
            name: 'polkadot_blocks_produced_total',
            help: 'Total number of blocks produced by a validator',
            labelNames: ['network', 'name', 'address']
        });
        this.totalValidatorOfflineReports = new promClient.Gauge({
            name: 'polkadot_offline_validator_reports_total',
            help: 'Total times a validator has been reported offline',
            labelNames: ['network', 'name', 'address']
        });
        this.stateValidatorOfflineSessionReports = new promClient.Gauge({
            name: Prometheus.nameValidatorOfflineSessionMetric,
            help: 'Whether a validator is reported as offline in the current session',
            labelNames: ['network', 'name']
        });
        this.stateValidatorOutOfActiveSetReports = new promClient.Gauge({
          name: 'polkadot_validator_out_of_active_set_reports_state',
          help: 'Whether a validator is reported as outside of the current Era validators active set',
          labelNames: ['network', 'name']
        });
        this.stateValidatorPayeeReports = new promClient.Gauge({
          name: 'polkadot_validator_payee_state',
          help: 'Whether a validator has changed the payee destination recently',
          labelNames: ['network', 'name', 'address']
        });
    }
}
