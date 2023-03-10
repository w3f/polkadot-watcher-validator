import { GitConfigLoader } from "./gitConfigLoaderInterface";
import { Subscribable } from "../types";

export class Disabled implements GitConfigLoader {
  async downloadAndLoad(): Promise<Array<Subscribable>> {    
    return []
  }
}