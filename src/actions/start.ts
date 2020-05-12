import express from 'express';
import { createLogger } from '@w3f/logger';
import { Config } from '@w3f/config';

import { Subscriber } from '../subscriber';
import { Prometheus } from '../prometheus';
import { Matrixbot } from '../matrixbot';
import { InputConfig } from '../types';


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

    const notifier = new Matrixbot(cfg.matrixbot.endpoint);

    const subscriber = new Subscriber(cfg, promClient, notifier, logger);
    await subscriber.start();
}
