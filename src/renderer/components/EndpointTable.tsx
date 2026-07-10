import AddIcon from "@mui/icons-material/Add";
import CircleIcon from "@mui/icons-material/Circle";
import DataObjectIcon from "@mui/icons-material/DataObject";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type {
  FileParams,
  SerialParams,
  StreamConfig,
  StreamEndpoint,
  StreamMode,
  StreamStatus,
  StreamType
} from "../../shared/stream";
import {
  allowedEndpointTypes,
  createDefaultEndpoint,
  createEndpointWithType,
  endpointPath,
  formatEndpointType,
  isClientEndpoint,
  isFileEndpoint,
  isServerEndpoint
} from "../lib/endpointConfig";
import { buildStatusMap } from "../lib/endpointStatus";
import {
  ENDPOINT_ROW_HEIGHT,
  ENDPOINT_TABLE_ADD_BUTTON_HEIGHT,
  ENDPOINT_TABLE_COLUMN_HEADER_HEIGHT,
  ENDPOINT_TABLE_HEADER_HEIGHT
} from "../../shared/windowMetrics";
import { formatBytes, getByteUnit } from "../lib/formatBytes";
import { useSerialPorts } from "../hooks/useSerialPorts";
import { EndpointConfigDialog } from "./EndpointConfigDialog";

const pathInputSx = {
  "& .MuiInput-root": {
    height: 40,
    fontSize: "0.7rem"
  },
  "& .MuiInput-input": {
    py: 0,
    px: 0.75,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  }
} as const;

const statusColor = {
  idle: "#8a8f98",
  connecting: "#f5c542",
  connected: "#66d17a",
  waiting: "#f5c542",
  error: "#ff6b6b"
} as const;

const MAX_OUTPUTS = 5;
export const endpointGridColumns = "20px 28px 36px 110px minmax(124px,1fr) 72px 32px 64px";
export const endpointActionButtonSx = {
  p: 0,
  width: 20,
  height: 20
} as const;
export const endpointActionIconSx = {
  fontSize: 16,
  color: "text.primary"
} as const;

