import { Box, Paper, Typography } from "@mui/material";
import type { LogEntry } from "../../shared/stream";

export function LogView({ logs }: { logs: LogEntry[] }) {
  return (
    <Paper variant="outlined" sx={{ p: 1, maxHeight: 120, overflow: "auto" }}>
      {logs.length === 0 ? (
        <Typography color="text.secondary" variant="caption" fontSize="0.6875rem">
          No logs
        </Typography>
      ) : (
        logs.map((log) => (
          <Box key={`${log.time}-${log.message}`} sx={{ fontFamily: "monospace", fontSize: 11, mb: 0.25 }}>
            <Typography component="span" color="text.secondary" fontSize="inherit">
              {new Date(log.time).toLocaleTimeString()} [{log.level}]
            </Typography>{" "}
            <Typography component="span" fontSize="inherit">
              {log.message}
            </Typography>
          </Box>
        ))
      )}
    </Paper>
  );
}
