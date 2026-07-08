import BrightnessAutoIcon from "@mui/icons-material/BrightnessAuto";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import {
  FormControl,
  MenuItem,
  Select,
  Stack,
  Typography,
  type SelectChangeEvent
} from "@mui/material";
import type { ThemeMode } from "../lib/themeMode";

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
    icon: <BrightnessAutoIcon fontSize="small" />
  },
  {
    value: "light",
    label: "浅色",
    description: "始终使用浅色主题",
    icon: <LightModeIcon fontSize="small" />
  },
  {
    value: "dark",
    label: "深色",
    description: "始终使用深色主题",
    icon: <DarkModeIcon fontSize="small" />
  }
];

export function ThemeModeSelector({
  mode,
  onChange
}: {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}) {
  const handleChange = (event: SelectChangeEvent<ThemeMode>): void => {
    onChange(event.target.value as ThemeMode);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 40 }}>
      <Select<ThemeMode>
        value={mode}
        onChange={handleChange}
        aria-label="theme mode"
        variant="outlined"
        renderValue={(selected) => {
          const option = themeOptions.find((o) => o.value === selected);
          return option?.icon ?? null;
        }}
        sx={{
          fontSize: "0.8125rem",
          "& .MuiSelect-select": {
            py: 0.25,
            px: 0.75,
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
