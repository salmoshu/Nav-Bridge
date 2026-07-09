import { ipcChannels } from "../../shared/ipc";

const mockHandlers = new Map<string, (...args: unknown[]) => unknown>();
const mockRemoveHandler = jest.fn();
const mockHandle = jest.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
  mockHandlers.set(channel, handler);
});
const mockGetCursorScreenPoint = jest.fn(() => ({ x: 100, y: 200 }));

jest.mock("electron", () => ({
  dialog: {
    showSaveDialog: jest.fn()
  },
  ipcMain: {
    removeHandler: mockRemoveHandler,
    handle: mockHandle
  },
  screen: {
    getCursorScreenPoint: mockGetCursorScreenPoint
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
    save: jest.fn()
  }))
}));

import { IpcBridge } from "../../main/ipc/bridge";

describe("IpcBridge window resize", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockHandlers.clear();
    jest.clearAllMocks();
    mockGetCursorScreenPoint.mockReturnValue({ x: 100, y: 200 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("resizes vertically from the bottom edge without changing width", () => {
    const window = {
      close: jest.fn(),
      getBounds: jest.fn(() => ({ x: 10, y: 20, width: 560, height: 420 })),
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
    const bridge = new IpcBridge(window as never);

    bridge.register();
    mockGetCursorScreenPoint.mockReturnValueOnce({ x: 100, y: 200 });
    mockHandlers.get(ipcChannels.startWindowResize)?.({}, "bottom");
    mockGetCursorScreenPoint.mockReturnValue({ x: 140, y: 250 });
    jest.advanceTimersByTime(16);

    expect(window.setBounds).toHaveBeenCalledWith({ x: 10, y: 20, width: 560, height: 470 });
    expect(window.setResizable).not.toHaveBeenCalled();
  });

  it("resizes vertically from the top edge while keeping the bottom edge fixed", () => {
    const window = {
      close: jest.fn(),
      getBounds: jest.fn(() => ({ x: 10, y: 20, width: 560, height: 420 })),
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
    const bridge = new IpcBridge(window as never);

    bridge.register();
    mockGetCursorScreenPoint.mockReturnValueOnce({ x: 100, y: 200 });
    mockHandlers.get(ipcChannels.startWindowResize)?.({}, "top");
    mockGetCursorScreenPoint.mockReturnValue({ x: 140, y: 180 });
    jest.advanceTimersByTime(16);

    expect(window.setBounds).toHaveBeenCalledWith({ x: 10, y: 0, width: 560, height: 440 });
    expect(window.setResizable).not.toHaveBeenCalled();
  });

  it("toggles always-on-top for the main window and syncs the monitor window", () => {
    const window = {
      close: jest.fn(),
      getBounds: jest.fn(() => ({ x: 10, y: 20, width: 560, height: 420 })),
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
    const bridge = new IpcBridge(window as never);

    bridge.register();
    const result = mockHandlers.get(ipcChannels.toggleAlwaysOnTop)?.({});

    expect(result).toBe(true);
    expect(window.setAlwaysOnTop).toHaveBeenCalledWith(true);
    expect(window.webContents.send).toHaveBeenCalledWith(ipcChannels.windowAlwaysOnTop, true);
  });
});
