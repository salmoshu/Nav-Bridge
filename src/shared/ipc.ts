import type { LogEntry, StreamConfig, StreamDataEntry, StreamStatus, StreamMode } from "./stream";
import type { ThemeMode } from "./theme";
import type { AppUpdateState } from "./update";

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
  pnpId?: string;
  friendlyName?: string;
}

export interface StartServerResult {
  success: boolean;
  error?: string;
}

export type WindowResizeEdge = "top" | "bottom";

export interface NavBridgeAPI {
  getUpdateState(): Promise<AppUpdateState>;
  checkForUpdates(): Promise<AppUpdateState>;
  installUpdate(): Promise<AppUpdateState>;
  onUpdateStateChange(callback: (state: AppUpdateState) => void): () => void;
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
  openMonitorWindow(): Promise<void>;
  closeMonitorWindow(): Promise<void>;
  clearMonitorCache(): Promise<void>;
  showFileDialog(mode: StreamMode, suggestedPath?: string): Promise<string | undefined>;
  loadThemeMode(): Promise<ThemeMode>;
  saveThemeMode(mode: ThemeMode): Promise<void>;
  onThemeModeChange(callback: (mode: ThemeMode) => void): () => void;
  onStatus(callback: (status: StreamStatus) => void): () => void;
  onLog(callback: (log: LogEntry) => void): () => void;
  onData(callback: (entry: StreamDataEntry) => void): () => void;
  onAlwaysOnTopChange(callback: (alwaysOnTop: boolean) => void): () => void;
}

export const ipcChannels = {
  getUpdateState: "nav-bridge:update-state",
  checkForUpdates: "nav-bridge:update-check",
  installUpdate: "nav-bridge:update-install",
  updateStateChanged: "nav-bridge:update-state-changed",
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
  openMonitorWindow: "nav-bridge:monitor-open",
  closeMonitorWindow: "nav-bridge:monitor-close",
  clearMonitorCache: "nav-bridge:monitor-clear-cache",
  showFileDialog: "nav-bridge:show-file-dialog",
  loadThemeMode: "nav-bridge:load-theme-mode",
  saveThemeMode: "nav-bridge:save-theme-mode",
  themeModeChanged: "nav-bridge:theme-mode-changed",
  windowAlwaysOnTop: "nav-bridge:window-always-on-top",
  status: "nav-bridge:status",
  log: "nav-bridge:log",
  data: "nav-bridge:data"
} as const;
