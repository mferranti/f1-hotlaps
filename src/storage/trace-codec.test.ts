import { decodeTrace, encodeTrace } from "./trace-codec";

const samples = [
  { distanceM: 0, throttle: 0.5, brake: 0, speedKph: 80, elapsedMs: 0, gear: 3, drs: 1, ers: 2_000_000 },
  { distanceM: 10.5, throttle: 1, brake: 0.25, speedKph: 210, elapsedMs: 140, gear: 5, drs: 0, ers: 1_500_000 },
];

describe("trace codec", () => {
  it("round-trips samples", () => {
    expect(decodeTrace(encodeTrace(samples))).toEqual(samples);
  });

  it("round-trips an empty Trace", () => {
    expect(decodeTrace(encodeTrace([]))).toEqual([]);
  });

  it("reads version-1 blobs without gear, DRS, or ERS", () => {
    const bytes = new Uint8Array(20);
    const view = new DataView(bytes.buffer);
    view.setFloat32(0, 12, true);
    view.setFloat32(4, 0.5, true);
    view.setFloat32(8, 0, true);
    view.setFloat32(12, 80, true);
    view.setFloat32(16, 40, true);
    expect(decodeTrace(bytes)).toEqual([
      { distanceM: 12, throttle: 0.5, brake: 0, speedKph: 80, elapsedMs: 40, gear: 0, drs: 0, ers: 0 },
    ]);
  });

  it("rejects a blob whose length is not a sample multiple", () => {
    expect(() => decodeTrace(new Uint8Array(3))).toThrow(/multiple/);
  });
});
