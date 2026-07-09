import Store from "electron-store";
import { defaultStreamConfig, type StreamConfig } from "../../shared/stream";

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StoreSchema {
  streamConfig: StreamConfig;
  windowBounds?: WindowBounds;
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

  public loadWindowBounds(): WindowBounds | undefined {
    return this.store.get("windowBounds");
  }

  public saveWindowBounds(bounds: WindowBounds): void {
    this.store.set("windowBounds", bounds);
  }
}
