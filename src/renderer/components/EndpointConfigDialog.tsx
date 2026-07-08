import {
  Autocomplete,
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

  useEffect(() => {
    setDraft(endpoint);
  }, [endpoint, open]);

  const types = allowedEndpointTypes(mode);
  const params = draft.params as unknown as Record<string, unknown>;
  const serialParams = draft.params as SerialParams;

  const updateParam = (key: string, value: unknown): void => {
    setDraft({ ...draft, params: { ...draft.params, [key]: value } });
  };

  const handleTypeChange = (type: StreamType): void => {
    setDraft(createEndpointWithType(draft, type));
  };

  const serialPortPaths = serialPorts.map((port) => port.path);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={compactDialogTitleSx}>
        {mode === "input" ? "Configure Input" : `Configure ${endpoint.id}`}
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

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={draft.enabled}
                onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
              />
            }
            label="Enabled"
          />

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

          {isSerialEndpoint(draft) && (
            <>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Autocomplete
                  freeSolo
                  fullWidth
                  loading={serialPortsLoading}
                  options={serialPortPaths}
                  value={serialParams.port}
                  onChange={(_event, value) => updateParam("port", value ?? "")}
                  onInputChange={(_event, value) => updateParam("port", value)}
                  renderInput={(inputParams) => (
                    <TextField
                      {...inputParams}
                      label="Serial port"
                      placeholder="COM3"
                      error={serialPortsError != undefined}
                      helperText={
                        serialPortsError ??
                        (serialPortPaths.length === 0
                          ? "No serial ports detected. Type a port name manually."
                          : undefined)
                      }
                    />
                  )}
                />
                {onRefreshSerialPorts != undefined && (
                  <Button
                    onClick={() => void onRefreshSerialPorts()}
                    disabled={serialPortsLoading}
                    size="small"
                    sx={compactDialogButtonSx}
                  >
                    Refresh
                  </Button>
                )}
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <TextField
                  select
                  label="Baud"
                  value={serialParams.baudRate}
                  onChange={(event) => updateParam("baudRate", Number(event.target.value))}
                  sx={{ minWidth: 100 }}
                  SelectProps={{ MenuProps: denseSelectMenuProps }}
                >
                  {baudRates.map((rate) => (
                    <MenuItem key={rate} value={rate}>
                      {rate}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Data bits"
                  value={serialParams.dataBits}
                  onChange={(event) => updateParam("dataBits", Number(event.target.value))}
                  sx={{ minWidth: 90 }}
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
                  sx={{ minWidth: 90 }}
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
                  sx={{ minWidth: 110 }}
                  SelectProps={{ MenuProps: denseSelectMenuProps }}
                >
                  {flowControlOptions.map((flow) => (
                    <MenuItem key={flow} value={flow}>
                      {flow}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
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
