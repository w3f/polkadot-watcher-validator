import * as express from 'express';
import { register } from 'prom-client';
import * as promClient from 'prom-client';
import { Logger } from '@w3f/logger';
import { PromClient } from './types';


export class Prometheus implements PromClient {

    static readonly nameValidatorOfflineSessionMetric  = 'polkadot_offline_validator_session_reports_state';

    private totalBlocksProduced: promClient.Counter;
    private totalValidatorOfflineReports: promClient.Gauge;
    private stateValidatorOfflineSessionReports: promClient.Gauge;
    private stateValidatorOutOfActiveSetReports: promClient.Gauge;

    constructor(private readonly logger: Logger) {
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

    increaseTotalBlocksProduced(name: string, account: string): void {
        this.totalBlocksProduced.inc({ name, account })
    }

    increaseTotalValidatorOfflineReports(name: string): void {
        this.totalValidatorOfflineReports.inc({ name });
    }

    resetTotalValidatorOfflineReports(name: string): void {
        this.totalValidatorOfflineReports.set({ name }, 1);
    }

    setStatusValidatorOffline(name: string): void {
        this.stateValidatorOfflineSessionReports.set({ name }, 1);        
    }

    resetStatusValidatorOffline(name: string): void {
        this.stateValidatorOfflineSessionReports.set({ name }, 0);
    }

    isValidatorStatusOffline(name: string): boolean {
      return promClient.register.getSingleMetric(Prometheus.nameValidatorOfflineSessionMetric)['hashMap']['name:'+name]['value'] === 1
    }

    setStatusValidatorOutOfActiveSet(name: string): void{
      this.stateValidatorOutOfActiveSetReports.set({ name }, 1);        
    }

    resetStatusValidatorOutOfActiveSet(name: string): void{
      this.stateValidatorOutOfActiveSetReports.set({ name }, 0);        
    }

    _initMetrics(): void {
        this.totalBlocksProduced = new promClient.Counter({
            name: 'polkadot_blocks_produced_total',
            help: 'Total number of blocks produced by a validator',
            labelNames: ['name', 'account']
        });
        this.totalValidatorOfflineReports = new promClient.Gauge({
            name: 'polkadot_offline_validator_reports_total',
            help: 'Total times a validator has been reported offline',
            labelNames: ['name']
        });
        this.stateValidatorOfflineSessionReports = new promClient.Gauge({
            name: Prometheus.nameValidatorOfflineSessionMetric,
            help: 'Whether a validator is reported as offline in the current session',
            labelNames: ['name']
        });
        this.stateValidatorOutOfActiveSetReports = new promClient.Gauge({
          name: 'polkadot_validator_out_of_active_set_reports_state',
          help: 'Whether a validator is reported as outside of the current Era validators active set',
          labelNames: ['name']
      });
    }
}
