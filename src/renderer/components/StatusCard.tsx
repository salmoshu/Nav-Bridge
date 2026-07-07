import CircleIcon from "@mui/icons-material/Circle";
import { Box, Paper, Stack, Typography } from "@mui/material";
import type { StreamMetric } from "../../shared/stream";

const statusColor = {
  idle: "#8a8f98",
  connecting: "#f5c542",
  connected: "#66d17a",
  error: "#ff6b6b"
} as const;

export function StatusCard({ title, metric }: { title: string; metric: StreamMetric }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <CircleIcon sx={{ fontSize: 12, color: statusColor[metric.status] }} />
          <Typography variant="subtitle2">{title}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {metric.type} · {metric.status}
        </Typography>
        <Typography variant="h6">{metric.bytes.toLocaleString()} bytes</Typography>
        <Typography variant="body2" color="text.secondary">
          {metric.bps.toLocaleString()} bps
        </Typography>
        {metric.error != undefined && (
          <Typography variant="caption" color="error">
            {metric.error}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
