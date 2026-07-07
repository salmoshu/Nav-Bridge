import type { LogEntry, StreamConfig, StreamStatus } from "./stream";

export interface StartServerResult {
  success: boolean;
  error?: string;
}

export interface NavBridgeAPI {
  startServer(config: StreamConfig): Promise<StartServerResult>;
  stopServer(): Promise<void>;
  loadConfig(): Promise<StreamConfig>;
  saveConfig(config: StreamConfig): Promise<void>;
  onStatus(callback: (status: StreamStatus) => void): () => void;
  onLog(callback: (log: LogEntry) => void): () => void;
}

export const ipcChannels = {
  startServer: "nav-bridge:start-server",
  stopServer: "nav-bridge:stop-server",
  loadConfig: "nav-bridge:load-config",
  saveConfig: "nav-bridge:save-config",
  status: "nav-bridge:status",
  log: "nav-bridge:log"
} as const;
