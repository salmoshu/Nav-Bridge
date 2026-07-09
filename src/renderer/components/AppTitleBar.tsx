import CloseIcon from "@mui/icons-material/Close";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import RemoveIcon from "@mui/icons-material/Remove";
import { Box, IconButton, Stack, Tooltip, Typography, useTheme } from "@mui/material";
import { useNavBridgeAPI } from "../hooks/useNavBridgeAPI";
import { type ThemeMode } from "../lib/themeMode";
import { windowControlButtons } from "../lib/windowControls";
import { ThemeModeSelector } from "./ThemeModeSelector";

function ElectronLogoPlaceholder({ size = 18 }: { size?: number }) {
  const theme = useTheme();
  const logoBlue = theme.palette.primary.main;

  return (
    <Box
      component="svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={logoBlue}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" fill={logoBlue} stroke="none" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(0 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    </Box>
  );
}

export interface AppTitleBarProps {
  alwaysOnTop: boolean;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onToggleAlwaysOnTop: () => void;
}

export function AppTitleBar({
  alwaysOnTop,
  themeMode,
  onThemeChange,
  onToggleAlwaysOnTop
}: AppTitleBarProps) {
  const api = useNavBridgeAPI();
  const theme = useTheme();

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
        borderColor: "divider",
        WebkitAppRegion: "drag",
        appRegion: "drag"
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <ElectronLogoPlaceholder />
        <Box sx={{ display: "inline-flex", alignItems: "baseline", gap: 0.5 }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.primary" noWrap fontSize="0.8125rem">
            Nav-Bridge
          </Typography>
          <Typography component="span" variant="caption" color="text.secondary" fontSize="0.6875rem">
            V{__APP_VERSION__}
          </Typography>
        </Box>
      </Stack>

      <Stack
        data-header-controls
        direction="row"
        spacing={0.5}
        alignItems="center"
        sx={{ WebkitAppRegion: "no-drag", appRegion: "no-drag" }}
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
                  p: 0.375,
                  color:
                    isAlwaysOnTop && alwaysOnTop
                      ? theme.palette.mode === "dark"
                        ? "common.white"
                        : "common.black"
                      : "text.primary",
                  bgcolor: "transparent",
                  "&:hover": {
                    bgcolor: button.id === "close" ? "error.main" : "action.hover",
                    color: button.id === "close" ? "error.contrastText" : "text.primary"
                  }
                }}
              >
                {button.id === "minimize" && <RemoveIcon sx={{ fontSize: 16 }} />}
                {button.id === "toggleAlwaysOnTop" &&
                  (alwaysOnTop ? (
                    <PushPinIcon sx={{ fontSize: 16 }} />
                  ) : (
                    <PushPinOutlinedIcon sx={{ fontSize: 16 }} />
                  ))}
                {button.id === "close" && <CloseIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            </Tooltip>
          );
        })}
      </Stack>
    </Box>
  );
}
