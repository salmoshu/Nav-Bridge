/** @jest-environment jsdom */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { EndpointConfigDialog } from "../../renderer/components/EndpointConfigDialog";
import { createDefaultEndpoint } from "../../renderer/lib/endpointConfig";
import type { StreamMode, StreamEndpoint } from "../../shared/stream";

describe("new endpoint configuration controls", () => {
  function showConfig(endpoint: StreamEndpoint, mode: StreamMode) {
    const onSave = jest.fn();
    render(
      React.createElement(EndpointConfigDialog, {
        open: true,
        endpoint,
        mode,
        serialPorts: [{ path: "COM3" }],
        onClose: jest.fn(),
        onSave
      })
    );
    return onSave;
  }

  it("saves caster credentials and mountpoint for an NTRIP input", () => {
    const save = showConfig(createDefaultEndpoint("input", "ntrip-client"), "input");
    fireEvent.change(screen.getByLabelText("Host"), { target: { value: "caster.example.com" } });
    fireEvent.change(screen.getByLabelText("Port"), { target: { value: "2101" } });
    fireEvent.change(screen.getByLabelText("Mountpoint"), { target: { value: "RTCM3" } });
    fireEvent.change(screen.getByLabelText("Username (optional)"), { target: { value: "rover" } });
    const password = screen.getByLabelText("Password (optional)");
    expect(password.getAttribute("type")).toBe("password");
    fireEvent.change(password, { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ntrip-client",
        params: {
          host: "caster.example.com",
          port: 2101,
          mountpoint: "RTCM3",
          username: "rover",
          password: "secret"
        }
      })
    );
  });

  it("lets a serial output enable, configure and disable its received stream outlet", () => {
    const endpoint = createDefaultEndpoint("output-1", "serial");
    const save = showConfig(endpoint, "output");
    expect(screen.queryByLabelText("Received stream TCP port")).toBeNull();
    fireEvent.click(screen.getByLabelText("Output received stream to TCP port"));
    fireEvent.change(screen.getByLabelText("Received stream TCP port"), { target: { value: "3000" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ outputTcpPort: 3000 }) })
    );
    fireEvent.click(screen.getByLabelText("Output received stream to TCP port"));
    expect(screen.queryByLabelText("Received stream TCP port")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ outputTcpPort: undefined }) })
    );
  });

  it("does not show the received stream option for a serial input", () => {
    showConfig(createDefaultEndpoint("input", "serial"), "input");
    expect(screen.queryByLabelText("Output received stream to TCP port")).toBeNull();
  });
});
