import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SettingsIcon from "@mui/icons-material/Settings";
import StopIcon from "@mui/icons-material/Stop";
import { Box, Button, Stack } from "@mui/material";
import type { ReactNode } from "react";
import { getBottomActions } from "../lib/bottomActions";

export interface BottomActionBarProps {
  running: boolean;
  onStartStop: () => void;
  onOptions: () => void;
  onExit: () => void;
}

export function BottomActionBar({ running, onStartStop, onOptions, onExit }: BottomActionBarProps) {
  const actions = getBottomActions(running);

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
    <Box
      sx={{
        px: 1,
        py: 0.75,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper"
      }}
    >
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant}
            size="small"
            disabled={action.disabled}
            startIcon={icons[action.id]}
            onClick={handlers[action.id]}
            sx={{ minWidth: 64, fontSize: "0.75rem", px: 1.5, py: 0.5 }}
          >
            {action.label}
          </Button>
        ))}
      </Stack>
    </Box>
  );
}
