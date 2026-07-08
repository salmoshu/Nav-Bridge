import CloseIcon from "@mui/icons-material/Close";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import RemoveIcon from "@mui/icons-material/Remove";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { useNavBridgeAPI } from "../hooks/useNavBridgeAPI";
import { type ThemeMode } from "../lib/themeMode";
import { windowControlButtons } from "../lib/windowControls";
import { ThemeModeSelector } from "./ThemeModeSelector";

export interface AppTitleBarProps {
  running: boolean;
  alwaysOnTop: boolean;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onToggleAlwaysOnTop: () => void;
}

export function AppTitleBar({
  running,
  alwaysOnTop,
  themeMode,
  onThemeChange,
  onToggleAlwaysOnTop
}: AppTitleBarProps) {
  const api = useNavBridgeAPI();
  const dragging = useRef(false);

  const stopDrag = (): void => {
    if (!dragging.current) return;
    dragging.current = false;
    void api.stopWindowDrag();
  };

  useEffect(() => {
    const handleMouseUp = (): void => stopDrag();
    const handleBlur = (): void => stopDrag();
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("blur", handleBlur);
      stopDrag();
    };
  }, [api]);

  return (
    <Box
      data-testid="app-title-bar"
      sx={{
        height: 38,
        px: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider"
      }}
      onMouseDown={(event) => {
        // Only start dragging when pressing the header itself or the title area,
        // not the interactive controls on the right.
        const target = event.target as HTMLElement;
        const controls = target.closest("[data-header-controls]");
        if (controls != undefined) return;
        dragging.current = true;
        void api.startWindowDrag(event.clientX, event.clientY);
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.primary" noWrap fontSize="0.8125rem">
          Nav-Bridge
        </Typography>
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            bgcolor: running ? "success.main" : "text.disabled"
          }}
        />
      </Stack>

      <Stack
        data-header-controls
        direction="row"
        spacing={0.5}
        alignItems="center"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <ThemeModeSelector mode={themeMode} onChange={onThemeChange} />

        {windowControlButtons.map((button) => {
          const isAlwaysOnTop = button.id === "toggleAlwaysOnTop";
          const label = isAlwaysOnTop ? (alwaysOnTop ? "Unpin" : button.label) : button.label;
          return (
            <Tooltip key={button.id} title={label}>
              <IconButton
                size="small"
                aria-label={isAlwaysOnTop ? `${label} window` : `${button.label} window`}
                onClick={() => {
                  if (button.id === "minimize") {
                    void api.minimizeWindow();
                  } else if (button.id === "toggleAlwaysOnTop") {
                    onToggleAlwaysOnTop();
                  } else if (button.id === "close") {
                    void api.closeWindow();
                  }
                }}
                sx={{
                  color: "text.primary",
                  bgcolor: isAlwaysOnTop && alwaysOnTop ? "action.selected" : "transparent",
                  "&:hover": {
                    bgcolor: button.id === "close" ? "error.main" : "action.hover",
                    color: button.id === "close" ? "error.contrastText" : "text.primary"
                  }
                }}
              >
                {button.id === "minimize" && <RemoveIcon fontSize="small" />}
                {button.id === "toggleAlwaysOnTop" &&
                  (alwaysOnTop ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />)}
                {button.id === "close" && <CloseIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          );
        })}
      </Stack>
    </Box>
  );
}
