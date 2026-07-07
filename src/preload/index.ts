import { contextBridge, ipcRenderer } from "electron";
import type { NavBridgeAPI } from "../shared/ipc";
import { ipcChannels } from "../shared/ipc";
import type { LogEntry, StreamConfig, StreamStatus } from "../shared/stream";

const api: NavBridgeAPI = {
  startServer: async (config: StreamConfig) => await ipcRenderer.invoke(ipcChannels.startServer, config),
  stopServer: async () => {
    await ipcRenderer.invoke(ipcChannels.stopServer);
  },
  loadConfig: async () => await ipcRenderer.invoke(ipcChannels.loadConfig),
  saveConfig: async (config: StreamConfig) => {
    await ipcRenderer.invoke(ipcChannels.saveConfig, config);
  },
  onStatus: (callback: (status: StreamStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: StreamStatus): void => callback(status);
    ipcRenderer.on(ipcChannels.status, listener);
    return () => ipcRenderer.off(ipcChannels.status, listener);
  },
  onLog: (callback: (log: LogEntry) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, log: LogEntry): void => callback(log);
    ipcRenderer.on(ipcChannels.log, listener);
    return () => ipcRenderer.off(ipcChannels.log, listener);
  }
};

contextBridge.exposeInMainWorld("navBridge", api);
