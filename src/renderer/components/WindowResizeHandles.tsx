import { Box } from "@mui/material";
import { type MouseEvent, useEffect, useRef } from "react";
import type { WindowResizeEdge } from "../../shared/ipc";
import { useNavBridgeAPI } from "../hooks/useNavBridgeAPI";

const handleThicknessPx = 6;

export function WindowResizeHandles() {
  const api = useNavBridgeAPI();
  const resizing = useRef(false);

  const stopResize = (): void => {
    if (!resizing.current) return;
    resizing.current = false;
    void api.stopWindowResize();
  };

  useEffect(() => {
    window.addEventListener("mouseup", stopResize);
    window.addEventListener("blur", stopResize);
    return () => {
      window.removeEventListener("mouseup", stopResize);
      window.removeEventListener("blur", stopResize);
      stopResize();
    };
  }, [api]);

  const startResize = (edge: WindowResizeEdge) => (event: MouseEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    resizing.current = true;
    void api.startWindowResize(edge);
  };

  return (
    <>
      <Box
        data-testid="window-resize-top"
        onMouseDown={startResize("top")}
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: handleThicknessPx,
          cursor: "ns-resize",
          zIndex: (theme) => theme.zIndex.tooltip + 1
        }}
      />
      <Box
        data-testid="window-resize-bottom"
        onMouseDown={startResize("bottom")}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: handleThicknessPx,
          cursor: "ns-resize",
          zIndex: (theme) => theme.zIndex.tooltip + 1
        }}
      />
    </>
  );
}
