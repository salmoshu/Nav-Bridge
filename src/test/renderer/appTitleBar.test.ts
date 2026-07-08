import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../../..");

describe("AppTitleBar", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/renderer/components/AppTitleBar.tsx"), "utf-8");

  it("does not render a status dot next to the Nav-Bridge title", () => {
    expect(source).toContain("Nav-Bridge");
    expect(source).not.toContain('borderRadius: "50%"');
    expect(source).not.toContain("success.main");
  });

  it("does not expose a running prop", () => {
    expect(source).not.toContain("running");
  });

  it("renders the logo placeholder and version text next to the title", () => {
    expect(source).toContain("ElectronLogoPlaceholder");
    expect(source).toContain("__APP_VERSION__");
    expect(source).not.toContain('APP_VERSION = "V0.0.1-20260708"');
  });

  it("uses icon color only for the active always-on-top state without a circular background", () => {
    expect(source).toContain('isAlwaysOnTop && alwaysOnTop ? "common.black" : "text.primary"');
    expect(source).not.toContain('bgcolor: isAlwaysOnTop && alwaysOnTop ? "action.selected"');
    expect(source).toContain('bgcolor: "transparent"');
  });
});
