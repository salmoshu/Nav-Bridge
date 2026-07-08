import type { BrowserWindowConstructorOptions } from "electron";
import { join } from "node:path";

export const appWindowWidth = 560;
export const appWindowMinHeight = 360;

export function createMainWindowOptions(): BrowserWindowConstructorOptions {
  return {
    width: appWindowWidth,
    height: 420,
    minWidth: appWindowWidth,
    maxWidth: appWindowWidth,
    minHeight: appWindowMinHeight,
    resizable: false,
    title: "Nav-Bridge",
    frame: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  };
}
