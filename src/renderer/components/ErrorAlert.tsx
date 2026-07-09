import CloseIcon from "@mui/icons-material/Close";
import { Alert, IconButton } from "@mui/material";
import { useEffect } from "react";

export function ErrorAlert({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 10000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <Alert
      severity="error"
      onClose={onClose}
      action={
        <IconButton aria-label="Close error message" color="inherit" size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      }
      sx={{ py: 0.25, fontSize: "0.75rem", alignItems: "center" }}
    >
      {message}
    </Alert>
  );
}