export function EndpointTable({
  config,
  status,
  onChange,
  onExport,
  onShowSystemLogs
}: {
  config: StreamConfig;
  status?: StreamStatus;
  onChange: (config: StreamConfig) => void;
  onExport: () => void;
  onShowSystemLogs: () => void;
}) {
  const { ports, loading: serialPortsLoading, error: serialPortsError, refresh } = useSerialPorts();
  const statusMap = buildStatusMap(status);
  const maxBytes = Math.max(
    statusMap[config.input.id]?.bytes ?? 0,
    ...config.outputs.map((output) => statusMap[output.id]?.bytes ?? 0)
  );
  const bytesUnit = getByteUnit(maxBytes);
  const [editingId, setEditingId] = useState<string>();
  const canAddOutput = config.outputs.length < MAX_OUTPUTS;
  const disabled = status?.running ?? false;
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousOutputCount = useRef(config.outputs.length);

  useEffect(() => {
    if (config.outputs.length > previousOutputCount.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    }
    previousOutputCount.current = config.outputs.length;
  }, [config.outputs.length]);

  const updateInput = (endpoint: StreamEndpoint): void => {
    onChange({ ...config, input: endpoint });
  };

  const updateOutput = (index: number, endpoint: StreamEndpoint): void => {
    const outputs = [...config.outputs];
    outputs[index] = endpoint;
    onChange({ ...config, outputs });
  };

  const addOutput = (): void => {
    if (!canAddOutput) return;
    const nextIndex = config.outputs.length + 1;
    onChange({
      ...config,
      outputs: [...config.outputs, createDefaultEndpoint(`output-${nextIndex}`, "tcp-server")]
    });
  };

  const removeOutput = (index: number): void => {
    onChange({
      ...config,
      outputs: config.outputs.filter((_, itemIndex) => itemIndex !== index)
    });
  };

  const editingEndpoint =
    editingId === config.input.id ? config.input : config.outputs.find((output) => output.id === editingId);

  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Stack spacing={0.75}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ minHeight: ENDPOINT_TABLE_HEADER_HEIGHT }}
        >
          <Typography variant="subtitle2" fontWeight={600} fontSize="0.8125rem">
            Endpoints
          </Typography>
          <Stack direction="row" spacing={0.25} alignItems="center">
            <Tooltip title="View stream monitor">
              <IconButton onClick={onShowSystemLogs}>
                <DataObjectIcon fontSize="small" sx={endpointActionIconSx} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export configuration">
              <IconButton onClick={onExport}>
                <DownloadIcon fontSize="small" sx={endpointActionIconSx} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: endpointGridColumns,
            gap: 1,
            alignItems: "center",
            typography: "caption",
            color: "text.secondary",
            px: 0.5,
            fontSize: "0.65rem",
            minHeight: ENDPOINT_TABLE_COLUMN_HEADER_HEIGHT
          }}
        >
          <span />
          <span>#</span>
          <span>Role</span>
          <span>Type</span>
          <span>Path</span>
          <span style={{ whiteSpace: "nowrap" }}>
            Bytes
            <span style={{ opacity: 0.7, marginLeft: 2 }}>({bytesUnit})</span>
          </span>
          <span>Bps</span>
          <span />
        </Box>

        <EndpointRow
          index={0}
          mode="input"
          endpoint={config.input}
          metric={statusMap[config.input.id]}
          disabled={disabled}
          onChange={updateInput}
          onConfigure={() => setEditingId(config.input.id)}
        />

        {config.outputs.map((output, index) => (
          <EndpointRow
            key={output.id}
            index={index + 1}
            mode="output"
            endpoint={output}
            metric={statusMap[output.id]}
            disabled={disabled}
            onChange={(endpoint) => updateOutput(index, endpoint)}
            onConfigure={() => setEditingId(output.id)}
            onDelete={() => removeOutput(index)}
          />
        ))}

        {canAddOutput && (
          <Box
            sx={{
              minHeight: ENDPOINT_TABLE_ADD_BUTTON_HEIGHT,
              display: "flex",
              alignItems: "center",
              mt: 0.25
            }}
          >
            <Button
              startIcon={<AddIcon />}
              onClick={addOutput}
              size="small"
              disabled={disabled}
              sx={{ fontSize: "0.75rem", py: 0.125, textTransform: "none" }}
            >
              Add Output
            </Button>
          </Box>
        )}
      </Stack>

      <div ref={bottomRef} />

      {editingEndpoint != undefined && (
        <EndpointConfigDialog
          open
          endpoint={editingEndpoint}
          mode={editingId === config.input.id ? "input" : "output"}
          serialPorts={ports}
          serialPortsLoading={serialPortsLoading}
          serialPortsError={serialPortsError}
          onRefreshSerialPorts={refresh}
          onClose={() => setEditingId(undefined)}
          onSave={(endpoint) => {
            if (editingId === config.input.id) {
              updateInput(endpoint);
            } else {
              const index = config.outputs.findIndex((output) => output.id === editingId);
              if (index !== -1) {
                updateOutput(index, endpoint);
              }
            }
            setEditingId(undefined);
            void refresh();
          }}
        />
      )}
    </Paper>
  );
}

function parseClientPath(value: string): { host: string; port: number } | undefined {
  const lastColon = value.lastIndexOf(":");
  if (lastColon === -1) {
    return undefined;
  }
  const host = value.slice(0, lastColon);
  const port = Number.parseInt(value.slice(lastColon + 1), 10);
  if (Number.isNaN(port) || host.length === 0) {
    return undefined;
  }
  return { host, port };
}

function parseServerPort(value: string): number | undefined {
  const lastColon = value.lastIndexOf(":");
  const portText = lastColon === -1 ? value : value.slice(lastColon + 1);
  const port = Number.parseInt(portText, 10);
  if (Number.isNaN(port)) {
    return undefined;
  }
  return port;
}

function parseSerialPath(value: string): { port: string; baudRate: number } | undefined {
  const atIndex = value.lastIndexOf("@");
  if (atIndex === -1) {
    return undefined;
  }
  const port = value.slice(0, atIndex);
  const baudRate = Number.parseInt(value.slice(atIndex + 1), 10);
  if (Number.isNaN(baudRate)) {
    return undefined;
  }
  return { port, baudRate };
}

