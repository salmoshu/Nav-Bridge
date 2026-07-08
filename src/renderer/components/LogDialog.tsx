import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { useEffect, useRef } from "react";
import type { LogEntry, StreamEndpoint, StreamMetric } from "../../shared/stream";
import { formatEndpointType, formatLogDialogTitle } from "../lib/endpointConfig";

const levelColors: Record<LogEntry["level"], string> = {
  info: "text.secondary",
  warn: "warning.main",
  error: "error.main"
};

function statusColor(status: string): "default" | "success" | "warning" | "error" {
  switch (status) {
    case "connected":
      return "success";
    case "connecting":
      return "warning";
    case "error":
      return "error";
    default:
      return "default";
  }
}

function formatLogTime(time: string): string {
  const date = new Date(time);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${String(date.getMilliseconds()).padStart(3, "0")}`;
}

export function LogDialog({
  open,
  endpoint,
  metric,
  logs,
  onClose
}: {
  open: boolean;
  endpoint?: StreamEndpoint;
  metric?: StreamMetric;
  logs: LogEntry[];
  onClose: () => void;
}) {
  const latestLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      latestLogRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [logs.length, open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ py: 1, pr: 5, fontSize: "0.875rem", fontWeight: 700 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          {endpoint != undefined && (
            <Chip size="small" label={formatEndpointType(endpoint.type)} variant="outlined" />
          )}
          <span>{formatLogDialogTitle(endpoint)}</span>
        </Stack>
        <IconButton
          aria-label="Close logs"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 6, p: 0.5 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1, pb: 1.5 }}>
        <Stack spacing={1}>
          <Paper variant="outlined" sx={{ p: 1 }}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={`Status: ${metric?.status ?? "idle"}`}
                color={statusColor(metric?.status ?? "idle")}
              />
              <Chip size="small" label={`Bytes: ${(metric?.bytes ?? 0).toLocaleString()}`} />
              <Chip size="small" label={`BPS: ${(metric?.bps ?? 0).toLocaleString()}`} />
            </Stack>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 1,
              maxHeight: 320,
              overflow: "auto",
              bgcolor: "background.default"
            }}
          >
            {logs.length === 0 ? (
              <Typography color="text.secondary" variant="caption" fontSize="0.6875rem">
                No logs
              </Typography>
            ) : (
              logs.map((log, index) => (
                <Box
                  key={`${log.time}-${log.message}-${index}`}
                  ref={index === 0 ? latestLogRef : undefined}
                  sx={{
                    py: 0.375,
                    px: 0.5,
                    borderRadius: 1,
                    bgcolor: index % 2 === 0 ? "transparent" : "action.hover"
                  }}
                >
                  <Stack direction="row" spacing={0.75} alignItems="flex-start">
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: "text.secondary",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {formatLogTime(log.time)}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        fontWeight: 600,
                        color: levelColors[log.level],
                        whiteSpace: "nowrap"
                      }}
                    >
                      [{log.level.toUpperCase()}]
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        wordBreak: "break-all"
                      }}
                    >
                      {log.message}
                    </Typography>
                  </Stack>
                </Box>
              ))
            )}
          </Paper>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
