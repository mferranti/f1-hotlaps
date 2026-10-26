import type { TraceSample } from "@/domain/types";
import { colors } from "@/ui/theme";

import {
  deltaLineSeries,
  parseTraceGraphId,
  traceGraphScale,
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

describe("traceGraphScale", () => {
  it("plots throttle and brake from 0% to 100%", () => {
    const lap = [
      { ...sample(0, 100), throttle: 0, brake: 0.25 },
      { ...sample(10, 200), throttle: 1, brake: 0.5 },
    ];
    expect(traceGraphSeries("throttle", lap, null, "kph")[0]?.points).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 100 },
    ]);
    expect(traceGraphSeries("brake", lap, null, "kph")[0]?.points).toEqual([
      { x: 0, y: 25 },
      { x: 10, y: 50 },
    ]);
    const scale = traceGraphScale("throttle");
    expect(scale).toMatchObject({ min: 0, max: 100, ticks: [0, 25, 50, 75, 100] });
    expect(scale?.ticks?.map((tick) => scale.format?.(tick))).toEqual(["0%", "25%", "50%", "75%", "100%"]);
    expect(traceGraphScale("brake")?.format?.(100)).toBe("100%");
  });

  it("labels gears from reverse through 8", () => {
    const scale = traceGraphScale("gear");
    expect(scale).toMatchObject({ min: -1, max: 8, ticks: [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8] });
    expect(scale?.ticks?.map((tick) => scale.format?.(tick))).toEqual(["R", "N", "1", "2", "3", "4", "5", "6", "7", "8"]);
  });

  it("labels DRS closed at the bottom and open at the top", () => {
    const scale = traceGraphScale("drs");
    expect(scale).toMatchObject({ min: 0, max: 1, ticks: [0, 1] });
    expect(scale?.format?.(0)).toBe("Close");
    expect(scale?.format?.(1)).toBe("Open");
  });
});

describe("traceGraphYLabel", () => {
  it("uses mph when that unit is on", () => {
    expect(traceGraphYLabel("speed", "mph")).toBe("Speed (mph)");
  });
});
