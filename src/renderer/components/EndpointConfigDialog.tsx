import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip
} from "@mui/material";
import { useEffect, useState } from "react";
import type { SerialPortInfo } from "../../shared/ipc";
import type { FileParams, SerialParams, StreamEndpoint, StreamMode, StreamType } from "../../shared/stream";
import {
  allowedEndpointTypes,
  baudRates,
  createEndpointWithType,
  dataBitsOptions,
  flowControlOptions,
  formatEndpointType,
  formatSerialPortLabel,
  isClientEndpoint,
  isFileEndpoint,
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

const replaySpeedOptions = [0.1, 0.2, 0.5, 1, 2, 5, 10];

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
  const fileParams = draft.params as FileParams;

  const updateParam = (key: string, value: unknown): void => {
    setDraft({ ...draft, params: { ...draft.params, [key]: value } });
  };

  const handleBrowseFile = async (): Promise<void> => {
    const selected = await window.navBridge.showFileDialog(mode, fileParams.path || undefined);
    if (selected != undefined) {
      updateParam("path", selected);
    }
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
            label="网络协议"
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
                disabled={mode === "input"}
                onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
              />
            }
            label={mode === "input" ? "Enabled (input is always active)" : "Enabled"}
          />

          {isClientEndpoint(draft) && (
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

          {(draft.type === "tcp-server" || draft.type === "udp-server") && (
            <Stack direction="row" spacing={1}>
              <TextField label="Host" value="0.0.0.0" disabled fullWidth InputLabelProps={{ shrink: true }} />
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

          {isFileEndpoint(draft) && (
            <>
              <TextField
                label="File path"
                fullWidth
                value={fileParams.path ?? ""}
                onChange={(event) => updateParam("path", event.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Browse">
                        <IconButton onClick={() => void handleBrowseFile()} edge="end" size="small">
                          <FolderOpenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  )
                }}
              />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={Boolean(fileParams.timeTag)}
                    onChange={(event) => updateParam("timeTag", event.target.checked)}
                  />
                }
                label="Time Tag"
              />
              {fileParams.timeTag && (
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ rowGap: 1 }}>
                  {mode === "input" && (
                    <>
                      <TextField
                        select
                        label="Replay speed"
                        value={Number(fileParams.replaySpeed ?? 1)}
                        onChange={(event) => updateParam("replaySpeed", Number(event.target.value))}
                        sx={{ minWidth: 120 }}
                        SelectProps={{ MenuProps: denseSelectMenuProps }}
                        InputLabelProps={{ shrink: true }}
                      >
                        {replaySpeedOptions.map((speed) => (
                          <MenuItem key={speed} value={speed}>
                            x{speed}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        label="Start offset (s)"
                        type="number"
                        value={Number(fileParams.startOffset ?? 0)}
                        onChange={(event) => updateParam("startOffset", Number(event.target.value))}
                        sx={{ minWidth: 130 }}
                        InputLabelProps={{ shrink: true }}
                      />
                    </>
                  )}
                  <TextField
                    select
                    label="File position bytes"
                    value={fileParams.filePositionBytes ?? 4}
                    onChange={(event) => updateParam("filePositionBytes", Number(event.target.value))}
                    sx={{ minWidth: 150 }}
                    SelectProps={{ MenuProps: denseSelectMenuProps }}
                    InputLabelProps={{ shrink: true }}
                  >
                    {[4, 8].map((bytes) => (
                      <MenuItem key={bytes} value={bytes}>
                        {bytes}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
              )}
            </>
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
                  serialPortsError ?? (serialPorts.length === 0 ? "No serial ports detected." : undefined)
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
