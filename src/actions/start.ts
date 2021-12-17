import express from 'express';
import { createLogger } from '@w3f/logger';
import { Config } from '@w3f/config';

import { Subscriber } from '../subscriber';
import { Prometheus } from '../prometheus';
import { InputConfig } from '../types';

const _addTestEndpoint = (server: express.Application, subscriber: Subscriber): void =>{
 
  server.get('/test',
      async (_req: express.Request, res: express.Response): Promise<void> => {
          subscriber.triggerConnectivityTest()
          res.status(200).send('A test alert should fire and then resolve...')
      })
}

export async function startAction(cmd): Promise<void> {
    const cfg = new Config<InputConfig>().parse(cmd.config);

    const server = express();
    server.get('/healthcheck',
        async (req: express.Request, res: express.Response): Promise<void> => {
            res.status(200).send('OK!')
        })
    server.listen(cfg.port);

    const logger = createLogger(cfg.logLevel);

    const promClient = new Prometheus(logger);
    promClient.injectMetricsRoute(server);
    promClient.startCollection();

    const subscriber = new Subscriber(cfg, promClient, logger);
    await subscriber.start();

    _addTestEndpoint(server,subscriber)
}
