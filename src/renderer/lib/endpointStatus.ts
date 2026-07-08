import type { ConnectionStatus, StreamMetric, StreamStatus, StreamType } from "../../shared/stream";

const idleStatus: ConnectionStatus = "idle";

export function buildStatusMap(
  status: StreamStatus | undefined,
  fallbackType: StreamType = "tcp-server"
): Record<string, StreamMetric> {
  const map: Record<string, StreamMetric> = {};

  if (status != undefined) {
    map[status.input.id] = status.input;
    for (const output of status.outputs) {
      map[output.id] = output;
    }
  }

  return new Proxy(map, {
    get(target, property): StreamMetric {
      if (typeof property !== "string") {
        return idleMetric("", fallbackType);
      }
      return (
        target[property] ?? {
          id: property,
          type: fallbackType,
          status: idleStatus,
          bytes: 0,
          bps: 0
        }
      );
    }
  });
}

function idleMetric(id: string, type: StreamType): StreamMetric {
  return { id, type, status: idleStatus, bytes: 0, bps: 0 };
}
