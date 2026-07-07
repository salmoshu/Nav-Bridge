import { Box, Paper, Typography } from "@mui/material";
import type { LogEntry } from "../../shared/stream";

export function LogView({ logs }: { logs: LogEntry[] }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, minHeight: 180, maxHeight: 260, overflow: "auto" }}>
      {logs.length === 0 ? (
        <Typography color="text.secondary">暂无日志</Typography>
      ) : (
        logs.map((log) => (
          <Box key={`${log.time}-${log.message}`} sx={{ fontFamily: "monospace", fontSize: 13, mb: 0.75 }}>
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
