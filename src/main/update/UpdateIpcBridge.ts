import { dialog, ipcMain, type BrowserWindow } from "electron";
import { ipcChannels } from "../../shared/ipc";
import type { UpdateManager } from "./UpdateManager";

export class UpdateIpcBridge {
  private unsubscribe?: () => void;

  public constructor(
    private readonly window: BrowserWindow,
    private readonly manager: UpdateManager,
    private readonly beforeRestart: () => Promise<void>
  ) {}

  public register(): void {
    for (const channel of [
      ipcChannels.getUpdateState,
      ipcChannels.checkForUpdates,
      ipcChannels.installUpdate
    ]) {
      ipcMain.removeHandler(channel);
    }
    const assertSender = (event: Electron.IpcMainInvokeEvent): void => {
      if (event.sender !== this.window.webContents) throw new Error("Invalid update IPC sender");
    };
    ipcMain.handle(ipcChannels.getUpdateState, (event) => {
      assertSender(event);
      return this.manager.getState();
    });
    ipcMain.handle(ipcChannels.checkForUpdates, (event) => {
      assertSender(event);
      return this.manager.checkForUpdates();
    });
    ipcMain.handle(ipcChannels.installUpdate, (event) => {
      assertSender(event);
      return this.manager.installUpdate(async () => {
        const { response } = await dialog.showMessageBox(this.window, {
          type: "question",
          title: "Nav-Bridge 更新",
          message: "重启应用以更新",
          detail: `V${this.manager.getState().availableVersion} 已下载完成。重启会停止当前的数据转发，是否现在重启并安装更新？`,
          buttons: ["重启并更新", "稍后"],
          defaultId: 0,
          cancelId: 1,
          noLink: true
        });
        return response === 0;
      }, this.beforeRestart);
    });
    this.unsubscribe = this.manager.subscribe((state) => {
      if (!this.window.webContents.isDestroyed()) {
        this.window.webContents.send(ipcChannels.updateStateChanged, state);
      }
    });
  }

  public dispose(): void {
    this.unsubscribe?.();
    for (const channel of [
      ipcChannels.getUpdateState,
      ipcChannels.checkForUpdates,
      ipcChannels.installUpdate
    ]) {
      ipcMain.removeHandler(channel);
    }
  }
}
