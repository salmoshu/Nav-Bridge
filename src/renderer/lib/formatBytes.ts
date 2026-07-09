export function formatBytes(bytes: number): string {
  return `${formatBytesValue(bytes)} ${getByteUnit(bytes)}`;
}

export function formatBytesValue(bytes: number): string {
  if (bytes < 1024) {
    return String(bytes);
  }
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2);
  }
  if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2);
  }
  return (bytes / (1024 * 1024 * 1024)).toFixed(2);
}

export function getByteUnit(bytes: number): "B" | "KB" | "MB" | "GB" {
  if (bytes < 1024) {
    return "B";
  }
  if (bytes < 1024 * 1024) {
    return "KB";
  }
  if (bytes < 1024 * 1024 * 1024) {
    return "MB";
  }
  return "GB";
}
