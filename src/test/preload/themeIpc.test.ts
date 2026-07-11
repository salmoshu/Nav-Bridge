import fs from "node:fs";
import path from "node:path";
import { ipcChannels } from "../../shared/ipc";

const repoRoot = path.resolve(__dirname, "../../..");

describe("preload theme mode IPC", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/preload/index.ts"), "utf-8");

  it("exposes loadThemeMode, saveThemeMode and onThemeModeChange", () => {
    expect(source).toContain("loadThemeMode:");
    expect(source).toContain("saveThemeMode:");
    expect(source).toContain("onThemeModeChange:");
  });

  it("uses the correct IPC channels", () => {
    expect(source).toContain("ipcChannels.loadThemeMode");
    expect(source).toContain("ipcChannels.saveThemeMode");
    expect(source).toContain("ipcChannels.themeModeChanged");
  });
});
