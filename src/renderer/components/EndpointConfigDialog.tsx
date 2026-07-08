import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField
} from "@mui/material";
import { useEffect, useState } from "react";
import type { SerialPortInfo } from "../../shared/ipc";
import type { SerialParams, StreamEndpoint, StreamMode, StreamType } from "../../shared/stream";
import {
  allowedEndpointTypes,
  baudRates,
  createEndpointWithType,
  dataBitsOptions,
  flowControlOptions,
  formatEndpointType,
  formatSerialPortLabel,
  isNetworkEndpoint,
  isSerialEndpoint,
  parityOptions,
  stopBitsOptions
} from "../lib/endpointConfig";
import {
  compactDialogActionsSx,
  compactDialogButtonSx,
  compactDialogContentSx,
  compactDialogTitleSx,
  denseSelectMenuProps
} from "../lib/compactUi";

export function EndpointConfigDialog({
  open,
  endpoint,
  mode,
  serialPorts,
  serialPortsLoading = false,
  serialPortsError,
  onRefreshSerialPorts,
  onClose,
  onSave
}: {
  open: boolean;
  endpoint: StreamEndpoint;
  mode: StreamMode;
  serialPorts: SerialPortInfo[];
  serialPortsLoading?: boolean;
  serialPortsError?: string;
  onRefreshSerialPorts?: () => void | Promise<void>;
  onClose: () => void;
  onSave: (endpoint: StreamEndpoint) => void;
}) {
  const [draft, setDraft] = useState<StreamEndpoint>(endpoint);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setDraft(endpoint);
    setShowAdvanced(false);
  }, [endpoint, open]);

  useEffect(() => {
    if (open) {
      void onRefreshSerialPorts?.();
    }
  }, [onRefreshSerialPorts, open]);

  const types = allowedEndpointTypes(mode);
  const params = draft.params as unknown as Record<string, unknown>;
  const serialParams = draft.params as SerialParams;

  const updateParam = (key: string, value: unknown): void => {
    setDraft({ ...draft, params: { ...draft.params, [key]: value } });
  };

  const handleTypeChange = (type: StreamType): void => {
    setDraft(createEndpointWithType(draft, type));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={compactDialogTitleSx}>
        {mode === "input" ? "Configure Input" : "Configure Output"}
      </DialogTitle>
      <DialogContent sx={compactDialogContentSx}>
        <Stack spacing={1.25}>
          <TextField
            select
            label="Type"
            value={draft.type}
            onChange={(event) => handleTypeChange(event.target.value as StreamType)}
            fullWidth
            SelectProps={{
              renderValue: (selected) => formatEndpointType(selected as StreamType),
              MenuProps: denseSelectMenuProps
            }}
            InputLabelProps={{ shrink: true }}
          >
            {types.map((type) => (
              <MenuItem key={type} value={type}>
                {formatEndpointType(type)}
              </MenuItem>
            ))}
          </TextField>

          {isNetworkEndpoint(draft) && (
            <Stack direction="row" spacing={1}>
              <TextField
                label="Host"
                value={String(params.host ?? "")}
                onChange={(event) => updateParam("host", event.target.value)}
                fullWidth
              />
              <TextField
                label="Port"
                type="number"
                value={Number(params.port ?? 0)}
                onChange={(event) => updateParam("port", Number(event.target.value))}
                sx={{ minWidth: 120 }}
              />
            </Stack>
          )}

          {draft.type === "tcp-client" && (
            <TextField
              label="Connect message (optional)"
              multiline
              minRows={2}
              maxRows={4}
              fullWidth
              value={String(params.connectMessage ?? "")}
              onChange={(event) => updateParam("connectMessage", event.target.value)}
              helperText="Sent once after TCP connection. Use \\r \\n for CRLF."
              InputLabelProps={{ shrink: true }}
            />
          )}

          {isSerialEndpoint(draft) && (
            <>
              <TextField
                select
                label="Serial port"
                fullWidth
                value={serialParams.port ?? ""}
                onChange={(event) => updateParam("port", event.target.value)}
                error={serialPortsError != undefined}
                helperText={
                  serialPortsError ??
                  (serialPorts.length === 0 ? "No serial ports detected." : undefined)
                }
                disabled={serialPortsLoading}
                SelectProps={{
                  MenuProps: denseSelectMenuProps,
                  onOpen: () => void onRefreshSerialPorts?.()
                }}
                InputLabelProps={{ shrink: true }}
              >
                {serialPorts.map((port) => (
                  <MenuItem key={port.path} value={port.path}>
                    {formatSerialPortLabel(port)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Baud"
                fullWidth
                value={serialParams.baudRate}
                onChange={(event) => updateParam("baudRate", Number(event.target.value))}
                SelectProps={{ MenuProps: denseSelectMenuProps }}
                InputLabelProps={{ shrink: true }}
              >
                {baudRates.map((rate) => (
                  <MenuItem key={rate} value={rate}>
                    {rate}
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={showAdvanced}
                    onChange={(event) => setShowAdvanced(event.target.checked)}
                  />
                }
                label="Advanced"
              />
              {showAdvanced && (
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ rowGap: 1 }}>
                  <TextField
                    select
                    label="Data bits"
                    value={serialParams.dataBits}
                    onChange={(event) => updateParam("dataBits", Number(event.target.value))}
                    sx={{ minWidth: 100 }}
                    SelectProps={{ MenuProps: denseSelectMenuProps }}
                  >
                    {dataBitsOptions.map((bits) => (
                      <MenuItem key={bits} value={bits}>
                        {bits}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Parity"
                    value={serialParams.parity}
                    onChange={(event) => updateParam("parity", event.target.value)}
                    sx={{ minWidth: 100 }}
                    SelectProps={{ MenuProps: denseSelectMenuProps }}
                  >
                    {parityOptions.map((parity) => (
                      <MenuItem key={parity} value={parity}>
                        {parity}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Stop bits"
                    value={serialParams.stopBits}
                    onChange={(event) => updateParam("stopBits", Number(event.target.value))}
                    sx={{ minWidth: 100 }}
                    SelectProps={{ MenuProps: denseSelectMenuProps }}
                  >
                    {stopBitsOptions.map((bits) => (
                      <MenuItem key={bits} value={bits}>
                        {bits}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Flow"
                    value={serialParams.flowControl}
                    onChange={(event) => updateParam("flowControl", event.target.value)}
                    sx={{ minWidth: 100 }}
                    SelectProps={{ MenuProps: denseSelectMenuProps }}
                  >
                    {flowControlOptions.map((flow) => (
                      <MenuItem key={flow} value={flow}>
                        {flow}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={compactDialogActionsSx}>
        <Button onClick={onClose} size="small" sx={compactDialogButtonSx}>
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          sx={compactDialogButtonSx}
          onClick={() => {
            onSave(draft);
            onClose();
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}
