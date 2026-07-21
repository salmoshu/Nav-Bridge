import type { BrowserWindowConstructorOptions } from "electron";
import { join } from "node:path";
import { APP_WINDOW_WIDTH, mainWindowHeightForEndpointRows } from "../shared/windowMetrics";

export const appWindowWidth = APP_WINDOW_WIDTH;
export const appWindowMinHeight = mainWindowHeightForEndpointRows(2);
export const appWindowDefaultHeight = mainWindowHeightForEndpointRows(4);
export const appWindowMaxHeight = mainWindowHeightForEndpointRows(6);

export function createMainWindowOptions(): BrowserWindowConstructorOptions {
  return {
    width: appWindowWidth,
    height: appWindowDefaultHeight,
    minWidth: appWindowWidth,
    maxWidth: appWindowWidth,
    minHeight: appWindowMinHeight,
    maxHeight: appWindowMaxHeight,
    resizable: false,
    title: "Nav-Bridge",
    icon: join(__dirname, "../renderer/favicon.ico"),
    frame: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  };
}
