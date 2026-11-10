import { ipcChannels } from "../../shared/ipc";
import { UpdateManager, type UpdateBackend } from "../../main/update/UpdateManager";
import { TestUpdateBackend } from "./updateTestBackend";

const mockHandlers = new Map<string, (...args: any[]) => any>();
const mockMessageBox = jest.fn();
jest.mock("electron", () => ({
  ipcMain: {
    removeHandler: (channel: string) => mockHandlers.delete(channel),
    handle: (channel: string, handler: (...args: any[]) => any) => mockHandlers.set(channel, handler)
  },
  dialog: { showMessageBox: mockMessageBox }
}));

import { UpdateIpcBridge } from "../../main/update/UpdateIpcBridge";

describe("update IPC", () => {
  let backend: TestUpdateBackend;
  let manager: UpdateManager;
  let bridge: UpdateIpcBridge;
  const window = { webContents: { isDestroyed: jest.fn(() => false), send: jest.fn() } };
  const stopStreams = jest.fn(async () => {});
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandlers.clear();
    backend = new TestUpdateBackend();
    manager = new UpdateManager(backend as unknown as UpdateBackend, "0.1.0");
    bridge = new UpdateIpcBridge(window as never, manager, stopStreams);
    bridge.register();
  });
  afterEach(() => bridge.dispose());

  function invoke(channel: string) {
    return mockHandlers.get(channel)!({ sender: window.webContents });
  }

  it("returns the current snapshot and pushes download progress", () => {
    backend.emit("update-available", { version: "0.1.1" });
    backend.emit("download-progress", { percent: 50 });
    expect(invoke(ipcChannels.getUpdateState)).toMatchObject({ phase: "downloading", progress: 50 });
    expect(window.webContents.send).toHaveBeenLastCalledWith(
      ipcChannels.updateStateChanged,
      expect.objectContaining({ progress: 50 })
    );
  });

  it("prompts to restart and leaves streams running when the user chooses later", async () => {
    backend.emit("update-downloaded", { version: "0.1.1" });
    mockMessageBox.mockResolvedValue({ response: 1 });
    await invoke(ipcChannels.installUpdate);
    expect(mockMessageBox).toHaveBeenCalledWith(
      window,
      expect.objectContaining({ message: "重启应用以更新", cancelId: 1 })
    );
    expect(stopStreams).not.toHaveBeenCalled();
    expect(backend.quitAndInstall).not.toHaveBeenCalled();
  });

  it("installs the downloaded version after the restart confirmation", async () => {
    backend.emit("update-downloaded", { version: "0.1.1" });
    mockMessageBox.mockResolvedValue({ response: 0 });
    await invoke(ipcChannels.installUpdate);
    expect(stopStreams).toHaveBeenCalledTimes(1);
    expect(backend.quitAndInstall).toHaveBeenCalledWith(true, true);
  });

  it("rejects update requests from another window", () => {
    expect(() => mockHandlers.get(ipcChannels.installUpdate)!({ sender: {} })).toThrow(
      "Invalid update IPC sender"
    );
  });

  it("removes handlers and subscriptions when the window closes", () => {
    bridge.dispose();
    backend.emit("update-downloaded", { version: "0.1.1" });
    expect(window.webContents.send).not.toHaveBeenCalled();
    expect(mockHandlers.has(ipcChannels.installUpdate)).toBe(false);
  });
});
