import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../../..");

describe("preload build regression", () => {
  it("points the main-process preload path at the CJS artifact", () => {
    const windowOptionsSource = fs.readFileSync(path.join(repoRoot, "src/main/windowOptions.ts"), "utf-8");
    const match = windowOptionsSource.match(/preload:\s*join\(__dirname,\s*["']([^"']+)["']\)/);
    expect(match).toBeTruthy();
    const preloadPath = match![1];
    expect(preloadPath).toMatch(/\/index\.cjs$/);
    expect(preloadPath).not.toContain(".mjs");
  });

  it("points the monitor window preload path at the same CJS artifact", () => {
    const monitorSource = fs.readFileSync(path.join(repoRoot, "src/main/monitor/MonitorWindow.ts"), "utf-8");
    const match = monitorSource.match(/preload:\s*join\(__dirname,\s*["']([^"']+)["']\)/);
    expect(match).toBeTruthy();
    expect(match![1]).toMatch(/\/index\.cjs$/);
  });

  it("uses the same preload path for both main and monitor windows", () => {
    const windowOptionsSource = fs.readFileSync(path.join(repoRoot, "src/main/windowOptions.ts"), "utf-8");
    const monitorSource = fs.readFileSync(path.join(repoRoot, "src/main/monitor/MonitorWindow.ts"), "utf-8");
    const mainMatch = windowOptionsSource.match(/preload:\s*join\(__dirname,\s*["']([^"']+)["']\)/);
    const monitorMatch = monitorSource.match(/preload:\s*join\(__dirname,\s*["']([^"']+)["']\)/);
    expect(mainMatch).toBeTruthy();
    expect(monitorMatch).toBeTruthy();
    expect(mainMatch![1]).toBe(monitorMatch![1]);
  });

  it("forces the electron-vite preload output to index.cjs", () => {
    const configSource = fs.readFileSync(path.join(repoRoot, "electron.vite.config.ts"), "utf-8");
    const preloadMatch = configSource.match(/preload:\s*\{([\s\S]*?)\n\s*\},?\s*\n\s*renderer:/);
    expect(preloadMatch).toBeTruthy();
    const preloadBlock = preloadMatch![1];
    expect(preloadBlock).toMatch(/format:\s*["']cjs["']/);
    expect(preloadBlock).toMatch(/entryFileNames:\s*["']index\.cjs["']/);
  });

  it("does not emit a preload artifact with top-level imports", () => {
    const builtPreload = path.join(repoRoot, "out/preload/index.cjs");
    if (!fs.existsSync(builtPreload)) {
      // Source and config checks cover unbuilt workspaces.
      return;
    }

    const content = fs.readFileSync(builtPreload, "utf-8");
    expect(content).not.toMatch(/^import\s+/m);
    expect(content).not.toContain("index.mjs");
    expect(fs.existsSync(path.join(repoRoot, "out/preload/index.mjs"))).toBe(false);
  });
});
