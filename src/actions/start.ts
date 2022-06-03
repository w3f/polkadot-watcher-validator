import express from 'express';
import { LoggerSingleton } from '../logger'
import { Config } from '@w3f/config';
import { register } from 'prom-client';
import { Subscriber } from '../subscriber';
import { Prometheus } from '../prometheus';
import { InputConfig } from '../types';
import { Client } from '../client';

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
    server.get('/metrics', async (req: express.Request, res: express.Response) => {
            res.set('Content-Type', register.contentType)
            res.end(await register.metrics())
        })    
    server.listen(cfg.port);

    LoggerSingleton.setInstance(cfg.logLevel)
    
    const api = await new Client(cfg).connect()
    const chain = await api.rpc.system.chain()
    const networkId = chain.toString().toLowerCase()

    const promClient = new Prometheus(networkId);
    promClient.startCollection();

    const subscriber = new Subscriber(cfg, api, promClient);
    await subscriber.start();

    _addTestEndpoint(server,subscriber)
}
