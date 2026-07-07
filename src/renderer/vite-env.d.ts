/// <reference types="vite/client" />

import type { NavBridgeAPI } from "../shared/ipc";

declare global {
  interface Window {
    navBridge: NavBridgeAPI;
  }
}
