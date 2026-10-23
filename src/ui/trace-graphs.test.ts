import { parseTraceGraphId, traceGraphSeries, traceGraphTitle, traceGraphYLabel } from "./trace-graphs";
import type { TraceSample } from "@/domain/types";

function sample(distanceM: number, speedKph: number): TraceSample {
  return { distanceM, throttle: 1, brake: 0, speedKph, elapsedMs: distanceM, gear: 5, drs: 0, ers: 0 };
}

describe("parseTraceGraphId", () => {
  it("accepts a Trace graph id", () => {
    expect(parseTraceGraphId("throttle")).toBe("throttle");
    expect(parseTraceGraphId("nope")).toBeNull();
  });
});

describe("traceGraphTitle", () => {
  it("names Speed", () => {
    expect(traceGraphTitle("speed")).toBe("Speed");
  });
});

describe("traceGraphSeries", () => {
  it("plots this Lap and the Fastest overlay", () => {
    const lap = [sample(0, 100), sample(10, 200)];
    const fastest = [sample(0, 80), sample(10, 180)];
    const series = traceGraphSeries("speed", lap, fastest, "kph");
    expect(series).toHaveLength(2);
    expect(series[0]?.points).toEqual([
      { x: 0, y: 100 },
      { x: 10, y: 200 },
    ]);
  });
});

describe("traceGraphYLabel", () => {
  it("uses mph when that unit is on", () => {
    expect(traceGraphYLabel("speed", "mph")).toBe("Speed (mph)");
  });
});
