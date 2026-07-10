import { Box, Container, CssBaseline, Stack, ThemeProvider, useMediaQuery } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { defaultStreamConfig, type StreamConfig } from "../shared/stream";
import { AppTitleBar } from "./components/AppTitleBar";
import { BottomActionBar } from "./components/BottomActionBar";
import { EndpointTable } from "./components/EndpointTable";
import { ErrorAlert } from "./components/ErrorAlert";
import { OptionsDialog } from "./components/OptionsDialog";
import { WindowResizeHandles } from "./components/WindowResizeHandles";
import { useNavBridgeAPI } from "./hooks/useNavBridgeAPI";
import { useStreamStatus } from "./hooks/useStreamStatus";
import { createAppTheme } from "./theme";
import { loadThemeMode, resolveThemeMode, saveThemeMode, type ThemeMode } from "./lib/themeMode";

export function App() {
  const api = useNavBridgeAPI();
  const { status } = useStreamStatus();
  const [config, setConfig] = useState<StreamConfig>(defaultStreamConfig);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [error, setError] = useState<string>();
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = createAppTheme(resolveThemeMode(themeMode, prefersDark));
  const running = status?.running ?? false;
  const clearError = useCallback((): void => setError(undefined), []);

  useEffect(() => {
    void api
      .loadConfig()
      .then((loadedConfig) => {
        setConfig(loadedConfig);
        setConfigLoaded(true);
      })
      .catch((loadError: unknown) => setError(String(loadError)));
  }, [api]);

  useEffect(() => {
    saveThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    return api.onAlwaysOnTopChange(setAlwaysOnTop);
  }, [api]);

  useEffect(() => {
    if (!configLoaded) {
      return;
    }
    void api.saveConfig(config).catch((saveError: unknown) => setError(String(saveError)));
  }, [api, config, configLoaded]);

  const handleStartStop = async (): Promise<void> => {
    if (running) {
      await api.stopServer();
      return;
    }
    setError(undefined);
    const result = await api.startServer(config);
    if (!result.success) {
      setError(result.error ?? "Failed to start server");
    }
  };

  const handleOptionsSave = (options: StreamConfig["options"]): void => {
    setConfig((current) => ({ ...current, options }));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <WindowResizeHandles />
        <AppTitleBar
          alwaysOnTop={alwaysOnTop}
          themeMode={themeMode}
          onThemeChange={setThemeMode}
          onToggleAlwaysOnTop={() => void api.toggleAlwaysOnTop()}
        />

        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
            msOverflowStyle: "none"
          }}
        >
          <Container maxWidth={false} disableGutters sx={{ py: 1, px: 1.25 }}>
            <Stack spacing={1}>
              {error != undefined && <ErrorAlert message={error} onClose={clearError} />}

              <EndpointTable
                config={config}
                status={status}
                onChange={setConfig}
                onExport={() => void api.exportConfig(config)}
                onShowSystemLogs={() => void api.openMonitorWindow()}
              />
            </Stack>
          </Container>
        </Box>

        <BottomActionBar
          running={running}
          status={status}
          onStartStop={() => void handleStartStop()}
          onOptions={() => setOptionsOpen(true)}
          onExit={() => void api.closeWindow()}
        />
      </Box>

      <OptionsDialog
        open={optionsOpen}
        options={config.options}
        onClose={() => setOptionsOpen(false)}
        onSave={handleOptionsSave}
      />
    </ThemeProvider>
  );
}
