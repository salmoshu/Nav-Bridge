import { ipcChannels } from "../../shared/ipc";

describe("ipcChannels", () => {
  it("includes the serial-port listing channel", () => {
    expect(ipcChannels.listSerialPorts).toBe("nav-bridge:list-serial-ports");
  });

  it("includes window control channels", () => {
    expect(ipcChannels.minimizeWindow).toBe("nav-bridge:window-minimize");
    expect(ipcChannels.closeWindow).toBe("nav-bridge:window-close");
    expect(ipcChannels.startWindowResize).toBe("nav-bridge:window-resize-start");
    expect(ipcChannels.stopWindowResize).toBe("nav-bridge:window-resize-stop");
  });

  it("does not expose JS title-bar drag channels", () => {
    expect("startWindowDrag" in ipcChannels).toBe(false);
    expect("stopWindowDrag" in ipcChannels).toBe(false);
  });

  it("includes always-on-top channel", () => {
    expect(ipcChannels.toggleAlwaysOnTop).toBe("nav-bridge:window-toggle-always-on-top");
    expect(ipcChannels.windowAlwaysOnTop).toBe("nav-bridge:window-always-on-top");
  });

  it("includes the per-endpoint data stream channel", () => {
    expect(ipcChannels.data).toBe("nav-bridge:data");
  });
});
