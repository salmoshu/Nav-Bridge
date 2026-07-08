export type ThemeMode = "system" | "light" | "dark";

const storageKey = "nav-bridge:theme-mode";

export function resolveThemeMode(mode: ThemeMode, prefersDark: boolean): "light" | "dark" {
  if (mode === "system") {
    return prefersDark ? "dark" : "light";
  }
  return mode;
}

export function loadThemeMode(): ThemeMode {
  if (typeof window === "undefined" || window.localStorage == undefined) {
    return "system";
  }
  const stored = window.localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function saveThemeMode(mode: ThemeMode): void {
  if (typeof window === "undefined" || window.localStorage == undefined) {
    return;
  }
  window.localStorage.setItem(storageKey, mode);
}
