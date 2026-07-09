import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SettingsIcon from "@mui/icons-material/Settings";
import StopIcon from "@mui/icons-material/Stop";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import type { StreamStatus } from "../../shared/stream";
import { useSmoothUptime } from "../hooks/useSmoothUptime";
import { getBottomActions } from "../lib/bottomActions";
import { BOTTOM_ACTION_BAR_HEIGHT } from "../../shared/windowMetrics";
import { buildStatusLine } from "../lib/connectionStatusText";

export interface BottomActionBarProps {
  running: boolean;
  status?: StreamStatus;
  onStartStop: () => void;
  onOptions: () => void;
  onExit: () => void;
}

export const bottomActionBarSx = {
  px: 1,
  py: 1.25,
  borderTop: 1,
  borderColor: "divider",
  bgcolor: "background.paper"
} as const;

export const bottomActionButtonSx = {
  display: "inline-flex",
  alignItems: "center",
  minWidth: 58,
  height: 24,
  fontSize: "0.7rem",
  lineHeight: 1,
  px: 1,
  py: 0.125,
  "& .MuiButton-startIcon": { mr: 0.125 }
} as const;

export function BottomActionBar({ running, status, onStartStop, onOptions, onExit }: BottomActionBarProps) {
  const actions = getBottomActions(running);
  const inputUptime = useSmoothUptime(status);
  const statusText = buildStatusLine(status, inputUptime);

  const handlers: Record<string, () => void> = {
    startStop: onStartStop,
    options: onOptions,
    exit: onExit
  };

  const icons: Record<string, ReactNode> = {
    startStop: running ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />,
    options: <SettingsIcon fontSize="small" />,
    exit: <CloseIcon fontSize="small" />
  };

  return (
    <Box sx={{ ...bottomActionBarSx, height: BOTTOM_ACTION_BAR_HEIGHT, boxSizing: "border-box" }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Paper
          variant="outlined"
          title={statusText}
          sx={{
            px: 1,
            py: 0.375,
            bgcolor: "background.default",
            borderColor: "divider",
            overflow: "hidden",
            flex: 1,
            minWidth: 0
          }}
        >
          <Typography
            variant="caption"
            noWrap
            sx={{
              fontSize: "0.7rem",
              fontFamily: "monospace",
              fontVariantNumeric: "tabular-nums",
              color: "text.secondary",
              display: "block"
            }}
          >
            {statusText}
          </Typography>
        </Paper>
        <Stack direction="row" spacing={1.25}>
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant}
              size="small"
              disabled={action.disabled}
              startIcon={icons[action.id]}
              onClick={handlers[action.id]}
              sx={bottomActionButtonSx}
            >
              {action.label}
            </Button>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
