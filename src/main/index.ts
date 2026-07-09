import { app, BrowserWindow, screen } from "electron";
import { join } from "node:path";
import { ConfigStore, type WindowBounds } from "./config/ConfigStore";
import { IpcBridge } from "./ipc/bridge";
import { destroyMonitorWindow, sendMonitorLog } from "./monitor/MonitorWindow";
import { createMainWindowOptions } from "./windowOptions";

const configStore = new ConfigStore();

function logToMonitor(level: "info" | "warn" | "error", message: string): void {
  sendMonitorLog({
    level,
    message,
    time: new Date().toISOString()
  });
}

process.on("uncaughtException", (error) => {
  logToMonitor("error", `Uncaught exception: ${error.message}`);
});

process.on("unhandledRejection", (reason) => {
  logToMonitor("error", `Unhandled rejection: ${String(reason)}`);
});

function resolveWindowBounds(saved?: WindowBounds): Partial<Electron.Rectangle> {
  if (saved == undefined) {
    return {};
  }

  const display = screen.getDisplayMatching(saved);
  if (display == undefined) {
    return {};
  }

  const area = display.workArea;
  const intersects =
    saved.x < area.x + area.width &&
    saved.x + saved.width > area.x &&
    saved.y < area.y + area.height &&
    saved.y + saved.height > area.y;

  if (!intersects) {
    return {};
  }

  return { x: saved.x, y: saved.y, width: saved.width, height: saved.height };
}

function createWindow(): void {
  const bounds = resolveWindowBounds(configStore.loadWindowBounds());
  const mainWindow = new BrowserWindow({
    ...createMainWindowOptions(),
    ...bounds
  });

  const bridge = new IpcBridge(mainWindow, configStore);
  bridge.register();

  mainWindow.on("close", () => {
    configStore.saveWindowBounds(mainWindow.getBounds());
  });

  mainWindow.on("closed", () => {
    destroyMonitorWindow();
    void bridge.dispose();
  });

  if (process.env.ELECTRON_RENDERER_URL != undefined) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

void app.whenReady().then(() => {
  logToMonitor("info", "Application started");
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("browser-window-focus", (_event, window) => {
  window.moveTop();
});

app.on("window-all-closed", () => {
  logToMonitor("info", "Application stopped");
  if (process.platform !== "darwin") {
    app.quit();
  }
});
