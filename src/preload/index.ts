import { contextBridge, ipcRenderer } from "electron";
import type { NavBridgeAPI, SerialPortInfo } from "../shared/ipc";
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
  exportConfig: async (config: StreamConfig) => {
    await ipcRenderer.invoke(ipcChannels.exportConfig, config);
  },
  listSerialPorts: async () => await ipcRenderer.invoke(ipcChannels.listSerialPorts),
  minimizeWindow: async () => {
    await ipcRenderer.invoke(ipcChannels.minimizeWindow);
  },
  toggleAlwaysOnTop: async () => await ipcRenderer.invoke(ipcChannels.toggleAlwaysOnTop),
  closeWindow: async () => {
    await ipcRenderer.invoke(ipcChannels.closeWindow);
  },
  startWindowDrag: async (offsetX: number, offsetY: number) => {
    await ipcRenderer.invoke(ipcChannels.startWindowDrag, offsetX, offsetY);
  },
  stopWindowDrag: async () => {
    await ipcRenderer.invoke(ipcChannels.stopWindowDrag);
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
  },
  onAlwaysOnTopChange: (callback: (alwaysOnTop: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, alwaysOnTop: boolean): void => callback(alwaysOnTop);
    ipcRenderer.on(ipcChannels.windowAlwaysOnTop, listener);
    return () => ipcRenderer.off(ipcChannels.windowAlwaysOnTop, listener);
  }
};

contextBridge.exposeInMainWorld("navBridge", api);
