/** @jest-environment jsdom */
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppTitleBar } from "../../renderer/components/AppTitleBar";
import type { AppUpdateState } from "../../shared/update";

Object.defineProperty(globalThis, "__APP_VERSION__", { value: "0.1.0", configurable: true });

describe("application update controls", () => {
  let listener: (state: AppUpdateState) => void;
  const unsubscribe = jest.fn();
  const api = {
    getUpdateState: jest.fn(),
    checkForUpdates: jest.fn(),
    installUpdate: jest.fn(),
    onUpdateStateChange: jest.fn((callback) => {
      listener = callback;
      return unsubscribe;
    })
  };
  const idle: AppUpdateState = { phase: "idle", currentVersion: "0.1.0" };
  const ready: AppUpdateState = { ...idle, phase: "downloaded", availableVersion: "0.1.1", progress: 100 };
  beforeEach(() => {
    jest.clearAllMocks();
    api.getUpdateState.mockResolvedValue(idle);
    api.checkForUpdates.mockResolvedValue({ ...idle, phase: "checking" });
    api.installUpdate.mockResolvedValue(ready);
    Object.defineProperty(window, "navBridge", { value: api, configurable: true });
  });

  function showTitleBar() {
    return render(
      React.createElement(AppTitleBar, {
        alwaysOnTop: false,
        themeMode: "light",
        onThemeChange: jest.fn(),
        onToggleAlwaysOnTop: jest.fn()
      })
    );
  }

  it("checks when the version is clicked and displays the version change and download progress", async () => {
    showTitleBar();
    await userEvent.click(screen.getByRole("button", { name: "检查更新" }));
    await waitFor(() => expect(api.checkForUpdates).toHaveBeenCalledTimes(1));
    act(() => listener({ ...idle, phase: "downloading", availableVersion: "0.1.1", progress: 42 }));
    expect(screen.getByText("V0.1.0 -> V0.1.1")).toBeTruthy();
    expect(screen.getByText(/正在下载更新.*42%/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "更新" })).toBeNull();
  });

  it("shows the right-side update button only after the download completes", async () => {
    showTitleBar();
    await waitFor(() => expect(api.getUpdateState).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "更新" })).toBeNull();
    act(() => listener(ready));
    fireEvent.click(screen.getByRole("button", { name: "更新" }));
    await waitFor(() => expect(api.installUpdate).toHaveBeenCalledTimes(1));
  });

  it("restores the downloaded state when a window is reloaded", async () => {
    api.getUpdateState.mockResolvedValue(ready);
    const view = showTitleBar();
    await screen.findByRole("button", { name: "更新" });
    view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite a newer download event with an old startup snapshot", async () => {
    let resolve!: (state: AppUpdateState) => void;
    api.getUpdateState.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    showTitleBar();
    act(() => listener(ready));
    await act(async () => resolve(idle));
    expect(screen.getByRole("button", { name: "更新" })).toBeTruthy();
  });

  it("preserves a completed download if an earlier check response arrives late", async () => {
    let resolve!: (state: AppUpdateState) => void;
    api.checkForUpdates.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    showTitleBar();
    fireEvent.click(screen.getByRole("button", { name: "检查更新" }));
    act(() => listener(ready));
    await act(async () => resolve({ ...idle, phase: "downloading", availableVersion: "0.1.1" }));
    expect(screen.getByText("更新已下载完成，重启应用后即可安装。")).toBeTruthy();
    expect(screen.getByRole("button", { name: "更新" })).toBeTruthy();
  });

  it("reports a failed check and offers a retry", async () => {
    api.checkForUpdates.mockRejectedValueOnce(new Error("Network offline"));
    showTitleBar();
    fireEvent.click(screen.getByRole("button", { name: "检查更新" }));
    await screen.findByText("无法连接更新服务器，请检查网络后重试。");
    api.checkForUpdates.mockResolvedValue({ ...idle, phase: "not-available" });
    fireEvent.click(screen.getByRole("button", { name: "重新检查" }));
    await screen.findByText("当前已是最新版本。");
  });

  it("shows a concise update-source error and keeps the retry action available", async () => {
    api.checkForUpdates.mockResolvedValueOnce({
      ...idle,
      phase: "error",
      error: "更新源不可访问（404），请联系发布者检查更新地址和访问权限。"
    });
    showTitleBar();
    fireEvent.click(screen.getByRole("button", { name: "检查更新" }));
    await screen.findByText("更新源不可访问（404），请联系发布者检查更新地址和访问权限。");
    expect(screen.getByRole("button", { name: "重新检查" })).toBeTruthy();
    expect(screen.queryByText("当前已是最新版本。")).toBeNull();
  });
});
