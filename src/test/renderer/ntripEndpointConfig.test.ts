import {
  allowedEndpointTypes,
  defaultParamsForType,
  endpointPath,
  endpointSummary,
  formatEndpointType,
  parseNtripAddress
} from "../../renderer/lib/endpointConfig";
import type { StreamEndpoint } from "../../shared/stream";

describe("NTRIP endpoint presentation", () => {
  it("offers an NTRIP client only for input", () => {
    expect(allowedEndpointTypes("input")).toContain("ntrip-client");
    expect(allowedEndpointTypes("output")).not.toContain("ntrip-client");
    expect(formatEndpointType("ntrip-client")).toBe("NTRIP Client");
    expect(defaultParamsForType("ntrip-client")).toMatchObject({ port: 2101, mountpoint: "" });
  });

  it("shows the caster and mountpoint without exposing credentials", () => {
    const endpoint: StreamEndpoint = {
      id: "input",
      enabled: true,
      type: "ntrip-client",
      params: {
        host: "caster.example.com",
        port: 2101,
        mountpoint: "/RTCM3",
        username: "private-user",
        password: "private-password"
      }
    };
    expect(endpointPath(endpoint)).toBe("caster.example.com:2101/RTCM3");
    expect(endpointSummary(endpoint)).toBe("NTRIP client caster.example.com:2101/RTCM3");
  });

  it("parses inline caster addresses including IPv6 and a multi-segment mountpoint", () => {
    expect(parseNtripAddress("caster.example.com:2101/RTCM3")).toEqual({
      host: "caster.example.com",
      port: 2101,
      mountpoint: "RTCM3"
    });
    expect(parseNtripAddress("[::1]:2101/MOUNT/RTCM3")).toEqual({
      host: "::1",
      port: 2101,
      mountpoint: "MOUNT/RTCM3"
    });
    expect(parseNtripAddress("caster:0/MOUNT")).toBeUndefined();
    expect(parseNtripAddress("caster:70000/MOUNT")).toBeUndefined();
    expect(parseNtripAddress("invalid")).toBeUndefined();
  });
});
