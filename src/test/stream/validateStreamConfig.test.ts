import { validateStreamConfig } from "../../main/config/validateStreamConfig";
import { defaultStreamConfig } from "../../shared/stream";

describe("validateStreamConfig", () => {
  it("rejects non-positive buffer sizes", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        options: { ...defaultStreamConfig.options, bufferSize: 0 }
      })
    ).toThrow("bufferSize must be a positive integer");
  });

  it("rejects invalid endpoint ports", () => {
    expect(() =>
      validateStreamConfig({
        ...defaultStreamConfig,
        input: {
          ...defaultStreamConfig.input,
          params: { host: "127.0.0.1", port: 70000 }
        }
      })
    ).toThrow("tcp-server.port must be a port");
  });
});
