import { CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { resolveThemeMode, type ThemeMode } from "../shared/theme";
import { MonitorApp } from "./components/MonitorApp";
import { useMonitorData } from "./hooks/useMonitorData";
import { useNavBridgeAPI } from "./hooks/useNavBridgeAPI";
import { createAppTheme } from "./theme";

function readInitialThemeMode(): ThemeMode {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("themeMode");
  if (mode === "light" || mode === "dark" || mode === "system") {
    return mode;
  }
  return "system";
}

function MonitorRoot(): JSX.Element {
  const api = useNavBridgeAPI();
  const { status, logs, dataEntries, clear } = useMonitorData();
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readInitialThemeMode());
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = createAppTheme(resolveThemeMode(themeMode, prefersDark));

  useEffect(() => {
    return api.onThemeModeChange((mode) => {
      setThemeMode(mode);
    });
  }, [api]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MonitorApp
        status={status}
        logs={logs}
        dataEntries={dataEntries}
        onClear={clear}
        onClose={() => void api.closeMonitorWindow()}
      />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MonitorRoot />
  </React.StrictMode>
);
