import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../../..");

describe("App configuration architecture", () => {
  const source = fs.readFileSync(path.join(repoRoot, "src/renderer/App.tsx"), "utf-8");

  it("uses the main-process config store as the single source of truth", () => {
    expect(source).toMatch(/api\s*\.\s*loadConfig\s*\(/);
    expect(source).toContain("api.saveConfig(config)");
    expect(source).not.toContain("CONFIG_STORAGE_KEY");
    expect(source).not.toContain("localStorage.getItem");
    expect(source).not.toContain("localStorage.setItem");
  });

  it("does not save the default config before the main-process config has loaded", () => {
    expect(source).toContain("configLoaded");
    expect(source).toContain("setConfigLoaded(true)");
  });
});
