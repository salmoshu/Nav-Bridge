import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import {
  Box,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LogEntry, StreamDataEntry, StreamMetric, StreamStatus } from "../../shared/stream";
import { formatBytes } from "../lib/formatBytes";

const levelColors: Record<LogEntry["level"], string> = {
  info: "text.secondary",
  warn: "warning.main",
  error: "error.main"
};

const monitorViews = [
  { value: "streams", label: "Streams" },
  { value: "hex", label: "HEX" },
  { value: "ascii", label: "ASCII" },
  { value: "log", label: "Log" }
] as const;

const menuProps = {
  PaperProps: {
    sx: {
      "& .MuiMenuItem-root": {
        minHeight: 28,
        fontSize: "0.7rem",
        py: 0.25
      }
    }
  }
};

type MonitorView = (typeof monitorViews)[number]["value"];

function formatLogTime(time: string): string {
  const date = new Date(time);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${String(date.getMilliseconds()).padStart(3, "0")}`;
}

function toAsciiChar(byte: number): string {
  if (byte === 0x0a) return "\n";
  if (byte === 0x0d) return "\r";
  return byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : ".";
}

function toHex(byte: number): string {
  return byte.toString(16).padStart(2, "0").toUpperCase();
}

function formatStreamSection(index: number, role: string, metric: StreamMetric): string {
  const entries: { label: string; value: string }[] = [
    { label: "Role", value: role },
    { label: "Type", value: metric.type },
    { label: "Status", value: metric.status }
  ];

  if (metric.uptime != undefined) {
    entries.push({ label: "Uptime", value: `${metric.uptime.toFixed(1)}s` });
  }
  if (metric.clients != undefined) {
    entries.push({ label: "Clients", value: String(metric.clients) });
  }

  entries.push({ label: "Bytes", value: formatBytes(metric.bytes) });
  entries.push({ label: "Bps", value: metric.bps.toLocaleString() });

  if (metric.error != undefined) {
    entries.push({ label: "Error", value: metric.error });
  }

  const labelWidth = Math.max(...entries.map((entry) => entry.label.length));
  const lines = [`[STREAM ${index}]`];
  entries.forEach((entry) => {
    lines.push(`  ${entry.label.padEnd(labelWidth)} : ${entry.value}`);
  });

  return lines.join("\n");
}

export function formatStreams(status?: StreamStatus): string {
  if (status == undefined) {
    return "No stream status";
  }

  const sections: string[] = [];
  sections.push(formatStreamSection(0, "Input", status.input));
  status.outputs.forEach((output, index) => {
    sections.push(formatStreamSection(index + 1, "Output", output));
  });

  return sections.join("\n\n");
}

const BYTES_PER_HEX_LINE = 32;
const HEX_GROUP_SIZE = 4;

export function formatHex(dataEntries: StreamDataEntry[]): string {
  const bytes = dataEntries.flatMap((entry) => entry.data);
  if (bytes.length === 0) {
    return "";
  }

  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += BYTES_PER_HEX_LINE) {
    const lineBytes = bytes.slice(offset, offset + BYTES_PER_HEX_LINE);
    const groups: string[] = [];
    for (let groupStart = 0; groupStart < lineBytes.length; groupStart += HEX_GROUP_SIZE) {
      const group = lineBytes.slice(groupStart, groupStart + HEX_GROUP_SIZE);
      groups.push(group.map(toHex).join(" "));
    }
    lines.push(groups.join("  "));
  }
  return lines.map((line) => `${line}  `).join("\n");
}

function stripTrailingNewlines(bytes: number[]): number[] {
  let end = bytes.length;
  while (end > 0) {
    const last = bytes[end - 1];
    if (last === 0x0d || last === 0x0a) {
      end--;
    } else {
      break;
    }
  }
  return bytes.slice(0, end);
}

export function formatAscii(dataEntries: StreamDataEntry[]): string {
  const text = dataEntries
    .map((entry) => stripTrailingNewlines(entry.data).map(toAsciiChar).join("").replace(/\r\n/g, "\n"))
    .join("\n")
    .trim();
  if (text === "") {
    return "";
  }
  return text
    .split("\n")
    .map((line) => `${line}  `)
    .join("\n");
}

export interface MonitorAppProps {
  status?: StreamStatus;
  logs: LogEntry[];
  dataEntries: StreamDataEntry[];
  onClear: () => void;
  onClose: () => void;
}

export function MonitorApp({ status, logs, dataEntries, onClear, onClose }: MonitorAppProps) {
  const [view, setView] = useState<MonitorView>("streams");
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [displayStatus, setDisplayStatus] = useState<StreamStatus | undefined>(undefined);
  const [displayData, setDisplayData] = useState<StreamDataEntry[]>([]);
  const [displayLogs, setDisplayLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLPreElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(autoScroll);

  useEffect(() => {
    autoScrollRef.current = autoScroll;
  }, [autoScroll]);

  useEffect(() => {
    if (!paused) {
      setDisplayStatus(status);
      setDisplayData(dataEntries);
      setDisplayLogs(logs);
    }
  }, [status, dataEntries, logs, paused]);

  useEffect(() => {
    setAutoScroll(true);
  }, [view]);

  const scrollContentToBottom = useCallback((): void => {
    const element = contentRef.current;
    if (element == undefined) {
      return;
    }
    element.scrollTop = element.scrollHeight - element.clientHeight;
  }, []);

  useEffect(() => {
    if (!paused && view !== "log" && autoScroll) {
      scrollContentToBottom();
    }
  }, [displayStatus, displayData, displayLogs, paused, view, autoScroll, scrollContentToBottom]);

  const handleContentScroll = useCallback((): void => {
    const element = contentRef.current;
    if (element == undefined) {
      return;
    }
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 2;
    if (atBottom !== autoScrollRef.current) {
      setAutoScroll(atBottom);
    }
  }, []);

  const streamsText = useMemo(() => formatStreams(displayStatus), [displayStatus]);
  const hexText = useMemo(() => formatHex(displayData), [displayData]);
  const asciiText = useMemo(() => formatAscii(displayData), [displayData]);

  const clear = (): void => {
    setDisplayStatus(undefined);
    setDisplayData([]);
    setDisplayLogs([]);
    onClear();
  };

  const scrollToBottom = (): void => {
    setAutoScroll(true);
    scrollContentToBottom();
  };

  const isDataView = view !== "log";
  const empty =
    view === "streams"
      ? displayStatus == undefined
      : isDataView
        ? displayData.length === 0
        : displayLogs.length === 0;
  const contentText =
    view === "streams" ? streamsText : view === "hex" ? hexText : view === "ascii" ? asciiText : null;

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box
        sx={{
          height: 34,
          px: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          WebkitAppRegion: "drag",
          appRegion: "drag"
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: "primary.main"
            }}
          />
          <Typography fontSize="0.8125rem" fontWeight={700}>
            Stream Monitor
          </Typography>
        </Stack>
        <IconButton
          aria-label="Close stream monitor"
          onClick={onClose}
          onMouseDown={(event) => event.stopPropagation()}
          sx={{
            p: 0.5,
            WebkitAppRegion: "no-drag",
            appRegion: "no-drag"
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, p: 1, overflow: "hidden" }}>
        <Stack spacing={1} sx={{ height: "100%" }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            sx={{ mt: 0.5 }}
          >
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={view}
                onChange={(event) => setView(event.target.value as MonitorView)}
                variant="outlined"
                size="small"
                IconComponent={KeyboardArrowDownIcon}
                sx={{ fontSize: "0.7rem", height: 26 }}
                MenuProps={menuProps}
              >
                {monitorViews.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Clear screen">
                <IconButton
                  size="small"
                  aria-label="Clear screen"
                  onClick={clear}
                  onMouseDown={(event) => event.stopPropagation()}
                  sx={{ p: 0.5, color: "text.primary" }}
                >
                  <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={paused ? "Resume output" : "Pause output"}>
                <IconButton
                  size="small"
                  aria-label={paused ? "Resume output" : "Pause output"}
                  onClick={() => setPaused((current) => !current)}
                  onMouseDown={(event) => event.stopPropagation()}
                  sx={{ p: 0.5, color: "text.primary" }}
                >
                  {paused ? <PlayArrowIcon sx={{ fontSize: 16 }} /> : <PauseIcon sx={{ fontSize: 16 }} />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Scroll to bottom">
                <IconButton
                  size="small"
                  aria-label="Scroll to bottom"
                  onClick={scrollToBottom}
                  onMouseDown={(event) => event.stopPropagation()}
                  sx={{ p: 0.5, color: "text.primary" }}
                >
                  <VerticalAlignBottomIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          <Paper
            ref={contentRef}
            onScroll={handleContentScroll}
            variant="outlined"
            sx={{
              p: 1,
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              bgcolor: "background.default",
              borderColor: "divider",
              "&::-webkit-scrollbar": {
                width: 10,
                height: 10
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "transparent"
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "text.disabled",
                borderRadius: 5,
                "&:hover": {
                  backgroundColor: "text.secondary"
                }
              },
              "&::-webkit-scrollbar-corner": {
                backgroundColor: "transparent"
              }
            }}
          >
            {empty ? (
              <Typography color="text.secondary" variant="caption" fontSize="0.6875rem">
                {view === "streams" ? "No stream status" : isDataView ? "No input stream data" : "No logs"}
              </Typography>
            ) : isDataView ? (
              <pre
                ref={scrollRef}
                style={{
                  margin: 0,
                  whiteSpace: view === "streams" ? "pre-wrap" : "pre",
                  wordBreak: view === "streams" ? "break-all" : "normal",
                  fontFamily: "monospace",
                  fontSize: 10,
                  lineHeight: 1.4
                }}
              >
                {contentText}
              </pre>
            ) : (
              displayLogs.map((log, index) => (
                <Box
                  key={`${log.time}-${log.message}-${index}`}
                  sx={{
                    py: 0.25,
                    px: 0.5,
                    borderRadius: 0.5,
                    fontFamily: "monospace",
                    fontSize: 10,
                    lineHeight: 1.4,
                    bgcolor: index % 2 === 0 ? "transparent" : "action.hover"
                  }}
                >
                  <span style={{ color: "#888", whiteSpace: "nowrap" }}>{formatLogTime(log.time)}</span>{" "}
                  <span style={{ color: levelColors[log.level], fontWeight: 600, whiteSpace: "nowrap" }}>
                    [{log.level.toUpperCase()}]
                  </span>{" "}
                  <span>{log.message}</span>
                </Box>
              ))
            )}
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}
