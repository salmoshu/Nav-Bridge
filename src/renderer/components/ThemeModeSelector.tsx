import BrightnessAutoIcon from "@mui/icons-material/BrightnessAuto";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { FormControl, MenuItem, Select, Stack, Typography, type SelectChangeEvent } from "@mui/material";
import { useEffect, useState } from "react";
import type { ThemeMode } from "../lib/themeMode";

export const themeModeMenuProps = {
  disablePortal: true,
  PaperProps: {
    "data-theme-mode-menu": true,
    sx: {
      WebkitAppRegion: "no-drag",
      "& .MuiMenuItem-root": {
        minHeight: 28,
        py: 0.25
      }
    }
  },
  MenuListProps: {
    dense: true,
    sx: { py: 0.5 }
  }
} as const;

const themeOptions: {
  value: ThemeMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "system",
    label: "跟随系统",
    description: "根据系统外观自动切换",
    icon: <BrightnessAutoIcon sx={{ fontSize: 16 }} />
  },
  {
    value: "light",
    label: "浅色",
    description: "始终使用浅色主题",
    icon: <LightModeIcon sx={{ fontSize: 16 }} />
  },
  {
    value: "dark",
    label: "深色",
    description: "始终使用深色主题",
    icon: <DarkModeIcon sx={{ fontSize: 16 }} />
  }
];

export function ThemeModeSelector({
  mode,
  onChange
}: {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Element)) {
        setOpen(false);
        return;
      }
      if (
        target.closest("[data-theme-mode-selector]") != undefined ||
        target.closest("[data-theme-mode-menu]") != undefined
      ) {
        return;
      }
      setOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => window.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  const handleChange = (event: SelectChangeEvent<ThemeMode>): void => {
    onChange(event.target.value as ThemeMode);
    setOpen(false);
  };

  const handleClose = (): void => {
    setOpen(false);
  };

  return (
    <FormControl data-theme-mode-selector size="small" sx={{ minWidth: 32 }}>
      <Select<ThemeMode>
        value={mode}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={handleClose}
        onChange={handleChange}
        MenuProps={themeModeMenuProps}
        aria-label="theme mode"
        variant="outlined"
        renderValue={(selected) => {
          const option = themeOptions.find((o) => o.value === selected);
          return option?.icon ?? null;
        }}
        sx={{
          fontSize: "0.75rem",
          "& .MuiSelect-select": {
            py: 0.125,
            px: 0.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }
        }}
      >
        {themeOptions.map((option) => (
          <MenuItem key={option.value} value={option.value} dense>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%", pr: 1 }}>
              {option.icon}
              <Stack spacing={0}>
                <Typography variant="body2" fontSize="0.8125rem">
                  {option.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontSize="0.6875rem">
                  {option.description}
                </Typography>
              </Stack>
            </Stack>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
