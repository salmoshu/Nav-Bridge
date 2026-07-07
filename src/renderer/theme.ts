import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#111217",
      paper: "#181a20"
    },
    primary: {
      main: "#74b7ff"
    },
    secondary: {
      main: "#9ee493"
    }
  },
  shape: {
    borderRadius: 6
  },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  }
});
