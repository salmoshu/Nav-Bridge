import { ipcChannels } from "../../shared/ipc";
import { defaultStreamConfig, type StreamConfig } from "../../shared/stream";
import net from "node:net";
import { listen, waitFor } from "../stream/networkHelpers";

const mockHandlers = new Map<string, (...args: unknown[]) => unknown>();
const mockRemoveHandler = jest.fn();
const mockHandle = jest.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
  mockHandlers.set(channel, handler);
});
const mockShowOpenDialog = jest.fn();
const mockShowSaveDialog = jest.fn();
const mockGetAppPath = jest.fn(() => "/app/path");
const mockSave = jest.fn();

jest.mock("electron", () => ({
  BrowserWindow: {
    getAllWindows: jest.fn(() => [])
  },
  app: {
    getAppPath: mockGetAppPath
  },
  dialog: {
    showOpenDialog: mockShowOpenDialog,
    showSaveDialog: mockShowSaveDialog
  },
  ipcMain: {
    removeHandler: mockRemoveHandler,
    handle: mockHandle
  },
  screen: {
    getCursorScreenPoint: jest.fn(() => ({ x: 0, y: 0 }))
  }
}));

jest.mock("serialport", () => ({
  SerialPort: {
    list: jest.fn(async () => [])
  }
}));

jest.mock("../../main/config/ConfigStore", () => ({
  ConfigStore: jest.fn().mockImplementation(() => ({
    load: jest.fn(),
    save: mockSave,
    loadThemeMode: jest.fn(() => "system"),
    saveThemeMode: jest.fn()
  }))
}));

import { IpcBridge } from "../../main/ipc/bridge";

