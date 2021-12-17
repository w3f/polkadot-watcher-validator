import { ApiPromise, WsProvider } from '@polkadot/api';
import { Logger } from '@w3f/logger';

import {
    InputConfig,
} from './types';

export class Client {
    private api: ApiPromise;
    private endpoint: string;

    constructor(
        cfg: InputConfig,
        private readonly logger: Logger) {
        this.endpoint = cfg.endpoint;
    }

    public async connect(): Promise<ApiPromise> {
        try {
          await this._initAPI();
        } catch (error) {
          this.logger.error("initAPI error... exiting: "+JSON.stringify(error))
          process.exit(1)
        }
        return this.api
    }

    private async _initAPI(): Promise<void> {
        const provider = new WsProvider(this.endpoint);
        this.api = new ApiPromise({provider})
        if(this.api){
          this.api.on("error", error => {
            if( error.toString().includes("FATAL") || JSON.stringify(error).includes("FATAL") ){
              this.logger.error("The API had a FATAL error... exiting!")
              process.exit(1)
            }
          })
        }
        await this.api.isReadyOrError;

        const [chain, nodeName, nodeVersion] = await Promise.all([
            this.api.rpc.system.chain(),
            this.api.rpc.system.name(),
            this.api.rpc.system.version()
        ]);
        this.logger.info(
            `You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`
        );
    }

}
