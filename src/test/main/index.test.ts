import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../../..");

describe("main window theme integration", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/main/index.ts"), "utf-8");

  it("loads the stored theme mode before creating the window", () => {
    expect(source).toContain("configStore.loadThemeMode()");
    expect(source).toContain("resolveThemeMode");
    expect(source).toContain("themeBackgroundColors");
    expect(source).toContain("nativeTheme.shouldUseDarkColors");
  });

  it("sets a themed background color on the main window", () => {
    expect(source).toContain("backgroundColor: themeBackgroundColors[resolvedMode]");
  });

  it("hides the window until the first paint to avoid flash", () => {
    expect(source).toContain("show: false");
    expect(source).toContain('"ready-to-show"');
    expect(source).toContain("mainWindow.show()");
  });

  it("passes the theme mode to the renderer as a query parameter", () => {
    expect(source).toContain("themeMode=${encodeURIComponent(themeMode)}");
    expect(source).toContain("{ query }");
  });
});