describe("IpcBridge validation timing", () => {
  beforeEach(() => {
    mockHandlers.clear();
    jest.clearAllMocks();
  });

  function createWindow() {
    return {
      close: jest.fn(),
      getBounds: jest.fn(() => ({ x: 0, y: 0, width: 560, height: 420 })),
      isAlwaysOnTop: jest.fn(() => false),
      minimize: jest.fn(),
      setAlwaysOnTop: jest.fn(),
      setBounds: jest.fn(),
      setPosition: jest.fn(),
      setResizable: jest.fn(),
      webContents: {
        isDestroyed: jest.fn(() => false),
        send: jest.fn()
      }
    };
  }

  function serialInputWithoutPort(): StreamConfig {
    return {
      ...defaultStreamConfig,
      input: {
        ...defaultStreamConfig.input,
        type: "serial",
        params: {
          port: "",
          baudRate: 115200,
          dataBits: 8,
          parity: "none",
          stopBits: 1,
          flowControl: "none"
        }
      }
    };
  }

  it("saveConfig allows an empty serial port before Start", () => {
    const bridge = new IpcBridge(createWindow() as never);
    bridge.register();

    const handler = mockHandlers.get(ipcChannels.saveConfig);
    expect(handler).toBeDefined();
    expect(() => handler!({}, serialInputWithoutPort())).not.toThrow();
    expect(mockSave).toHaveBeenCalledWith(serialInputWithoutPort());
  });

  it("exportConfig allows an empty serial port before Start", async () => {
    mockShowSaveDialog.mockResolvedValue({ canceled: true });
    const bridge = new IpcBridge(createWindow() as never);
    bridge.register();

    const handler = mockHandlers.get(ipcChannels.exportConfig);
    expect(handler).toBeDefined();
    await expect(handler!({}, serialInputWithoutPort())).resolves.toBeUndefined();
  });

  it("startServer rejects an empty serial port", async () => {
    const bridge = new IpcBridge(createWindow() as never);
    bridge.register();

    const handler = mockHandlers.get(ipcChannels.startServer);
    expect(handler).toBeDefined();
    await expect(handler!({}, serialInputWithoutPort())).resolves.toEqual({
      success: false,
      error: "serial.port is required"
    });
  });

  it("sends status and data IPC events for TCP client input payloads", async () => {
    const clients = new Set<net.Socket>();
    const sourceServer = net.createServer((socket) => {
      clients.add(socket);
      socket.once("close", () => clients.delete(socket));
      socket.write(Buffer.from("bridge-data"));
    });
    const window = createWindow();
    const bridge = new IpcBridge(window as never);
    try {
      const port = await listen(sourceServer);
      bridge.register();
      const handler = mockHandlers.get(ipcChannels.startServer);
      expect(handler).toBeDefined();

      const config: StreamConfig = {
        ...defaultStreamConfig,
        options: { ...defaultStreamConfig.options, statusInterval: 100 },
        input: {
          id: "input",
          type: "tcp-client",
          enabled: true,
          params: { host: "127.0.0.1", port }
        },
        outputs: [
          {
            id: "output-1",
            type: "udp-client",
            enabled: true,
            params: { host: "127.0.0.1", port: 2201 }
          }
        ]
      };

      await expect(handler!({}, config)).resolves.toEqual({ success: true });
      await waitFor(() =>
        window.webContents.send.mock.calls.some(
          ([channel, payload]) => channel === ipcChannels.data && Array.isArray(payload.data)
        )
      );
      await waitFor(() =>
        window.webContents.send.mock.calls.some(
          ([channel, payload]) => channel === ipcChannels.status && payload.input.bytes === 11
        )
      );

      expect(window.webContents.send).toHaveBeenCalledWith(
        ipcChannels.data,
        expect.objectContaining({ data: Buffer.from("bridge-data").toJSON().data })
      );
      expect(window.webContents.send).not.toHaveBeenCalledWith(
        ipcChannels.log,
        expect.objectContaining({ message: expect.stringContaining("Data input") })
      );
      expect(window.webContents.send).toHaveBeenCalledWith(
        ipcChannels.status,
        expect.objectContaining({ input: expect.objectContaining({ bytes: 11 }) })
      );
      expect(window.webContents.send).toHaveBeenCalledWith(
        ipcChannels.log,
        expect.objectContaining({ message: expect.stringContaining("Input connected") })
      );
      expect(window.webContents.send).toHaveBeenCalledWith(
        ipcChannels.log,
        expect.objectContaining({ message: expect.stringContaining("First data: 11 bytes") })
      );

      const stopHandler = mockHandlers.get(ipcChannels.stopServer);
      await stopHandler?.({});
    } finally {
      try {
        await bridge.dispose();
      } finally {
        for (const socket of clients) socket.destroy();
        if (sourceServer.listening) {
          await new Promise<void>((resolve, reject) =>
            sourceServer.close((error) => (error ? reject(error) : resolve()))
          );
        }
      }
    }
  });

  it("showFileDialog uses an open dialog for input mode and defaults to the app path", async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ["/data/capture.rtcm3"] });
    const bridge = new IpcBridge(createWindow() as never);
    bridge.register();

    const handler = mockHandlers.get(ipcChannels.showFileDialog);
    expect(handler).toBeDefined();
    await expect(handler!({}, "input")).resolves.toBe("/data/capture.rtcm3");
    expect(mockGetAppPath).toHaveBeenCalled();
    expect(mockShowOpenDialog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ defaultPath: "/app/path", properties: ["openFile"] })
    );
  });

  it("showFileDialog uses the suggested path's directory when one is provided", async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ["/data/another.rtcm3"] });
    const bridge = new IpcBridge(createWindow() as never);
    bridge.register();

    const handler = mockHandlers.get(ipcChannels.showFileDialog);
    expect(handler).toBeDefined();
    await expect(handler!({}, "input", "/data/capture.rtcm3")).resolves.toBe("/data/another.rtcm3");
    expect(mockGetAppPath).not.toHaveBeenCalled();
    expect(mockShowOpenDialog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ defaultPath: "/data", properties: ["openFile"] })
    );
  });

  it("showFileDialog uses a save dialog for output mode", async () => {
    mockShowSaveDialog.mockResolvedValue({ canceled: false, filePath: "/data/output.rtcm3" });
    const bridge = new IpcBridge(createWindow() as never);
    bridge.register();

    const handler = mockHandlers.get(ipcChannels.showFileDialog);
    expect(handler).toBeDefined();
    await expect(handler!({}, "output")).resolves.toBe("/data/output.rtcm3");
    expect(mockShowSaveDialog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ defaultPath: "/app/path" })
    );
  });

  it("registers loadThemeMode and saveThemeMode handlers", () => {
    const bridge = new IpcBridge(createWindow() as never);
    bridge.register();

    expect(mockHandlers.get(ipcChannels.loadThemeMode)).toBeDefined();
    expect(mockHandlers.get(ipcChannels.saveThemeMode)).toBeDefined();
  });

  it("loadThemeMode returns the stored theme mode", () => {
    const bridge = new IpcBridge(createWindow() as never);
    bridge.register();

    const handler = mockHandlers.get(ipcChannels.loadThemeMode) as () => string;
    expect(handler()).toBe("system");
  });

  it("saveThemeMode stores the theme mode", async () => {
    const bridge = new IpcBridge(createWindow() as never);
    bridge.register();

    const handler = mockHandlers.get(ipcChannels.saveThemeMode) as (
      _event: { sender: { id: number } },
      mode: string
    ) => void;
    handler({ sender: { id: 1 } }, "dark");

    const store = (bridge as unknown as { configStore: { saveThemeMode: jest.Mock } }).configStore;
    expect(store.saveThemeMode).toHaveBeenCalledWith("dark");
  });
});
