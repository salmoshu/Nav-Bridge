export type ThemeMode = "system" | "light" | "dark";

export function resolveThemeMode(mode: ThemeMode, prefersDark: boolean): "light" | "dark" {
  if (mode === "system") {
    return prefersDark ? "dark" : "light";
  }
  return mode;
}

export const themeBackgroundColors: Record<"light" | "dark", string> = {
  dark: "#14161b",
  light: "#f5f5f6"
};
