import { deltaByDistance } from "@/domain/delta";
import { sectorEndDistances } from "@/domain/sector-distance";
import type { TraceSample } from "@/domain/types";
import { speedValue, type SpeedUnit } from "@/domain/units";
import type { ChartMarker, ChartScale, ChartSeries } from "@/ui/LineChart";
import { colors } from "@/ui/theme";

export const TRACE_GRAPH_IDS = ["speed", "brake", "throttle", "gear", "drs", "ers", "delta"] as const;
export type TraceGraphId = (typeof TRACE_GRAPH_IDS)[number];

const TITLES: Record<TraceGraphId, string> = {
  speed: "Speed",
  brake: "Brake",
  throttle: "Throttle",
  gear: "Gear",
  drs: "DRS",
  ers: "ERS",
  delta: "Delta vs Fastest",
};

export function parseTraceGraphId(value: string | undefined): TraceGraphId | null {
  return TRACE_GRAPH_IDS.includes(value as TraceGraphId) ? (value as TraceGraphId) : null;
}

export function traceGraphTitle(id: TraceGraphId): string {
  return TITLES[id];
}

const GEARS = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8];

function gearLabel(value: number): string {
  if (value === -1) return "R";
  if (value === 0) return "N";
  return String(value);
}

/** Fixed vertical scale for a Trace graph. Speed, ERS, and Delta keep a scale from the samples. */
export function traceGraphScale(id: TraceGraphId): ChartScale | undefined {
  if (id === "throttle" || id === "brake") {
    return { min: 0, max: 100, ticks: [0, 25, 50, 75, 100], format: (value) => `${Math.round(value)}%` };
  }
  if (id === "gear") {
    return { min: -1, max: 8, ticks: GEARS, format: gearLabel };
  }
  if (id === "drs") {
    return { min: 0, max: 1, ticks: [0, 1], format: (value) => (value === 0 ? "Close" : "Open") };
  }
  return undefined;
}

export function traceGraphYLabel(id: TraceGraphId, speedUnit: SpeedUnit): string {
  if (id === "speed") return speedUnit === "mph" ? "Speed (mph)" : "Speed (km/h)";
  if (id === "ers") return "ERS (MJ)";
  if (id === "delta") return "Delta (ms)";
  return TITLES[id];
}

export function traceGraphSeries(
  id: TraceGraphId,
  lap: readonly TraceSample[],
  overlay: readonly TraceSample[] | null,
  speedUnit: SpeedUnit,
): ChartSeries[] {
  if (id === "delta") {
    if (!overlay) return [];
    return deltaLineSeries(deltaByDistance(lap, overlay).map((sample) => ({ x: sample.distanceM, y: sample.deltaMs })));
  }
  const y = (sample: TraceSample) => sampleValue(id, sample, speedUnit);
  const series: ChartSeries[] = [
    { color: colors.accent, points: lap.map((sample) => ({ x: sample.distanceM, y: y(sample) })) },
  ];
  if (overlay) {
    series.push({
      color: colors.compare,
      points: overlay.map((sample) => ({ x: sample.distanceM, y: y(sample) })),
    });
  }
  return series;
}

/** Vertical marks where sector 1 and sector 2 end, labeled for the chart. */
export function traceSectorMarkers(
  samples: readonly TraceSample[],
  sector1Ms: number,
  sector2Ms: number,
): ChartMarker[] {
  const ends = sectorEndDistances(samples, sector1Ms, sector2Ms);
  const markers: ChartMarker[] = [];
  if (ends.sector1M != null) markers.push({ x: ends.sector1M, label: "S1" });
  if (ends.sector2M != null) markers.push({ x: ends.sector2M, label: "S2" });
  return markers;
}

/** Green at or below 0, red above 0, split where the line crosses 0. */
export function deltaLineSeries(points: readonly { x: number; y: number }[]): ChartSeries[] {
  if (points.length < 2) return [];
  const series: ChartSeries[] = [];
  let run: { x: number; y: number }[] = [points[0]!];
  let color = deltaColor(points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const next = points[i]!;
    const nextColor = deltaColor(next.y);
    if (nextColor === color) {
      run.push(next);
      continue;
    }
    const crossing = zeroCrossing(prev, next);
    run.push(crossing);
    series.push({ color, points: run });
    run = [crossing, next];
    color = nextColor;
  }
  series.push({ color, points: run });
  return series;
}

function deltaColor(y: number): string {
  return y <= 0 ? colors.green : colors.accent;
}

function zeroCrossing(from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number } {
  const span = to.y - from.y;
  const t = span === 0 ? 0 : (0 - from.y) / span;
  return { x: from.x + (to.x - from.x) * t, y: 0 };
}

function sampleValue(id: Exclude<TraceGraphId, "delta">, sample: TraceSample, speedUnit: SpeedUnit): number {
  if (id === "speed") return speedValue(sample.speedKph, speedUnit);
  if (id === "ers") return sample.ers / 1_000_000;
  if (id === "throttle" || id === "brake") return sample[id] * 100;
  return sample[id];
}
