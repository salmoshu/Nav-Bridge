import { resolveThemeMode, themeBackgroundColors, type ThemeMode } from "../../shared/theme";

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

describe("themeBackgroundColors", () => {
  it("matches the app theme backgrounds", () => {
    expect(themeBackgroundColors.dark).toBe("#14161b");
    expect(themeBackgroundColors.light).toBe("#f5f5f6");
  });

  it("contains an entry for every resolved theme mode", () => {
    const modes: Array<"light" | "dark"> = ["light", "dark"];
    for (const mode of modes) {
      expect(themeBackgroundColors[mode]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("ThemeMode type", () => {
  it("accepts the three supported mode literals", () => {
    const modes: ThemeMode[] = ["system", "light", "dark"];
    expect(modes).toContain("system");
    expect(modes).toContain("light");
    expect(modes).toContain("dark");
  });
});
