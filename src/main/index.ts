import { BrowserWindow, app, nativeTheme, screen } from "electron";
import { join } from "node:path";
import { ConfigStore, type WindowBounds } from "./config/ConfigStore";
import { IpcBridge } from "./ipc/bridge";
import { destroyMonitorWindow, sendMonitorLog } from "./monitor/MonitorWindow";
import { resolveThemeMode, themeBackgroundColors } from "../shared/theme";
import { createMainWindowOptions } from "./windowOptions";
import electronUpdater from "electron-updater";
import { UpdateManager } from "./update/UpdateManager";
import { UpdateIpcBridge } from "./update/UpdateIpcBridge";

const configStore = new ConfigStore();
let updateManager: UpdateManager;

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
  const themeMode = configStore.loadThemeMode();
  const resolvedMode = resolveThemeMode(themeMode, nativeTheme.shouldUseDarkColors);
  const mainWindow = new BrowserWindow({
    ...createMainWindowOptions(),
    ...bounds,
    backgroundColor: themeBackgroundColors[resolvedMode],
    show: false
  });

  const bridge = new IpcBridge(mainWindow, configStore);
  bridge.register();
  const updateBridge = new UpdateIpcBridge(mainWindow, updateManager, () => bridge.dispose());
  updateBridge.register();

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("close", () => {
    configStore.saveWindowBounds(mainWindow.getBounds());
  });

  mainWindow.on("closed", () => {
    updateBridge.dispose();
    destroyMonitorWindow();
    void bridge.dispose();
  });

  const query: Record<string, string> = { themeMode };
  if (process.env.ELECTRON_RENDERER_URL != undefined) {
    void mainWindow.loadURL(
      `${process.env.ELECTRON_RENDERER_URL}?themeMode=${encodeURIComponent(themeMode)}`
    );
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"), { query });
  }
}

void app.whenReady().then(() => {
  logToMonitor("info", "Application started");
  const portable = process.env.PORTABLE_EXECUTABLE_FILE != undefined;
  updateManager = new UpdateManager(
    app.isPackaged && !portable ? electronUpdater.autoUpdater : undefined,
    app.getVersion(),
    portable ? "便携版暂不支持自动安装更新，请使用 Setup 安装版。" : undefined
  );
  createWindow();
  void updateManager.checkForUpdates();
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
