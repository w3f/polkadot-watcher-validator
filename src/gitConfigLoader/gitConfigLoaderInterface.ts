import { Subscribable } from "../types";

export interface GitConfigLoader {
  downloadAndLoad(): Promise<Array<Subscribable>>;
}