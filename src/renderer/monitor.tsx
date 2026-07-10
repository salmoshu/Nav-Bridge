import { CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import { MonitorApp } from "./components/MonitorApp";
import { useMonitorData } from "./hooks/useMonitorData";
import { useNavBridgeAPI } from "./hooks/useNavBridgeAPI";
import { createAppTheme } from "./theme";
import { loadThemeMode, resolveThemeMode } from "./lib/themeMode";

function MonitorRoot(): JSX.Element {
  const api = useNavBridgeAPI();
  const { status, logs, dataEntries, clear } = useMonitorData();
  const themeMode = loadThemeMode();
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = createAppTheme(resolveThemeMode(themeMode, prefersDark));

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
