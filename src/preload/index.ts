import { contextBridge, ipcRenderer } from "electron";
import type { NavBridgeAPI, SerialPortInfo, WindowResizeEdge } from "../shared/ipc";
import { ipcChannels } from "../shared/ipc";
import type { LogEntry, StreamConfig, StreamDataEntry, StreamMode, StreamStatus } from "../shared/stream";
import type { ThemeMode } from "../shared/theme";
import type { AppUpdateState } from "../shared/update";

const api: NavBridgeAPI = {
  getUpdateState: async () => await ipcRenderer.invoke(ipcChannels.getUpdateState),
  checkForUpdates: async () => await ipcRenderer.invoke(ipcChannels.checkForUpdates),
  installUpdate: async () => await ipcRenderer.invoke(ipcChannels.installUpdate),
  onUpdateStateChange: (callback: (state: AppUpdateState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: AppUpdateState): void => callback(state);
    ipcRenderer.on(ipcChannels.updateStateChanged, listener);
    return () => ipcRenderer.off(ipcChannels.updateStateChanged, listener);
  },
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
  startWindowResize: async (edge: WindowResizeEdge) => {
    await ipcRenderer.invoke(ipcChannels.startWindowResize, edge);
  },
  stopWindowResize: async () => {
    await ipcRenderer.invoke(ipcChannels.stopWindowResize);
  },
  openMonitorWindow: async () => {
    await ipcRenderer.invoke(ipcChannels.openMonitorWindow);
  },
  closeMonitorWindow: async () => {
    await ipcRenderer.invoke(ipcChannels.closeMonitorWindow);
  },
  clearMonitorCache: async () => {
    await ipcRenderer.invoke(ipcChannels.clearMonitorCache);
  },
  showFileDialog: async (mode: StreamMode, suggestedPath?: string) =>
    await ipcRenderer.invoke(ipcChannels.showFileDialog, mode, suggestedPath),
  loadThemeMode: async () => await ipcRenderer.invoke(ipcChannels.loadThemeMode),
  saveThemeMode: async (mode: ThemeMode) => {
    await ipcRenderer.invoke(ipcChannels.saveThemeMode, mode);
  },
  onThemeModeChange: (callback: (mode: ThemeMode) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, mode: ThemeMode): void => callback(mode);
    ipcRenderer.on(ipcChannels.themeModeChanged, listener);
    return () => ipcRenderer.off(ipcChannels.themeModeChanged, listener);
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
  onData: (callback: (entry: StreamDataEntry) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, entry: StreamDataEntry): void => callback(entry);
    ipcRenderer.on(ipcChannels.data, listener);
    return () => ipcRenderer.off(ipcChannels.data, listener);
  },
  onAlwaysOnTopChange: (callback: (alwaysOnTop: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, alwaysOnTop: boolean): void => callback(alwaysOnTop);
    ipcRenderer.on(ipcChannels.windowAlwaysOnTop, listener);
    return () => ipcRenderer.off(ipcChannels.windowAlwaysOnTop, listener);
  }
};

contextBridge.exposeInMainWorld("navBridge", api);
