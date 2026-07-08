import { Box, Container, CssBaseline, Stack, ThemeProvider, useMediaQuery } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { defaultStreamConfig, type StreamConfig } from "../shared/stream";
import { AppTitleBar } from "./components/AppTitleBar";
import { BottomActionBar } from "./components/BottomActionBar";
import { DataDialog } from "./components/DataDialog";
import { EndpointTable } from "./components/EndpointTable";
import { ErrorAlert } from "./components/ErrorAlert";
import { LogDialog } from "./components/LogDialog";
import { OptionsDialog } from "./components/OptionsDialog";
import { WindowResizeHandles } from "./components/WindowResizeHandles";
import { useNavBridgeAPI } from "./hooks/useNavBridgeAPI";
import { useStreamStatus } from "./hooks/useStreamStatus";
import { buildStatusMap } from "./lib/endpointStatus";
import { createAppTheme } from "./theme";
import { loadThemeMode, resolveThemeMode, saveThemeMode, type ThemeMode } from "./lib/themeMode";

const CONFIG_STORAGE_KEY = "nav-bridge:config";

function loadStoredConfig(): StreamConfig | undefined {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw != undefined) {
      const parsed = JSON.parse(raw) as StreamConfig;
      if (parsed.version === defaultStreamConfig.version) {
        return parsed;
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return undefined;
}

export function App() {
  const api = useNavBridgeAPI();
  const { status, logs, dataEntries } = useStreamStatus();
  const [config, setConfig] = useState<StreamConfig>(() => loadStoredConfig() ?? defaultStreamConfig);
  const [error, setError] = useState<string>();
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [systemLogsOpen, setSystemLogsOpen] = useState(false);
  const [dataEndpointId, setDataEndpointId] = useState<string>();
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = createAppTheme(resolveThemeMode(themeMode, prefersDark));
  const running = status?.running ?? false;
  const statusMap = buildStatusMap(status);
  const dataEndpoint =
    dataEndpointId === config.input.id
      ? config.input
      : config.outputs.find((output) => output.id === dataEndpointId);
  const endpointDataEntries =
    dataEndpointId == undefined ? [] : dataEntries.filter((entry) => entry.endpointId === dataEndpointId);
  const clearError = useCallback((): void => setError(undefined), []);

  useEffect(() => {
    // Only fall back to the main-process store if there is no localStorage copy.
    if (loadStoredConfig() != undefined) {
      return;
    }
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
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore storage errors (e.g. private mode)
    }
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
        <WindowResizeHandles />
        <AppTitleBar
          alwaysOnTop={alwaysOnTop}
          themeMode={themeMode}
          onThemeChange={setThemeMode}
          onToggleAlwaysOnTop={() => void api.toggleAlwaysOnTop()}
        />

        <Box sx={{ flex: 1, overflow: "auto" }}>
          <Container maxWidth={false} sx={{ py: 1, px: 1.5 }}>
            <Stack spacing={1}>
              {error != undefined && <ErrorAlert message={error} onClose={clearError} />}

              <EndpointTable
                config={config}
                status={status}
                onChange={setConfig}
                onExport={() => void api.exportConfig(config)}
                onShowSystemLogs={() => setSystemLogsOpen(true)}
                onShowData={setDataEndpointId}
              />
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
      <LogDialog open={systemLogsOpen} logs={logs} onClose={() => setSystemLogsOpen(false)} />
      <DataDialog
        open={dataEndpointId != undefined}
        endpoint={dataEndpoint}
        metric={dataEndpointId != undefined ? statusMap[dataEndpointId] : undefined}
        entries={endpointDataEntries}
        onClose={() => setDataEndpointId(undefined)}
      />
    </ThemeProvider>
  );
}
