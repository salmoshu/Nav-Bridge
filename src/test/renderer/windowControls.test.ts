import {
  type WindowControlId,
  windowControlButtons,
  getWindowControlButton
} from "../../renderer/lib/windowControls";

describe("windowControls", () => {
  it("exposes minimize, always-on-top and close buttons", () => {
    const ids = windowControlButtons.map((b) => b.id);
    expect(ids).toEqual<WindowControlId[]>(["minimize", "toggleAlwaysOnTop", "close"]);
  });

  it("assigns a unique IPC channel to each button", () => {
    const channels = windowControlButtons.map((b) => b.channel);
    expect(new Set(channels).size).toBe(channels.length);
    for (const channel of channels) {
      expect(channel).toMatch(/^nav-bridge:window-/);
    }
  });

  it("lookup returns the matching button or undefined", () => {
    expect(getWindowControlButton("minimize")?.label).toBe("Minimize");
    expect(getWindowControlButton("close")?.label).toBe("Close");
    expect(getWindowControlButton("toggleAlwaysOnTop")?.label).toBe("Always on top");
    expect(getWindowControlButton("unknown" as WindowControlId)).toBeUndefined();
  });
});
