import { GitConfigLoader } from "./gitConfigLoaderInterface";
import fetch from 'node-fetch';
import fs from 'fs';
import { Config } from '@w3f/config';
import { InputConfigFromGit, Subscribable } from "../types";

export class GitLabPrivate implements GitConfigLoader {

  constructor(
    protected readonly url: string, 
    protected readonly apiToken: string, 
    protected readonly network: string
    ) { }

  async downloadAndLoad(): Promise<Array<Subscribable>> {
    const response = await fetch(this.url, {
    headers: {
        'PRIVATE-TOKEN': this.apiToken
    }
    });
    const data = await response.text();
    if(!response.ok) throw new Error("git config download probelm: " + data)

    fs.writeFileSync("./tmp.yaml",data)
    const cfg = new Config<InputConfigFromGit>().parse("./tmp.yaml");
    fs.rmSync("./tmp.yaml")
    
    switch (this.network.toLowerCase()) {
      case "kusama":
        return cfg.Kusama
      
      case "polkadot":
        return cfg.Polkadot
    
      default:
        throw new Error("unexpected configuration")
    }
  }
}