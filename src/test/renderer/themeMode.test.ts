import { resolveThemeMode } from "../../renderer/lib/themeMode";

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