function EndpointPathEditor({
  endpoint,
  disabled,
  onChange
}: {
  endpoint: StreamEndpoint;
  disabled: boolean;
  onChange: (endpoint: StreamEndpoint) => void;
}) {
  const [focused, setFocused] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    if (isServerEndpoint(endpoint)) {
      const port = parseServerPort(value);
      if (port == undefined) {
        return;
      }
      const params = endpoint.params as { port: number };
      onChange({ ...endpoint, params: { ...params, port } });
      return;
    }

    if (isClientEndpoint(endpoint)) {
      const parsed = parseClientPath(value);
      if (parsed == undefined) {
        return;
      }
      const params = endpoint.params as { host?: string; port: number };
      onChange({
        ...endpoint,
        params: { ...params, host: parsed.host, port: parsed.port }
      });
      return;
    }

    if (isFileEndpoint(endpoint)) {
      const params = endpoint.params as FileParams;
      onChange({
        ...endpoint,
        params: { ...params, path: value }
      });
      return;
    }

    const parsed = parseSerialPath(value);
    if (parsed == undefined) {
      return;
    }
    const params = endpoint.params as SerialParams;
    onChange({
      ...endpoint,
      params: { ...params, port: parsed.port, baudRate: parsed.baudRate }
    });
  };

  const placeholder = isServerEndpoint(endpoint)
    ? "port"
    : isClientEndpoint(endpoint)
      ? "host:port"
      : isFileEndpoint(endpoint)
        ? "file path"
        : "port@baudRate";

  const displayValue =
    isServerEndpoint(endpoint) && focused
      ? String((endpoint.params as { port: number }).port)
      : endpointPath(endpoint);

  return (
    <TextField
      variant="standard"
      size="small"
      disabled={disabled}
      value={displayValue}
      placeholder={placeholder}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      InputProps={{ disableUnderline: true }}
      inputProps={{ spellCheck: false }}
      sx={{ ...pathInputSx, minWidth: 0 }}
    />
  );
}

function EndpointRow({
  index,
  mode,
  endpoint,
  metric,
  disabled,
  onChange,
  onConfigure,
  onDelete
}: {
  index: number;
  mode: StreamMode;
  endpoint: StreamEndpoint;
  metric: { status: string; bytes: number; bps: number };
  disabled: boolean;
  onChange: (endpoint: StreamEndpoint) => void;
  onConfigure: () => void;
  onDelete?: () => void;
}) {
  const theme = useTheme();
  const types = allowedEndpointTypes(mode);
  const isInput = mode === "input";
  const badgeColor = isInput ? theme.palette.primary.main : theme.palette.secondary.main;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: endpointGridColumns,
        gap: 1,
        alignItems: "center",
        px: 0.5,
        height: ENDPOINT_ROW_HEIGHT,
        boxSizing: "border-box",
        borderBottom: 1,
        borderColor: "divider"
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircleIcon sx={{ fontSize: 8, color: statusColor[metric.status as keyof typeof statusColor] }} />
      </Box>
      <Box
        sx={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.625rem",
          fontWeight: 700,
          bgcolor: alpha(badgeColor, 0.12),
          color: isInput ? theme.palette.primary.dark : theme.palette.secondary.dark
        }}
      >
        {index}
      </Box>
      <Typography variant="caption" noWrap sx={{ fontSize: "0.7rem" }}>
        {isInput ? "In" : "Out"}
      </Typography>
      <TextField
        select
        disabled={disabled}
        value={endpoint.type}
        onChange={(event) => onChange(createEndpointWithType(endpoint, event.target.value as StreamType))}
        sx={{ minWidth: 0 }}
        SelectProps={{
          sx: { fontSize: "0.7rem" },
          renderValue: (selected) => formatEndpointType(selected as StreamType),
          MenuProps: {
            PaperProps: {
              sx: {
                "& .MuiMenuItem-root": {
                  minHeight: 28,
                  fontSize: "0.7rem",
                  py: 0.25
                }
              }
            }
          }
        }}
      >
        {types.map((type) => (
          <MenuItem key={type} value={type}>
            {formatEndpointType(type)}
          </MenuItem>
        ))}
      </TextField>
      <EndpointPathEditor endpoint={endpoint} disabled={disabled} onChange={onChange} />
      <Typography variant="caption" noWrap sx={{ fontSize: "0.7rem", fontVariantNumeric: "tabular-nums" }}>
        {formatBytes(metric.bytes)}
      </Typography>
      <Typography variant="caption" noWrap sx={{ fontSize: "0.7rem", fontVariantNumeric: "tabular-nums" }}>
        {metric.bps.toLocaleString()}
      </Typography>
      <Stack direction="row" spacing={0.25} alignItems="center" justifyContent="flex-end">
        <Tooltip title="Configure">
          <IconButton onClick={onConfigure} sx={endpointActionButtonSx}>
            <SettingsIcon
              sx={{
                ...endpointActionIconSx,
                color: disabled ? "text.disabled" : endpointActionIconSx.color
              }}
            />
          </IconButton>
        </Tooltip>
        {onDelete != undefined && (
          <Tooltip title="Delete output">
            <IconButton onClick={onDelete} sx={endpointActionButtonSx}>
              <DeleteIcon
                sx={{
                  ...endpointActionIconSx,
                  color: disabled ? "text.disabled" : endpointActionIconSx.color
                }}
              />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
}
