import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { useEffect, useState } from "react";
import type { StreamOptions } from "../../shared/stream";
import {
  compactDialogActionsSx,
  compactDialogButtonSx,
  compactDialogContentSx,
  compactDialogTitleSx
} from "../lib/compactUi";
import { updateStreamOptions } from "../lib/streamOptions";

interface OptionsDialogProps {
  open: boolean;
  options: StreamOptions;
  onClose: () => void;
  onSave: (options: StreamOptions) => void;
}

const fields: { key: keyof StreamOptions; label: string; unit: string }[] = [
  { key: "bufferSize", label: "Buffer size", unit: "bytes" },
  { key: "reconnectInterval", label: "Reconnect interval", unit: "ms" },
  { key: "inactiveTimeout", label: "Inactive timeout", unit: "ms" },
  { key: "statusInterval", label: "Status interval", unit: "ms" }
];

export function OptionsDialog({ open, options, onClose, onSave }: OptionsDialogProps) {
  const [draft, setDraft] = useState<StreamOptions>(options);

  useEffect(() => {
    setDraft(options);
  }, [options, open]);

  const handleChange = (key: keyof StreamOptions, value: string): void => {
    setDraft((current) => updateStreamOptions(current, { [key]: value } as Partial<StreamOptions>));
  };

  const handleSave = (): void => {
    onSave(updateStreamOptions(options, draft));
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={compactDialogTitleSx}>Options</DialogTitle>
      <DialogContent sx={compactDialogContentSx}>
        <Stack spacing={1.25}>
          {fields.map((field, index) => (
            <TextField
              key={field.key}
              label={`${field.label} (${field.unit})`}
              type="number"
              size="small"
              fullWidth
              value={draft[field.key]}
              onChange={(event) => handleChange(field.key, event.target.value)}
              InputLabelProps={index === 0 ? { shrink: true } : undefined}
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={compactDialogActionsSx}>
        <Button onClick={onClose} size="small" sx={compactDialogButtonSx}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" size="small" sx={compactDialogButtonSx}>
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}
