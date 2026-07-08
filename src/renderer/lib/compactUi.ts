export const compactDialogTitleSx = {
  px: 1.5,
  py: 1,
  fontSize: "0.8125rem",
  fontWeight: 700
} as const;

export const compactDialogContentSx = {
  px: 1.5,
  pt: "12px !important",
  pb: 1,
  maxHeight: "min(360px, calc(100vh - 126px))",
  overflow: "auto",
  "& .MuiInputBase-root": {
    fontSize: "0.75rem"
  },
  "& .MuiInputLabel-root": {
    fontSize: "0.75rem"
  },
  "& .MuiFormHelperText-root": {
    fontSize: "0.6875rem"
  },
  "& .MuiFormControlLabel-label": {
    fontSize: "0.75rem"
  }
} as const;

export const compactDialogActionsSx = {
  px: 1.5,
  py: 0.75
} as const;

export const compactDialogButtonSx = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 26,
  fontSize: "0.75rem",
  lineHeight: 1,
  px: 1.25,
  py: 0.25
} as const;

export const denseSelectMenuProps = {
  PaperProps: {
    sx: {
      WebkitAppRegion: "no-drag",
      "& .MuiMenuItem-root": {
        minHeight: 28,
        py: 0.25,
        fontSize: "0.75rem"
      }
    }
  }
} as const;
