import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import SettingsIcon from "@mui/icons-material/Settings";
import CircleIcon from "@mui/icons-material/Circle";
import {
  Box,
  Button,
  Checkbox,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useState } from "react";
import type { StreamConfig, StreamEndpoint, StreamMode, StreamStatus, StreamType } from "../../shared/stream";
import {
  allowedEndpointTypes,
  createDefaultEndpoint,
  createEndpointWithType,
  endpointSummary
} from "../lib/endpointConfig";
import { buildStatusMap } from "../lib/endpointStatus";
import { EndpointConfigDialog } from "./EndpointConfigDialog";
import { useSerialPorts } from "../hooks/useSerialPorts";

const statusColor = {
  idle: "#8a8f98",
  connecting: "#f5c542",
  connected: "#66d17a",
  error: "#ff6b6b"
} as const;

const endpointGridColumns = "24px 28px 96px minmax(0, 1fr) 48px 48px 56px";

export function EndpointTable({
  config,
  status,
  onChange,
  onSave
}: {
  config: StreamConfig;
  status?: StreamStatus;
  onChange: (config: StreamConfig) => void;
  onSave: () => void;
}) {
  const { ports, loading: serialPortsLoading, error: serialPortsError, refresh } = useSerialPorts();
  const statusMap = buildStatusMap(status);
  const [editingId, setEditingId] = useState<string>();

  const updateInput = (endpoint: StreamEndpoint): void => {
    onChange({ ...config, input: endpoint });
  };

  const updateOutput = (index: number, endpoint: StreamEndpoint): void => {
    const outputs = [...config.outputs];
    outputs[index] = endpoint;
    onChange({ ...config, outputs });
  };

  const addOutput = (): void => {
    const nextIndex = config.outputs.length + 1;
    onChange({
      ...config,
      outputs: [...config.outputs, createDefaultEndpoint(`output-${nextIndex}`, "udp-client")]
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
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" fontWeight={600}>
            Endpoints
          </Typography>
          <Tooltip title="Save configuration">
            <IconButton onClick={onSave}>
              <SaveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
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
            fontSize: "0.65rem"
          }}
        >
          <span />
          <span>#</span>
          <span>Type</span>
          <span>Info</span>
          <span>Bytes</span>
          <span>BPS</span>
          <span />
        </Box>

        <EndpointRow
          index={0}
          mode="input"
          endpoint={config.input}
          metric={statusMap[config.input.id]}
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
            onChange={(endpoint) => updateOutput(index, endpoint)}
            onConfigure={() => setEditingId(output.id)}
            onDelete={() => removeOutput(index)}
          />
        ))}

        <Box>
          <Button startIcon={<AddIcon />} onClick={addOutput} size="small">
            Add output
          </Button>
        </Box>
      </Stack>

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

function EndpointRow({
  index,
  mode,
  endpoint,
  metric,
  onChange,
  onConfigure,
  onDelete
}: {
  index: number;
  mode: StreamMode;
  endpoint: StreamEndpoint;
  metric: { status: string; bytes: number; bps: number };
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
        py: 0.5,
        borderBottom: 1,
        borderColor: "divider"
      }}
    >
      <Checkbox
        checked={endpoint.enabled}
        onChange={(event) => onChange({ ...endpoint, enabled: event.target.checked })}
        size="small"
        sx={{ p: 0.25 }}
      />
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
      <TextField
        select
        value={endpoint.type}
        onChange={(event) => onChange(createEndpointWithType(endpoint, event.target.value as StreamType))}
        sx={{ minWidth: 0 }}
      >
        {types.map((type) => (
          <MenuItem key={type} value={type}>
            {type}
          </MenuItem>
        ))}
      </TextField>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0, fontSize: "0.7rem" }}>
        {endpointSummary(endpoint)}
      </Typography>
      <Typography
        variant="caption"
        noWrap
        sx={{ fontSize: "0.7rem", fontVariantNumeric: "tabular-nums" }}
      >
        {metric.bytes.toLocaleString()}
      </Typography>
      <Typography
        variant="caption"
        noWrap
        sx={{ fontSize: "0.7rem", fontVariantNumeric: "tabular-nums" }}
      >
        {metric.bps.toLocaleString()}
      </Typography>
      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
        <CircleIcon sx={{ fontSize: 10, color: statusColor[metric.status as keyof typeof statusColor] }} />
        <Tooltip title="Configure">
          <IconButton onClick={onConfigure} sx={{ p: 0.25 }}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {onDelete != undefined && (
          <Tooltip title="Delete output">
            <IconButton onClick={onDelete} sx={{ p: 0.25 }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
}
