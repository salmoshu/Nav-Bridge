import { BrowserWindow as ElectronBrowserWindow } from "electron";
import { join } from "node:path";
import { ipcChannels } from "../../shared/ipc";
import { MAX_MONITOR_LOG_ENTRIES, pushMonitorEntry } from "../../shared/monitorLimits";
import type { LogEntry, StreamDataEntry, StreamStatus } from "../../shared/stream";

const monitorWidth = 720;
const monitorHeight = 460;

let monitorWindow: ElectronBrowserWindow | undefined;
let monitorReady = false;
const monitorLogBuffer: LogEntry[] = [];

function flushMonitorLogs(): void {
  if (monitorWindow == undefined || monitorWindow.webContents.isDestroyed()) {
    return;
  }
  for (const log of monitorLogBuffer) {
    monitorWindow.webContents.send(ipcChannels.log, log);
  }
}

export function createMonitorWindow(): ElectronBrowserWindow {
  if (monitorWindow != undefined && !monitorWindow.isDestroyed()) {
    monitorWindow.focus();
    return monitorWindow;
  }

  monitorWindow = new ElectronBrowserWindow({
    width: monitorWidth,
    height: monitorHeight,
    minWidth: 400,
    minHeight: 300,
    title: "Stream Monitor - Nav-Bridge",
    frame: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  monitorReady = false;
  monitorWindow.webContents.once("did-finish-load", () => {
    monitorReady = true;
    flushMonitorLogs();
  });

  monitorWindow.on("closed", () => {
    monitorWindow = undefined;
    monitorReady = false;
  });

  if (process.env.ELECTRON_RENDERER_URL != undefined) {
    void monitorWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/monitor.html`);
  } else {
    void monitorWindow.loadFile(join(__dirname, "../../renderer/monitor.html"));
  }

  return monitorWindow;
}

export function closeMonitorWindow(): void {
  if (monitorWindow != undefined && !monitorWindow.isDestroyed()) {
    monitorWindow.close();
    monitorWindow = undefined;
    monitorReady = false;
  }
}

export function sendMonitorStatus(status: StreamStatus): void {
  if (monitorWindow != undefined && !monitorWindow.webContents.isDestroyed()) {
    monitorWindow.webContents.send(ipcChannels.status, status);
  }
}

export function sendMonitorLog(log: LogEntry): void {
  const next = pushMonitorEntry(monitorLogBuffer, log, MAX_MONITOR_LOG_ENTRIES);
  monitorLogBuffer.splice(0, monitorLogBuffer.length, ...next);

  if (monitorReady && monitorWindow != undefined && !monitorWindow.webContents.isDestroyed()) {
    monitorWindow.webContents.send(ipcChannels.log, log);
  }
}

export function sendMonitorData(entry: StreamDataEntry): void {
  if (monitorWindow != undefined && !monitorWindow.webContents.isDestroyed()) {
    monitorWindow.webContents.send(ipcChannels.data, entry);
  }
}

export function destroyMonitorWindow(): void {
  if (monitorWindow != undefined && !monitorWindow.isDestroyed()) {
    monitorWindow.destroy();
    monitorWindow = undefined;
    monitorReady = false;
  }
}

export function setMonitorAlwaysOnTop(alwaysOnTop: boolean): void {
  if (monitorWindow != undefined && !monitorWindow.isDestroyed()) {
    monitorWindow.setAlwaysOnTop(alwaysOnTop);
  }
}
