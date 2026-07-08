import { ipcChannels } from "../../shared/ipc";
import { defaultStreamConfig, type StreamConfig } from "../../shared/stream";
import net from "node:net";

const mockHandlers = new Map<string, (...args: unknown[]) => unknown>();
const mockRemoveHandler = jest.fn();
const mockHandle = jest.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
  mockHandlers.set(channel, handler);
});
const mockShowSaveDialog = jest.fn();
const mockSave = jest.fn();

jest.mock("electron", () => ({
  dialog: {
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
    save: mockSave
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

  async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (predicate()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("Timed out waiting for condition");
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
    const sourceServer = net.createServer((socket) => {
      socket.write(Buffer.from("bridge-data"));
    });
    await new Promise<void>((resolve) => sourceServer.listen(0, "127.0.0.1", resolve));
    const address = sourceServer.address();
    if (typeof address === "string" || address == undefined) {
      throw new Error("Expected TCP address object");
    }

    const window = createWindow();
    const bridge = new IpcBridge(window as never);
    bridge.register();
    const handler = mockHandlers.get(ipcChannels.startServer);
    expect(handler).toBeDefined();

    const config: StreamConfig = {
      ...defaultStreamConfig,
      input: {
        id: "input",
        type: "tcp-client",
        enabled: true,
        params: { host: "127.0.0.1", port: address.port }
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
        ([channel, payload]) => channel === ipcChannels.data && payload.endpointId === "input"
      )
    );

    expect(window.webContents.send).toHaveBeenCalledWith(
      ipcChannels.data,
      expect.objectContaining({ endpointId: "input", bytes: 11, preview: "62 72 69 64 67 65 2d 64 61 74 61" })
    );
    expect(window.webContents.send).not.toHaveBeenCalledWith(
      ipcChannels.log,
      expect.objectContaining({ message: expect.stringContaining("Data input") })
    );
    expect(
      window.webContents.send.mock.calls.some(
        ([channel, payload]) => channel === ipcChannels.status && payload.input.bytes > 0
      )
    ).toBe(true);
    expect(window.webContents.send).toHaveBeenCalledWith(
      ipcChannels.log,
      expect.objectContaining({ message: expect.stringContaining("Input connected") })
    );
    expect(window.webContents.send).toHaveBeenCalledWith(
      ipcChannels.log,
      expect.objectContaining({ message: expect.stringContaining("First data from input") })
    );

    const stopHandler = mockHandlers.get(ipcChannels.stopServer);
    await stopHandler?.({});
    await new Promise<void>((resolve) => sourceServer.close(() => resolve()));
  });
});
