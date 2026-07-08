import { createTheme, type Theme } from "@mui/material/styles";

export function createAppTheme(mode: "light" | "dark"): Theme {
  return createTheme({
    palette: {
      mode,
      background: {
        default: mode === "dark" ? "#111217" : "#f5f5f6",
        paper: mode === "dark" ? "#181a20" : "#ffffff"
      },
      primary: {
        main: mode === "dark" ? "#74b7ff" : "#1565c0"
      },
      secondary: {
        main: mode === "dark" ? "#9ee493" : "#2e7d32"
      },
      text: {
        primary: mode === "dark" ? "#e8e9eb" : "#1f2125",
        secondary: mode === "dark" ? "#8a8f98" : "#5c6169"
      }
    },
    shape: {
      borderRadius: 4
    },
    typography: {
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    },
    components: {
      MuiButton: {
        defaultProps: {
          size: "small"
        }
      },
      MuiIconButton: {
        defaultProps: {
          size: "small"
        }
      },
      MuiTextField: {
        defaultProps: {
          size: "small"
        }
      }
    }
  });
}
