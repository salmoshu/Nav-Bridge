import { resolveThemeMode } from "../../renderer/lib/themeMode";

describe("ThemeModeSelector source", () => {
  it("uses the required option labels and no description text", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../../../src/renderer/components/ThemeModeSelector.tsx"),
      "utf-8"
    );

    expect(source).toContain('label: "跟随系统"');
    expect(source).toContain('label: "浅色模式"');
    expect(source).toContain('label: "深色模式"');
    expect(source).not.toContain("description:");
  });
});

describe("resolveThemeMode", () => {
  it("returns dark when mode is system and the system prefers dark", () => {
    expect(resolveThemeMode("system", true)).toBe("dark");
  });

  it("returns light when mode is system and the system prefers light", () => {
    expect(resolveThemeMode("system", false)).toBe("light");
  });

  it("preserves explicit light and dark choices", () => {
    expect(resolveThemeMode("light", true)).toBe("light");
    expect(resolveThemeMode("dark", false)).toBe("dark");
  });
});
