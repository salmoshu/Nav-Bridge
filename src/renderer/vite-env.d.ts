/// <reference types="vite/client" />

import type { NavBridgeAPI } from "../shared/ipc";

declare global {
  const __APP_VERSION__: string;

  interface Window {
    navBridge: NavBridgeAPI;
  }
}
