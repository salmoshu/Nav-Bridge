import type { BrowserWindow } from "electron";
import { app, dialog, ipcMain, screen } from "electron";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { SerialPort } from "serialport";
import type { SerialPortInfo, StartServerResult, WindowResizeEdge } from "../../shared/ipc";
import { ipcChannels } from "../../shared/ipc";
import type {
  ConnectionStatus,
  LogEntry,
  StreamConfig,
  StreamDataEntry,
  StreamMode,
  StreamStatus
} from "../../shared/stream";
import { ConfigStore } from "../config/ConfigStore";
import { validateDuplicateClientEndpoints, validateStreamConfig } from "../config/validateStreamConfig";
import {
  closeMonitorWindow,
  clearMonitorCache,
  createMonitorWindow,
  sendMonitorData,
  sendMonitorLog,
  sendMonitorStatus,
  setMonitorAlwaysOnTop
} from "../monitor/MonitorWindow";
import { StreamServer } from "../stream/StreamServer";
import { createAdapter } from "../stream/createAdapter";
import { appWindowMaxHeight, appWindowMinHeight } from "../windowOptions";

export class IpcBridge {
  private server?: StreamServer;
  private lifecycle = Promise.resolve();
  private resizeInterval?: NodeJS.Timeout;
  private lastInputStatus: ConnectionStatus = "idle";
  private inputHost?: string;
  private inputPort?: number;
  private firstDataLogged = false;

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
    ipcMain.removeHandler(ipcChannels.startWindowResize);
    ipcMain.removeHandler(ipcChannels.stopWindowResize);
    ipcMain.removeHandler(ipcChannels.openMonitorWindow);
    ipcMain.removeHandler(ipcChannels.closeMonitorWindow);
    ipcMain.removeHandler(ipcChannels.clearMonitorCache);
    ipcMain.removeHandler(ipcChannels.showFileDialog);

    ipcMain.handle(ipcChannels.openMonitorWindow, () => {
      createMonitorWindow();
      setMonitorAlwaysOnTop(this.window.isAlwaysOnTop());
    });

    ipcMain.handle(ipcChannels.closeMonitorWindow, () => {
      closeMonitorWindow();
    });

    ipcMain.handle(ipcChannels.clearMonitorCache, () => {
      clearMonitorCache();
    });

    ipcMain.handle(ipcChannels.showFileDialog, async (_event, mode: StreamMode, suggestedPath?: string) => {
      const defaultPath =
        typeof suggestedPath === "string" && suggestedPath.length > 0
          ? path.dirname(suggestedPath)
          : app.getAppPath();
      if (mode === "input") {
        const result = await dialog.showOpenDialog(this.window, {
          defaultPath,
          properties: ["openFile"]
        });
        return !result.canceled && result.filePaths.length > 0 ? result.filePaths[0] : undefined;
      }
      const result = await dialog.showSaveDialog(this.window, { defaultPath });
      return !result.canceled && result.filePath ? result.filePath : undefined;
    });

    ipcMain.handle(
      ipcChannels.startServer,
      async (_event, config: StreamConfig): Promise<StartServerResult> => {
        return await this.enqueue(async () => {
          validateStreamConfig(config);
          validateDuplicateClientEndpoints(config.input, config.outputs);
          await this.server?.stop();
          this.server = this.createServer(config);
          this.server.onStatus((status) => this.handleStatus(status));
          this.server.onData((entry) => this.sendData(entry));
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
      this.configStore.save(config);
    });

    ipcMain.handle(ipcChannels.exportConfig, async (_event, config: StreamConfig) => {
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
        pnpId: port.pnpId,
        friendlyName: (port as { friendlyName?: string }).friendlyName
      }));
    });

    ipcMain.handle(ipcChannels.minimizeWindow, () => {
      this.window.minimize();
    });

    ipcMain.handle(ipcChannels.toggleAlwaysOnTop, (): boolean => {
      const next = !this.window.isAlwaysOnTop();
      this.window.setAlwaysOnTop(next);
      setMonitorAlwaysOnTop(next);
      if (!this.window.webContents.isDestroyed()) {
        this.window.webContents.send(ipcChannels.windowAlwaysOnTop, next);
      }
      return next;
    });

    ipcMain.handle(ipcChannels.closeWindow, () => {
      this.window.close();
    });

    ipcMain.handle(ipcChannels.startWindowResize, (_event, edge: WindowResizeEdge) => {
      if (this.resizeInterval != undefined) return;
      if (edge !== "top" && edge !== "bottom") return;

      const initialBounds = this.window.getBounds();
      const initialCursor = screen.getCursorScreenPoint();
      this.resizeInterval = setInterval(() => {
        const cursor = screen.getCursorScreenPoint();
        const deltaY = cursor.y - initialCursor.y;
        const height = Math.min(
          appWindowMaxHeight,
          Math.max(
            appWindowMinHeight,
            edge === "bottom" ? initialBounds.height + deltaY : initialBounds.height - deltaY
          )
        );
        const y = edge === "top" ? initialBounds.y + initialBounds.height - height : initialBounds.y;

        this.window.setBounds({
          x: initialBounds.x,
          y,
          width: initialBounds.width,
          height
        });
      }, 16);
    });

    ipcMain.handle(ipcChannels.stopWindowResize, () => {
      if (this.resizeInterval != undefined) {
        clearInterval(this.resizeInterval);
        this.resizeInterval = undefined;
      }
    });
  }

  public async dispose(): Promise<void> {
    if (this.resizeInterval != undefined) {
      clearInterval(this.resizeInterval);
      this.resizeInterval = undefined;
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
    this.inputHost =
      config.input.type === "tcp-client" || config.input.type === "udp-client"
        ? (config.input.params as { host: string }).host
        : undefined;
    this.inputPort =
      config.input.type === "tcp-client" || config.input.type === "udp-client"
        ? (config.input.params as { port: number }).port
        : undefined;
    this.lastInputStatus = "idle";
    this.firstDataLogged = false;
    return new StreamServer(createAdapter(config.input, "input"), outputs, {
      bufferSize: config.options.bufferSize,
      statusInterval: config.options.statusInterval
    });
  }

  private log(level: LogEntry["level"], message: string): void {
    const logEntry: LogEntry = {
      level,
      message,
      time: new Date().toISOString()
    };
    if (!this.window.webContents.isDestroyed()) {
      this.window.webContents.send(ipcChannels.log, logEntry);
    }
    sendMonitorLog(logEntry);
  }

  private handleStatus(status: StreamStatus): void {
    if (status.input.status === "connected" && this.lastInputStatus !== "connected") {
      const address =
        this.inputHost != undefined && this.inputPort != undefined
          ? `${this.inputHost}:${this.inputPort}`
          : status.input.id;
      this.log("info", `Input connected (${address})`);
    }
    this.lastInputStatus = status.input.status;
    if (!this.window.webContents.isDestroyed()) {
      this.window.webContents.send(ipcChannels.status, status);
    }
    sendMonitorStatus(status);
  }

  private sendData(entry: StreamDataEntry): void {
    if (!this.firstDataLogged) {
      this.firstDataLogged = true;
      this.log("info", `First data: ${entry.data.length} bytes`);
    }
    if (!this.window.webContents.isDestroyed()) {
      this.window.webContents.send(ipcChannels.data, entry);
    }
    sendMonitorData(entry);
  }
}
