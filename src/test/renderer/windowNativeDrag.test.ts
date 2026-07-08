import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../../..");

describe("native title-bar drag", () => {
  it("uses Electron native app-region drag instead of JS window drag", () => {
    const source = fs.readFileSync(path.join(repoRoot, "src/renderer/components/AppTitleBar.tsx"), "utf-8");

    expect(source).toContain('WebkitAppRegion: "drag"');
    expect(source).toContain('WebkitAppRegion: "no-drag"');
    expect(source).not.toContain("startWindowDrag");
    expect(source).not.toContain("stopWindowDrag");
    expect(source).not.toContain("shouldStartWindowDrag");
  });

  it("does not move the window with main-process setPosition polling", () => {
    const source = fs.readFileSync(path.join(repoRoot, "src/main/ipc/bridge.ts"), "utf-8");

    expect(source).not.toContain("setPosition(");
  });
});
