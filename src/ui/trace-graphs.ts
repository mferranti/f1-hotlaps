import { deltaByDistance } from "@/domain/delta";
import type { TraceSample } from "@/domain/types";
import { speedValue, type SpeedUnit } from "@/domain/units";
import type { ChartSeries } from "@/ui/LineChart";
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
    return [
      {
        color: colors.muted,
        points: deltaByDistance(lap, overlay).map((sample) => ({ x: sample.distanceM, y: sample.deltaMs })),
      },
    ];
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

function sampleValue(id: Exclude<TraceGraphId, "delta">, sample: TraceSample, speedUnit: SpeedUnit): number {
  if (id === "speed") return speedValue(sample.speedKph, speedUnit);
  if (id === "ers") return sample.ers / 1_000_000;
  return sample[id];
}
