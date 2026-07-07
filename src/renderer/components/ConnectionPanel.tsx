import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { Button, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import type { StreamConfig, StreamEndpoint, StreamType } from "../../shared/stream";

const streamTypes: StreamType[] = ["tcp-server", "tcp-client", "udp-server", "udp-client", "serial"];

export function ConnectionPanel({
  config,
  setConfig,
  onSave
}: {
  config: StreamConfig;
  setConfig: (config: StreamConfig) => void;
  onSave: () => void;
}) {
  const updateInput = (endpoint: StreamEndpoint): void => {
    setConfig({ ...config, input: endpoint });
  };

  const updateOutput = (index: number, endpoint: StreamEndpoint): void => {
    const outputs = [...config.outputs];
    outputs[index] = endpoint;
    setConfig({ ...config, outputs });
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">连接配置</Typography>
          <Tooltip title="保存配置">
            <IconButton onClick={onSave} size="small">
              <SaveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
        <EndpointFields label="Input" endpoint={config.input} onChange={updateInput} />
        <Typography variant="subtitle2">Outputs</Typography>
        {config.outputs.map((output, index) => (
          <Stack direction="row" spacing={1} alignItems="flex-start" key={output.id}>
            <EndpointFields
              label={`Output ${index + 1}`}
              endpoint={output}
              onChange={(endpoint) => updateOutput(index, endpoint)}
            />
            <Tooltip title="删除输出">
              <IconButton
                onClick={() =>
                  setConfig({
                    ...config,
                    outputs: config.outputs.filter((_, itemIndex) => itemIndex !== index)
                  })
                }
                size="small"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ))}
        <Button
          startIcon={<AddIcon />}
          onClick={() =>
            setConfig({
              ...config,
              outputs: [
                ...config.outputs,
                {
                  id: `output-${config.outputs.length + 1}`,
                  type: "udp-client",
                  enabled: true,
                  params: { host: "127.0.0.1", port: 2201 + config.outputs.length }
                }
              ]
            })
          }
        >
          添加输出
        </Button>
      </Stack>
    </Paper>
  );
}

function EndpointFields({
  label,
  endpoint,
  onChange
}: {
  label: string;
  endpoint: StreamEndpoint;
  onChange: (endpoint: StreamEndpoint) => void;
}) {
  const params = endpoint.params as unknown as Record<string, string | number>;
  const updateParam = (key: string, value: string): void => {
    const numeric = key === "port" || key === "baudRate" || key === "dataBits" || key === "stopBits";
    onChange({ ...endpoint, params: { ...endpoint.params, [key]: numeric ? Number(value) : value } });
  };

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1} flex={1}>
      <TextField label={label} value={endpoint.id} size="small" disabled />
      <TextField
        select
        label="Type"
        value={endpoint.type}
        size="small"
        onChange={(event) => onChange(withDefaultParams(endpoint, event.target.value as StreamType))}
        sx={{ minWidth: 140 }}
      >
        {streamTypes.map((type) => (
          <MenuItem key={type} value={type}>
            {type}
          </MenuItem>
        ))}
      </TextField>
      {"host" in params && (
        <TextField
          label="Host"
          value={params.host}
          size="small"
          onChange={(event) => updateParam("host", event.target.value)}
        />
      )}
      {"port" in params && (
        <TextField
          label="Port"
          type="number"
          value={params.port}
          size="small"
          onChange={(event) => updateParam("port", event.target.value)}
        />
      )}
      {"baudRate" in params && (
        <>
          <TextField
            label="Port"
            value={params.port}
            size="small"
            onChange={(event) => updateParam("port", event.target.value)}
          />
          <TextField
            label="Baud"
            type="number"
            value={params.baudRate}
            size="small"
            onChange={(event) => updateParam("baudRate", event.target.value)}
          />
        </>
      )}
    </Stack>
  );
}

function withDefaultParams(endpoint: StreamEndpoint, type: StreamType): StreamEndpoint {
  if (type === "serial") {
    return {
      ...endpoint,
      type,
      params: {
        port: "COM3",
        baudRate: 115200,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        flowControl: "none"
      }
    };
  }
  if (type === "tcp-server" || type === "udp-server") {
    return { ...endpoint, type, params: { host: "127.0.0.1", port: 2101 } };
  }
  return { ...endpoint, type, params: { host: "127.0.0.1", port: 2201 } };
}
