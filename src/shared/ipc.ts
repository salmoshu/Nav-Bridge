import type { LogEntry, StreamConfig, StreamStatus } from "./stream";

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
  pnpId?: string;
}

export interface StartServerResult {
  success: boolean;
  error?: string;
}

export type WindowResizeEdge = "top" | "bottom";

export interface NavBridgeAPI {
  startServer(config: StreamConfig): Promise<StartServerResult>;
  stopServer(): Promise<void>;
  loadConfig(): Promise<StreamConfig>;
  saveConfig(config: StreamConfig): Promise<void>;
  exportConfig(config: StreamConfig): Promise<void>;
  listSerialPorts(): Promise<SerialPortInfo[]>;
  minimizeWindow(): Promise<void>;
  toggleAlwaysOnTop(): Promise<boolean>;
  closeWindow(): Promise<void>;
  startWindowResize(edge: WindowResizeEdge): Promise<void>;
  stopWindowResize(): Promise<void>;
  onStatus(callback: (status: StreamStatus) => void): () => void;
  onLog(callback: (log: LogEntry) => void): () => void;
  onAlwaysOnTopChange(callback: (alwaysOnTop: boolean) => void): () => void;
}

export const ipcChannels = {
  startServer: "nav-bridge:start-server",
  stopServer: "nav-bridge:stop-server",
  loadConfig: "nav-bridge:load-config",
  saveConfig: "nav-bridge:save-config",
  exportConfig: "nav-bridge:export-config",
  listSerialPorts: "nav-bridge:list-serial-ports",
  minimizeWindow: "nav-bridge:window-minimize",
  toggleAlwaysOnTop: "nav-bridge:window-toggle-always-on-top",
  closeWindow: "nav-bridge:window-close",
  startWindowResize: "nav-bridge:window-resize-start",
  stopWindowResize: "nav-bridge:window-resize-stop",
  windowAlwaysOnTop: "nav-bridge:window-always-on-top",
  status: "nav-bridge:status",
  log: "nav-bridge:log"
} as const;
