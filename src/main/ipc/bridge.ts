import type { BrowserWindow } from "electron";
import { dialog, ipcMain, screen } from "electron";
import { writeFile } from "node:fs/promises";
import { SerialPort } from "serialport";
import type { SerialPortInfo, StartServerResult } from "../../shared/ipc";
import { ipcChannels } from "../../shared/ipc";
import type { LogEntry, StreamConfig } from "../../shared/stream";
import { ConfigStore } from "../config/ConfigStore";
import { validateStreamConfig } from "../config/validateStreamConfig";
import { StreamServer } from "../stream/StreamServer";
import { createAdapter } from "../stream/createAdapter";

export class IpcBridge {
  private server?: StreamServer;
  private lifecycle = Promise.resolve();
  private dragInterval?: NodeJS.Timeout;
  private wasResizableBeforeDrag = true;

  public constructor(
    private readonly window: BrowserWindow,
    private readonly configStore = new ConfigStore()
  ) {}

  public register(): void {
    ipcMain.removeHandler(ipcChannels.startServer);
    ipcMain.removeHandler(ipcChannels.stopServer);
    ipcMain.removeHandler(ipcChannels.loadConfig);
    ipcMain.removeHandler(ipcChannels.saveConfig);
    ipcMain.removeHandler(ipcChannels.exportConfig);
    ipcMain.removeHandler(ipcChannels.listSerialPorts);
    ipcMain.removeHandler(ipcChannels.minimizeWindow);
    ipcMain.removeHandler(ipcChannels.toggleAlwaysOnTop);
    ipcMain.removeHandler(ipcChannels.closeWindow);
    ipcMain.removeHandler(ipcChannels.startWindowDrag);
    ipcMain.removeHandler(ipcChannels.stopWindowDrag);

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

    ipcMain.handle(ipcChannels.exportConfig, async (_event, config: StreamConfig) => {
      validateStreamConfig(config);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
      const result = await dialog.showSaveDialog(this.window, {
        defaultPath: `nav-bridge-config-${timestamp}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }]
      });
      if (!result.canceled && result.filePath) {
        await writeFile(result.filePath, JSON.stringify(config, null, 2));
      }
    });

    ipcMain.handle(ipcChannels.listSerialPorts, async (): Promise<SerialPortInfo[]> => {
      const ports = await SerialPort.list();
      return ports.map((port) => ({
        path: port.path,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        vendorId: port.vendorId,
        productId: port.productId,
        pnpId: port.pnpId
      }));
    });

    ipcMain.handle(ipcChannels.minimizeWindow, () => {
      this.window.minimize();
    });

    ipcMain.handle(ipcChannels.toggleAlwaysOnTop, (): boolean => {
      const next = !this.window.isAlwaysOnTop();
      this.window.setAlwaysOnTop(next);
      if (!this.window.webContents.isDestroyed()) {
        this.window.webContents.send(ipcChannels.windowAlwaysOnTop, next);
      }
      return next;
    });

    ipcMain.handle(ipcChannels.closeWindow, () => {
      this.window.close();
    });

    ipcMain.handle(ipcChannels.startWindowDrag, (_event, offsetX: number, offsetY: number) => {
      if (this.dragInterval != undefined) return;
      // Disable resizing while dragging from the header so that clicking near the
      // window edge does not trigger an unintended resize.
      this.wasResizableBeforeDrag = this.window.isResizable();
      this.window.setResizable(false);
      const initialBounds = this.window.getBounds();
      const initialCursor = screen.getCursorScreenPoint();
      this.dragInterval = setInterval(() => {
        const cursor = screen.getCursorScreenPoint();
        this.window.setPosition(
          initialBounds.x + (cursor.x - initialCursor.x),
          initialBounds.y + (cursor.y - initialCursor.y)
        );
      }, 16);
    });

    ipcMain.handle(ipcChannels.stopWindowDrag, () => {
      if (this.dragInterval != undefined) {
        clearInterval(this.dragInterval);
        this.dragInterval = undefined;
      }
      this.window.setResizable(this.wasResizableBeforeDrag);
    });
  }

  public async dispose(): Promise<void> {
    if (this.dragInterval != undefined) {
      clearInterval(this.dragInterval);
      this.dragInterval = undefined;
    }
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
