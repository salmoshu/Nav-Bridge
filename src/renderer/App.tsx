import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import { Alert, Box, Button, Container, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { defaultStreamConfig, type StreamConfig } from "../shared/stream";
import { ConnectionPanel } from "./components/ConnectionPanel";
import { LogView } from "./components/LogView";
import { StreamList } from "./components/StreamList";
import { useNavBridgeAPI } from "./hooks/useNavBridgeAPI";
import { useStreamStatus } from "./hooks/useStreamStatus";

export function App() {
  const api = useNavBridgeAPI();
  const { status, logs } = useStreamStatus();
  const [config, setConfig] = useState<StreamConfig>(defaultStreamConfig);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void api
      .loadConfig()
      .then(setConfig)
      .catch((loadError: unknown) => setError(String(loadError)));
  }, [api]);

  const start = async (): Promise<void> => {
    setError(undefined);
    const result = await api.startServer(config);
    if (!result.success) {
      setError(result.error ?? "启动失败");
    }
  };

  return (
    <Container maxWidth={false} sx={{ py: 2 }}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ md: "center" }}
          justifyContent="space-between"
          gap={1}
        >
          <Box>
            <Typography variant="h4">Nav-Bridge</Typography>
            <Typography color="text.secondary">
              GNSS/navigation stream bridge · 1 input to N outputs
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={() => void start()}
              disabled={status?.running}
            >
              启动
            </Button>
            <Button
              variant="outlined"
              startIcon={<StopIcon />}
              onClick={() => void api.stopServer()}
              disabled={!status?.running}
            >
              停止
            </Button>
          </Stack>
        </Stack>
        {error != undefined && <Alert severity="error">{error}</Alert>}
        <ConnectionPanel config={config} setConfig={setConfig} onSave={() => void api.saveConfig(config)} />
        <StreamList status={status} />
        <LogView logs={logs} />
      </Stack>
    </Container>
  );
}
