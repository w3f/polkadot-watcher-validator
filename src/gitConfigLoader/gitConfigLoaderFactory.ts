import { InputConfig } from "../types"
import { Disabled } from "./disabled"
import { GitConfigLoader } from "./gitConfigLoaderInterface"
import { GitLabPrivate } from "./gitLabPrivate"

export class GitConfigLoaderFactory {
  constructor(private readonly cfg: InputConfig){}
  makeGitConfigLoader = (): GitConfigLoader => {

    const gitConfig = this.cfg.validatorsFromGit

    if(!gitConfig?.enabled)
      return new Disabled()

    switch (gitConfig.platform.toLowerCase()) {  
      case "gitlab":
        if(gitConfig.private.enabled) return new GitLabPrivate(gitConfig.url,gitConfig.private.apiToken,gitConfig.network) //implemented just GitLab private for now
        else new Disabled()
        break;
      default:
        return new Disabled()
    }  
  }
}