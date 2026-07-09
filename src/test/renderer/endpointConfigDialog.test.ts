describe("EndpointConfigDialog source", () => {
  function readSource(): string {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    return fs.readFileSync(
      path.resolve(__dirname, "../../../src/renderer/components/EndpointConfigDialog.tsx"),
      "utf-8"
    );
  }

  it("capitalises Output in the dialog title", () => {
    const source = readSource();
    expect(source).toContain("Configure Output");
    expect(source).not.toContain("Configure output-");
  });

  it("does not expose an Enabled switch", () => {
    const source = readSource();
    expect(source).not.toContain('label="Enabled"');
  });

  it("uses a dropdown select for the serial port", () => {
    const source = readSource();
    expect(source).toContain('label="Serial port"');
    expect(source).toContain('value={serialParams.port ?? ""}');
    expect(source).not.toContain("freeSolo");
    expect(source).toContain("formatSerialPortLabel");
  });

  it("does not render a manual refresh button", () => {
    const source = readSource();
    expect(source).not.toContain("RefreshIcon");
    expect(source).not.toContain("Refresh serial ports");
  });

  it("refreshes serial ports when the dialog opens and when the port dropdown opens", () => {
    const source = readSource();
    expect(source).toContain("if (open) {");
    expect(source).toContain("void onRefreshSerialPorts?.()");
    expect(source).toContain("onOpen:");
  });

  it("keeps advanced serial options collapsed behind an Advanced switch", () => {
    const source = readSource();
    expect(source).toContain("showAdvanced");
    expect(source).toContain("setShowAdvanced");
    expect(source).toContain('label="Advanced"');
    expect(source).toContain("{showAdvanced && (");
    expect(source).toContain('label="Data bits"');
    expect(source).toContain('label="Parity"');
    expect(source).toContain('label="Stop bits"');
    expect(source).toContain('label="Flow"');
  });

  it("renders serial port dropdown items using the Device Manager style label", () => {
    const source = readSource();
    expect(source).toContain("formatSerialPortLabel(port)");
  });

  it("gives Port and Baud the same full width as the Type dropdown", () => {
    const source = readSource();
    const typeIndex = source.indexOf('label="Type"');
    const portIndex = source.indexOf('label="Serial port"');
    const baudIndex = source.indexOf('label="Baud"');
    expect(source.slice(typeIndex, typeIndex + 500)).toContain("fullWidth");
    expect(source.slice(portIndex, portIndex + 500)).toContain("fullWidth");
    expect(source.slice(baudIndex, baudIndex + 500)).toContain("fullWidth");
    expect(source).not.toContain("baudRowSx");
  });

  it("keeps the serial port dropdown font size consistent with other selects", () => {
    const source = readSource();
    expect(source).toContain("denseSelectMenuProps");
    expect(source).not.toMatch(/<MenuItem[^>]*>\s*<Typography[^>]*fontSize=/);
  });

  it("exposes a connect message field for TCP client endpoints", () => {
    const source = readSource();
    expect(source).toContain('label="Connect message (optional)"');
    expect(source).toContain("connectMessage");
    expect(source).toContain("multiline");
  });

  it("exposes file endpoint path and time-tag options", () => {
    const source = readSource();
    expect(source).toContain('label="File path"');
    expect(source).toContain("timeTag");
    expect(source).toContain('label="Time Tag"');
    expect(source).toContain('label="Replay speed"');
    expect(source).toContain('label="Start offset (s)"');
    expect(source).toContain('label="File position bytes"');
  });

  it("uses a dropdown for replay speed with RTKLIB-style speed options", () => {
    const source = readSource();
    expect(source).toContain('label="Replay speed"');
    expect(source).toContain("const replaySpeedOptions = [0.1, 0.2, 0.5, 1, 2, 5, 10]");
    expect(source).toContain("x{speed}");
  });

  it("adds a browse button next to the file path field", () => {
    const source = readSource();
    expect(source).toContain("FolderOpenIcon");
    expect(source).toContain('title="Browse"');
    expect(source).toContain("handleBrowseFile");
    expect(source).toContain("showFileDialog");
  });

  it("shows fixed 0.0.0.0 Host and editable Port for TCP/UDP server endpoints", () => {
    const source = readSource();
    const serverIndex = source.indexOf('draft.type === "tcp-server"');
    expect(serverIndex).toBeGreaterThanOrEqual(0);
    expect(source.indexOf('draft.type === "udp-server"')).toBeGreaterThanOrEqual(0);
    // Server block has a disabled Host field locked to 0.0.0.0 and an editable Port field.
    const serverHostIndex = source.indexOf('value="0.0.0.0"', serverIndex);
    expect(serverHostIndex).toBeGreaterThanOrEqual(0);
    expect(source.indexOf("disabled", serverIndex)).toBeGreaterThanOrEqual(0);
    expect(source.indexOf('label="Port"', serverIndex)).toBeGreaterThanOrEqual(0);
  });

  it("shows Host and Port for TCP/UDP client endpoints", () => {
    const source = readSource();
    expect(source).toContain("isClientEndpoint(draft)");
    expect(source).toContain('label="Host"');
    expect(source).toContain('label="Port"');
  });
});
