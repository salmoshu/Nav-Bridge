import type { StreamMetric, StreamStatus } from "../../shared/stream";

export function formatMetricLabel(index: number): string {
  return `(${index})`;
}

const serverTypes: ReadonlySet<StreamMetric["type"]> = new Set(["tcp-server", "udp-server"]);

export function formatMetricValue(metric: StreamMetric, index: number): string {
  if (index === 0 && metric.status === "connected" && metric.uptime != undefined) {
    return `${metric.uptime.toFixed(1)}s`;
  }
  if (serverTypes.has(metric.type) && metric.status === "connected" && metric.clients != undefined) {
    return `${metric.clients}client${metric.clients === 1 ? "" : "s"}`;
  }
  return metric.status;
}

export function buildStatusLine(status?: StreamStatus, inputUptime?: number): string {
  if (status == undefined) {
    return "(0)idle";
  }
  const inputMetric =
    inputUptime != undefined && status.input.status === "connected"
      ? { ...status.input, uptime: inputUptime }
      : status.input;

  const items: string[] = [];
  if (status.running && inputMetric.type === "file" && inputMetric.status === "idle") {
    items.push(`${formatMetricLabel(0)}stopped · file playback complete`);
  } else {
    items.push(`${formatMetricLabel(0)}${formatMetricValue(inputMetric, 0)}`);
  }
  status.outputs.forEach((output, index) => {
    if (serverTypes.has(output.type)) {
      items.push(`${formatMetricLabel(index + 1)}${formatMetricValue(output, index + 1)}`);
    }
  });
  return items.join("");
}

function formatCompactSegment(index: number, metric: StreamMetric): string {
  const prefix = `(${index})`;

  if (metric.status === "connected") {
    if (serverTypes.has(metric.type) && metric.clients != undefined && metric.clients > 0) {
      return `${prefix}${metric.clients}client${metric.clients === 1 ? "" : "s"}`;
    }
    if (metric.uptime != undefined) {
      return `${prefix}${metric.uptime.toFixed(1)}s`;
    }
    return `${prefix}connected`;
  }

  if (metric.status === "error") {
    return `${prefix}error`;
  }

  return `${prefix}waiting`;
}

export function formatCompactStatus(status: StreamStatus | undefined): string {
  if (status == undefined) {
    return "";
  }
  const endpoints = [status.input, ...status.outputs];
  return endpoints.map((metric, index) => formatCompactSegment(index, metric)).join("");
}
