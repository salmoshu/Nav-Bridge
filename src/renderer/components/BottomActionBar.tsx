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
    <Box sx={bottomActionBarSx}>
      <Stack direction="row" spacing={1.25} justifyContent="flex-end">
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
    </Box>
  );
}
