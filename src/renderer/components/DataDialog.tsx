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
import type { StreamDataEntry, StreamEndpoint, StreamMetric } from "../../shared/stream";
import { endpointInfo, formatEndpointType } from "../lib/endpointConfig";

const metricChipSx = { borderRadius: 1 } as const;

function formatDataTime(time: string): string {
  const date = new Date(time);
  return date.toLocaleTimeString();
}

export function DataDialog({
  open,
  endpoint,
  metric,
  entries,
  onClose
}: {
  open: boolean;
  endpoint?: StreamEndpoint;
  metric?: StreamMetric;
  entries: StreamDataEntry[];
  onClose: () => void;
}) {
  const latestEntryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      latestEntryRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [entries.length, open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ py: 1, pr: 5, fontSize: "0.875rem", fontWeight: 700 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          {endpoint != undefined && (
            <Chip size="small" label={formatEndpointType(endpoint.type)} variant="outlined" sx={metricChipSx} />
          )}
          <span>{endpoint == undefined ? "Data" : `Data for ${endpointInfo(endpoint)}`}</span>
        </Stack>
        <IconButton
          aria-label="Close data"
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
                color={metric?.status === "connected" ? "success" : metric?.status === "error" ? "error" : "default"}
                sx={metricChipSx}
              />
              <Chip
                size="small"
                label={`Bytes: ${(metric?.bytes ?? 0).toLocaleString()}`}
                sx={metricChipSx}
              />
              <Chip size="small" label={`BPS: ${(metric?.bps ?? 0).toLocaleString()}`} sx={metricChipSx} />
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
            {entries.length === 0 ? (
              <Typography color="text.secondary" variant="caption" fontSize="0.6875rem">
                No data
              </Typography>
            ) : (
              entries.map((entry, index) => (
                <Box
                  key={`${entry.time}-${entry.endpointId}-${index}`}
                  ref={index === 0 ? latestEntryRef : undefined}
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
                      {formatDataTime(entry.time)}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        fontWeight: 600,
                        color: entry.direction === "input" ? "primary.main" : "secondary.main",
                        whiteSpace: "nowrap"
                      }}
                    >
                      [{entry.direction.toUpperCase()}]
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: "text.secondary",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {entry.bytes} bytes
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        wordBreak: "break-all"
                      }}
                    >
                      {entry.preview}
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
