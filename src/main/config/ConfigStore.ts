import Store from "electron-store";
import { type ThemeMode } from "../../shared/theme";
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
  themeMode?: ThemeMode;
}

export class ConfigStore {
  private readonly store = new Store<StoreSchema>({
    name: "nav-bridge",
    defaults: {
      streamConfig: defaultStreamConfig,
      themeMode: "system"
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

  public loadThemeMode(): ThemeMode {
    return this.store.get("themeMode", "system");
  }

  public saveThemeMode(mode: ThemeMode): void {
    this.store.set("themeMode", mode);
  }
}
