import { Box, Typography } from "@mui/material";
import type { StreamStatus } from "../../shared/stream";
import { StatusCard } from "./StatusCard";

export function StreamList({ status }: { status?: StreamStatus }) {
  if (status == undefined) {
    return <Typography color="text.secondary">等待状态更新</Typography>;
  }

  return (
    <Box display="grid" gap={1.5} gridTemplateColumns={{ xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }}>
      <Box>
        <StatusCard title="Input" metric={status.input} />
      </Box>
      {status.outputs.map((output, index) => (
        <Box key={output.id}>
          <StatusCard title={`Output ${index + 1}`} metric={output} />
        </Box>
      ))}
    </Box>
  );
}
