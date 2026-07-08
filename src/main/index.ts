import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { IpcBridge } from "./ipc/bridge";
import { createMainWindowOptions } from "./windowOptions";

function createWindow(): void {
  const mainWindow = new BrowserWindow(createMainWindowOptions());

  const bridge = new IpcBridge(mainWindow);
  bridge.register();
  mainWindow.on("closed", () => {
    void bridge.dispose();
  });

  if (process.env.ELECTRON_RENDERER_URL != undefined) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

void app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
