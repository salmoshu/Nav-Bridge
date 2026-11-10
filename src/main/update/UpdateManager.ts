import type { AppUpdater } from "electron-updater";
import type { AppUpdateState } from "../../shared/update";
import { getUpdateErrorMessage } from "../../shared/updateError";

export type UpdateBackend = Pick<
  AppUpdater,
  | "on"
  | "off"
  | "autoDownload"
  | "autoInstallOnAppQuit"
  | "allowPrerelease"
  | "allowDowngrade"
  | "checkForUpdates"
  | "quitAndInstall"
>;

/** Application-wide state survives renderer reloads and window recreation. */
export class UpdateManager {
  private state: AppUpdateState;
  private readonly listeners = new Set<(state: AppUpdateState) => void>();
  private checking?: Promise<AppUpdateState>;
  private installing = false;
  private downloaded = false;

  public constructor(
    private readonly backend: UpdateBackend | undefined,
    currentVersion: string,
    unsupportedReason = "开发模式不执行自动更新，请使用安装版测试。"
  ) {
    this.state = {
      phase: backend == undefined ? "unsupported" : "idle",
      currentVersion,
      ...(backend == undefined ? { error: unsupportedReason } : {})
    };
    if (backend == undefined) return;

    backend.autoDownload = true;
    // Installation must follow the user's explicit restart confirmation.
    backend.autoInstallOnAppQuit = false;
    backend.allowPrerelease = false;
    backend.allowDowngrade = false;
    backend.on("update-available", (info: { version: string }) => {
      this.setState({ phase: "downloading", availableVersion: info.version, progress: 0, error: undefined });
    });
    backend.on("update-not-available", () => {
      if (!this.downloaded) {
        this.setState({
          phase: "not-available",
          availableVersion: undefined,
          progress: undefined,
          error: undefined
        });
      }
    });
    backend.on("download-progress", (progress: { percent: number }) => {
      this.setState({ phase: "downloading", progress: Math.min(100, Math.max(0, progress.percent)) });
    });
    backend.on("update-downloaded", (info: { version: string }) => {
      this.downloaded = true;
      this.setState({ phase: "downloaded", availableVersion: info.version, progress: 100, error: undefined });
    });
    backend.on("error", (error: Error) => this.fail(error));
  }

  public getState(): AppUpdateState {
    return { ...this.state };
  }

  public subscribe(listener: (state: AppUpdateState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public async checkForUpdates(): Promise<AppUpdateState> {
    if (this.checking != undefined) return await this.checking;
    if (
      this.backend == undefined ||
      this.downloaded ||
      this.state.phase === "downloading" ||
      this.installing
    ) {
      return this.getState();
    }
    this.setState({ phase: "checking", error: undefined });
    this.checking = this.backend
      .checkForUpdates()
      .then((result) => {
        // The download is independent of the check promise and can fail later.
        void result?.downloadPromise?.catch((error: unknown) => this.fail(error));
        if (result == undefined && this.state.phase === "checking") {
          this.setState({ phase: "unsupported", error: "当前运行方式不支持自动更新，请使用安装版。" });
        }
        return this.getState();
      })
      .catch((error: unknown) => {
        this.fail(error);
        return this.getState();
      })
      .finally(() => {
        this.checking = undefined;
      });
    return await this.checking;
  }

  public async installUpdate(
    confirmRestart: () => Promise<boolean>,
    beforeRestart: () => Promise<void>
  ): Promise<AppUpdateState> {
    if (this.backend == undefined || !this.downloaded || this.installing || this.state.phase === "installing")
      return this.getState();
    this.installing = true;
    try {
      if (!(await confirmRestart())) return this.getState();
      this.setState({ phase: "installing", error: undefined });
      await beforeRestart();
      this.backend.quitAndInstall(true, true);
    } catch (error) {
      this.fail(error, "重启更新失败，更新包已保留，请重试。");
    } finally {
      this.installing = false;
    }
    return this.getState();
  }

  private fail(error: unknown, message?: string): void {
    this.setState({
      phase: this.downloaded ? "downloaded" : "error",
      error: message ?? getUpdateErrorMessage(error)
    });
  }

  private setState(patch: Partial<AppUpdateState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.getState());
  }
}
