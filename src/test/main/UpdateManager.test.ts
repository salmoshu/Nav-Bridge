import { UpdateManager, type UpdateBackend } from "../../main/update/UpdateManager";
import { TestUpdateBackend, updateResult } from "./updateTestBackend";

describe("UpdateManager", () => {
  let backend: TestUpdateBackend;
  let manager: UpdateManager;
  beforeEach(() => {
    backend = new TestUpdateBackend();
    manager = new UpdateManager(backend as unknown as UpdateBackend, "0.1.0");
  });

  it("automatically downloads stable upgrades and waits for explicit installation", () => {
    expect(backend.autoDownload).toBe(true);
    expect(backend.autoInstallOnAppQuit).toBe(false);
    expect(backend.allowPrerelease).toBe(false);
    expect(backend.allowDowngrade).toBe(false);
    backend.emit("update-available", { version: "0.1.1" });
    backend.emit("download-progress", { percent: 34.5 });
    expect(manager.getState()).toMatchObject({
      phase: "downloading",
      currentVersion: "0.1.0",
      availableVersion: "0.1.1",
      progress: 34.5
    });
    backend.emit("update-downloaded", { version: "0.1.1" });
    expect(manager.getState()).toMatchObject({
      phase: "downloaded",
      availableVersion: "0.1.1",
      progress: 100
    });
    expect(backend.quitAndInstall).not.toHaveBeenCalled();
  });

  it("coalesces simultaneous startup and manual checks", async () => {
    let resolve!: (result: ReturnType<typeof updateResult>) => void;
    backend.checkForUpdates.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    const first = manager.checkForUpdates();
    const second = manager.checkForUpdates();
    expect(backend.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(manager.getState().phase).toBe("checking");
    backend.emit("update-available", { version: "0.1.1" });
    resolve(updateResult());
    await Promise.all([first, second]);
    expect(manager.getState().phase).toBe("downloading");
  });

  it("preserves a ready update when the version is clicked again", async () => {
    backend.emit("update-downloaded", { version: "0.1.1" });
    await manager.checkForUpdates();
    backend.emit("update-not-available");
    expect(manager.getState().phase).toBe("downloaded");
    expect(backend.checkForUpdates).not.toHaveBeenCalled();
  });

  it("reports a current version with no newer release", async () => {
    backend.checkForUpdates.mockImplementation(async () => {
      backend.emit("update-not-available");
      return { ...updateResult(), isUpdateAvailable: false };
    });
    expect((await manager.checkForUpdates()).phase).toBe("not-available");
  });

  it("handles a failed check and allows a retry", async () => {
    backend.checkForUpdates.mockRejectedValueOnce(new Error("Network offline"));
    expect(await manager.checkForUpdates()).toMatchObject({
      phase: "error",
      error: "无法连接更新服务器，请检查网络后重试。"
    });
    backend.checkForUpdates.mockImplementation(async () => {
      backend.emit("update-not-available");
      return updateResult();
    });
    expect((await manager.checkForUpdates()).phase).toBe("not-available");
  });

  it("handles a download rejection independently of the completed check", async () => {
    let rejectDownload!: (error: Error) => void;
    const download = new Promise<string[]>((_resolve, reject) => {
      rejectDownload = reject;
    });
    backend.checkForUpdates.mockImplementation(async () => {
      backend.emit("update-available", { version: "0.1.1" });
      return updateResult(download);
    });
    await manager.checkForUpdates();
    rejectDownload(new Error("Checksum mismatch"));
    await Promise.resolve();
    expect(manager.getState()).toMatchObject({
      phase: "error",
      error: "更新包校验失败，请重新检查并下载更新。"
    });
    expect(backend.quitAndInstall).not.toHaveBeenCalled();
  });

  it("keeps the download ready when restarting is cancelled", async () => {
    backend.emit("update-downloaded", { version: "0.1.1" });
    const stop = jest.fn();
    await manager.installUpdate(async () => false, stop);
    expect(manager.getState().phase).toBe("downloaded");
    expect(stop).not.toHaveBeenCalled();
    expect(backend.quitAndInstall).not.toHaveBeenCalled();
  });

  it("stops active streams before installing and restarting", async () => {
    backend.emit("update-downloaded", { version: "0.1.1" });
    const stop = jest.fn(async () => {});
    await manager.installUpdate(async () => true, stop);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(backend.quitAndInstall).toHaveBeenCalledWith(true, true);
    expect(stop.mock.invocationCallOrder[0]).toBeLessThan(backend.quitAndInstall.mock.invocationCallOrder[0]);
  });

  it("does not install before the download is ready", async () => {
    const confirm = jest.fn();
    await manager.installUpdate(confirm, jest.fn());
    expect(confirm).not.toHaveBeenCalled();
    expect(backend.quitAndInstall).not.toHaveBeenCalled();
  });

  it("prevents duplicate restart prompts and installs", async () => {
    backend.emit("update-downloaded", { version: "0.1.1" });
    let resolve!: (value: boolean) => void;
    const confirm = jest.fn(
      () =>
        new Promise<boolean>((done) => {
          resolve = done;
        })
    );
    const first = manager.installUpdate(confirm, async () => {});
    await manager.installUpdate(confirm, async () => {});
    expect(confirm).toHaveBeenCalledTimes(1);
    resolve(true);
    await first;
    expect(backend.quitAndInstall).toHaveBeenCalledTimes(1);
  });

  it("keeps a ready update retryable when stopping the stream fails", async () => {
    backend.emit("update-downloaded", { version: "0.1.1" });
    await manager.installUpdate(
      async () => true,
      async () => {
        throw new Error("Stop failed");
      }
    );
    expect(manager.getState()).toMatchObject({
      phase: "downloaded",
      error: "重启更新失败，更新包已保留，请重试。"
    });
    expect(backend.quitAndInstall).not.toHaveBeenCalled();
  });

  it("provides snapshots and unsubscribes closed windows", () => {
    const listener = jest.fn();
    const unsubscribe = manager.subscribe(listener);
    const snapshot = manager.getState();
    snapshot.phase = "error";
    expect(manager.getState().phase).toBe("idle");
    backend.emit("update-downloaded", { version: "0.1.1" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    backend.emit("error", new Error("offline"));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not perform updates in unsupported runtimes", async () => {
    const unsupported = new UpdateManager(undefined, "0.1.0", "Install the Setup version");
    expect(await unsupported.checkForUpdates()).toMatchObject({
      phase: "unsupported",
      error: "Install the Setup version"
    });
  });

  it("reports an inaccessible feed without treating the check as up to date or leaking response headers", async () => {
    const error = Object.assign(
      new Error(
        '404 "method: GET url: https://github.com/salmoshu/Nav-Bridge/releases.atom\\nPlease double check that your authentication token is correct." Headers: { "set-cookie": "private-session" }'
      ),
      { statusCode: 404, code: "HTTP_ERROR_404" }
    );
    backend.checkForUpdates.mockRejectedValueOnce(error);
    expect(await manager.checkForUpdates()).toMatchObject({
      phase: "error",
      error: "更新源不可访问（404），请联系发布者检查更新地址和访问权限。"
    });
    backend.emit("error", error);
    expect(manager.getState().error).not.toMatch(/Headers|private-session|authentication token/);
    expect(backend.quitAndInstall).not.toHaveBeenCalled();
  });

  it("explains when a backend skips checks in an unsupported runtime", async () => {
    expect(await manager.checkForUpdates()).toMatchObject({
      phase: "unsupported",
      error: "当前运行方式不支持自动更新，请使用安装版。"
    });
  });
});
