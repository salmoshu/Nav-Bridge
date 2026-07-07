import Store from "electron-store";
import { defaultStreamConfig, type StreamConfig } from "../../shared/stream";

interface StoreSchema {
  streamConfig: StreamConfig;
}

export class ConfigStore {
  private readonly store = new Store<StoreSchema>({
    name: "nav-bridge",
    defaults: {
      streamConfig: defaultStreamConfig
    }
  });

  public load(): StreamConfig {
    return this.store.get("streamConfig", defaultStreamConfig);
  }

  public save(config: StreamConfig): void {
    this.store.set("streamConfig", config);
  }
}
