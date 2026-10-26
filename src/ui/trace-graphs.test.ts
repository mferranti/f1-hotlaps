import type { TraceSample } from "@/domain/types";
import { colors } from "@/ui/theme";

import {
  deltaLineSeries,
  parseTraceGraphId,
  traceGraphSeries,
  traceGraphTitle,
  traceGraphYLabel,
  traceSectorMarkers,
} from "./trace-graphs";

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

describe("traceSectorMarkers", () => {
  it("labels the distance where each sector ends", () => {
    const samples = [sample(0, 0), sample(100, 0), sample(200, 0)].map((point, index) => ({
      ...point,
      elapsedMs: index * 1_000,
    }));
    expect(traceSectorMarkers(samples, 1_000, 1_000)).toEqual([
      { x: 100, label: "S1" },
      { x: 200, label: "S2" },
    ]);
  });
});

describe("deltaLineSeries", () => {
  it("stays green at or below 0 and red above 0", () => {
    expect(deltaLineSeries([{ x: 0, y: -2 }, { x: 10, y: 0 }])).toEqual([
      { color: colors.green, points: [{ x: 0, y: -2 }, { x: 10, y: 0 }] },
    ]);
    expect(deltaLineSeries([{ x: 0, y: 1 }, { x: 10, y: 3 }])).toEqual([
      { color: colors.accent, points: [{ x: 0, y: 1 }, { x: 10, y: 3 }] },
    ]);
  });

  it("splits the line where it crosses 0", () => {
    expect(deltaLineSeries([{ x: 0, y: -10 }, { x: 10, y: 10 }])).toEqual([
      { color: colors.green, points: [{ x: 0, y: -10 }, { x: 5, y: 0 }] },
      { color: colors.accent, points: [{ x: 5, y: 0 }, { x: 10, y: 10 }] },
    ]);
    expect(deltaLineSeries([{ x: 0, y: 10 }, { x: 10, y: -10 }])).toEqual([
      { color: colors.accent, points: [{ x: 0, y: 10 }, { x: 5, y: 0 }] },
      { color: colors.green, points: [{ x: 5, y: 0 }, { x: 10, y: -10 }] },
    ]);
  });
});

describe("traceGraphYLabel", () => {
  it("uses mph when that unit is on", () => {
    expect(traceGraphYLabel("speed", "mph")).toBe("Speed (mph)");
  });
});
