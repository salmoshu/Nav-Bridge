import AddIcon from "@mui/icons-material/Add";
import ArticleIcon from "@mui/icons-material/Article";
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
import { useEffect, useRef, useState } from "react";
import type { StreamConfig, StreamEndpoint, StreamMode, StreamStatus, StreamType } from "../../shared/stream";
import {
  allowedEndpointTypes,
  createDefaultEndpoint,
  createEndpointWithType,
  endpointInfo,
  formatEndpointType
} from "../lib/endpointConfig";
import { buildStatusMap } from "../lib/endpointStatus";
import { useSerialPorts } from "../hooks/useSerialPorts";
import { EndpointConfigDialog } from "./EndpointConfigDialog";

const statusColor = {
  idle: "#8a8f98",
  connecting: "#f5c542",
  connected: "#66d17a",
  error: "#ff6b6b"
} as const;

const MAX_OUTPUTS = 7;
export const endpointGridColumns = "20px 28px 48px 104px minmax(0,1fr) 28px 28px 80px";
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
  onShowSystemLogs,
  onShowData
}: {
  config: StreamConfig;
  status?: StreamStatus;
  onChange: (config: StreamConfig) => void;
  onExport: () => void;
  onShowSystemLogs: () => void;
  onShowData: (endpointId: string) => void;
}) {
  const { ports, loading: serialPortsLoading, error: serialPortsError, refresh } = useSerialPorts();
  const statusMap = buildStatusMap(status);
  const [editingId, setEditingId] = useState<string>();
  const canAddOutput = config.outputs.length < MAX_OUTPUTS;
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
          <Typography variant="subtitle2" fontWeight={600} fontSize="0.8125rem">
            Endpoints
          </Typography>
          <Stack direction="row" spacing={0.25} alignItems="center">
            <Tooltip title="View system logs">
              <IconButton onClick={onShowSystemLogs}>
                <ArticleIcon fontSize="small" sx={endpointActionIconSx} />
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
            fontSize: "0.65rem"
          }}
        >
          <span />
          <span>#</span>
          <span>Role</span>
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
          onShowData={() => onShowData(config.input.id)}
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
            onShowData={() => onShowData(output.id)}
          />
        ))}

        {canAddOutput && (
          <Box>
            <Button
              startIcon={<AddIcon />}
              onClick={addOutput}
              size="small"
              sx={{ fontSize: "0.75rem", py: 0.125, textTransform: "none" }}
            >
              Add Output
            </Button>
          </Box>
        )}

        <div ref={bottomRef} />
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
  onDelete,
  onShowData
}: {
  index: number;
  mode: StreamMode;
  endpoint: StreamEndpoint;
  metric: { status: string; bytes: number; bps: number };
  onChange: (endpoint: StreamEndpoint) => void;
  onConfigure: () => void;
  onDelete?: () => void;
  onShowData: () => void;
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
        {isInput ? "Input" : "Output"}
      </Typography>
      <TextField
        select
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
      <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0, fontSize: "0.7rem" }}>
        {endpointInfo(endpoint)}
      </Typography>
      <Typography variant="caption" noWrap sx={{ fontSize: "0.7rem", fontVariantNumeric: "tabular-nums" }}>
        {metric.bytes.toLocaleString()}
      </Typography>
      <Typography variant="caption" noWrap sx={{ fontSize: "0.7rem", fontVariantNumeric: "tabular-nums" }}>
        {metric.bps.toLocaleString()}
      </Typography>
      <Stack direction="row" spacing={0.25} alignItems="center" justifyContent="flex-end">
        <Tooltip title="Configure">
          <IconButton onClick={onConfigure} sx={endpointActionButtonSx}>
            <SettingsIcon sx={endpointActionIconSx} />
          </IconButton>
        </Tooltip>
        <Tooltip title="View data">
          <IconButton onClick={onShowData} sx={endpointActionButtonSx}>
            <DataObjectIcon sx={endpointActionIconSx} />
          </IconButton>
        </Tooltip>
        {onDelete != undefined && (
          <Tooltip title="Delete output">
            <IconButton onClick={onDelete} sx={endpointActionButtonSx}>
              <DeleteIcon sx={endpointActionIconSx} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
}
