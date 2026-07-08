import { Alert, Box, Container, CssBaseline, Stack, ThemeProvider, useMediaQuery } from "@mui/material";
import { useEffect, useState } from "react";
import { defaultStreamConfig, type StreamConfig } from "../shared/stream";
import { AppTitleBar } from "./components/AppTitleBar";
import { BottomActionBar } from "./components/BottomActionBar";
import { EndpointTable } from "./components/EndpointTable";
import { LogView } from "./components/LogView";
import { OptionsDialog } from "./components/OptionsDialog";
import { useNavBridgeAPI } from "./hooks/useNavBridgeAPI";
import { useStreamStatus } from "./hooks/useStreamStatus";
import { createAppTheme } from "./theme";
import { loadThemeMode, resolveThemeMode, saveThemeMode, type ThemeMode } from "./lib/themeMode";

export function App() {
  const api = useNavBridgeAPI();
  const { status, logs } = useStreamStatus();
  const [config, setConfig] = useState<StreamConfig>(defaultStreamConfig);
  const [error, setError] = useState<string>();
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = createAppTheme(resolveThemeMode(themeMode, prefersDark));
  const running = status?.running ?? false;

  useEffect(() => {
    void api
      .loadConfig()
      .then(setConfig)
      .catch((loadError: unknown) => setError(String(loadError)));
  }, [api]);

  useEffect(() => {
    saveThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    return api.onAlwaysOnTopChange(setAlwaysOnTop);
  }, [api]);

  useEffect(() => {
    void api.saveConfig(config).catch((saveError: unknown) => setError(String(saveError)));
  }, [api, config]);

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
        <AppTitleBar
          running={running}
          alwaysOnTop={alwaysOnTop}
          themeMode={themeMode}
          onThemeChange={setThemeMode}
          onToggleAlwaysOnTop={() => void api.toggleAlwaysOnTop()}
        />

        <Box sx={{ flex: 1, overflow: "auto" }}>
          <Container maxWidth={false} sx={{ py: 1, px: 1.5 }}>
            <Stack spacing={1}>
              {error != undefined && (
                <Alert severity="error" sx={{ py: 0.25, fontSize: "0.75rem" }}>
                  {error}
                </Alert>
              )}

              <EndpointTable
                config={config}
                status={status}
                onChange={setConfig}
                onExport={() => void api.exportConfig(config)}
              />

              <LogView logs={logs} />
            </Stack>
          </Container>
        </Box>

        <BottomActionBar
          running={running}
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
