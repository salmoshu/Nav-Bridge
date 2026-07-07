import type { BrowserWindow } from "electron";
import { ipcMain } from "electron";
import type { StartServerResult } from "../../shared/ipc";
import { ipcChannels } from "../../shared/ipc";
import type { LogEntry, StreamConfig } from "../../shared/stream";
import { ConfigStore } from "../config/ConfigStore";
import { validateStreamConfig } from "../config/validateStreamConfig";
import { StreamServer } from "../stream/StreamServer";
import { createAdapter } from "../stream/createAdapter";

export class IpcBridge {
  private server?: StreamServer;
  private lifecycle = Promise.resolve();

  public constructor(
    private readonly window: BrowserWindow,
    private readonly configStore = new ConfigStore()
  ) {}

  public register(): void {
    ipcMain.removeHandler(ipcChannels.startServer);
    ipcMain.removeHandler(ipcChannels.stopServer);
    ipcMain.removeHandler(ipcChannels.loadConfig);
    ipcMain.removeHandler(ipcChannels.saveConfig);

    ipcMain.handle(
      ipcChannels.startServer,
      async (_event, config: StreamConfig): Promise<StartServerResult> => {
        return await this.enqueue(async () => {
          validateStreamConfig(config);
          await this.server?.stop();
          this.server = this.createServer(config);
          this.server.onStatus((status) => this.window.webContents.send(ipcChannels.status, status));
          await this.server.start();
          this.log("info", "Stream server started");
          return { success: true };
        }).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          this.log("error", message);
          return { success: false, error: message };
        });
      }
    );

    ipcMain.handle(ipcChannels.stopServer, async () => {
      await this.enqueue(async () => {
        await this.server?.stop();
        this.server = undefined;
        this.log("info", "Stream server stopped");
      });
    });

    ipcMain.handle(ipcChannels.loadConfig, () => this.configStore.load());
    ipcMain.handle(ipcChannels.saveConfig, (_event, config: StreamConfig) => {
      validateStreamConfig(config);
      this.configStore.save(config);
    });
  }

  public async dispose(): Promise<void> {
    await this.enqueue(async () => {
      await this.server?.stop();
      this.server = undefined;
    });
  }

  private async enqueue<T>(operation: () => Promise<T> | T): Promise<T> {
    const run = this.lifecycle.then(operation, operation);
    this.lifecycle = run.then(
      () => undefined,
      () => undefined
    );
    return await run;
  }

  private createServer(config: StreamConfig): StreamServer {
    const outputs = config.outputs
      .filter((output) => output.enabled)
      .map((output) => createAdapter(output, "output"));
    return new StreamServer(createAdapter(config.input, "input"), outputs, {
      bufferSize: config.options.bufferSize,
      statusInterval: config.options.statusInterval
    });
  }

  private log(level: LogEntry["level"], message: string): void {
    if (this.window.webContents.isDestroyed()) {
      return;
    }
    this.window.webContents.send(ipcChannels.log, {
      level,
      message,
      time: new Date().toISOString()
    } satisfies LogEntry);
  }
}
