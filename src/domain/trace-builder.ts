import type { TraceSample } from "@/domain/types";

export interface TraceReading {
  lapDistanceM: number;
  throttle: number;
  brake: number;
  speedKph: number;
  elapsedMs: number;
  gear: number;
  drs: number;
  ers: number;
}

/** Builds a Trace incrementally, keeping the first reading in each distance bucket. */
export class TraceBuilder {
  private readonly trace: TraceSample[] = [];
  private lastBucket = -1;

  constructor(private readonly bucketM = 10) {}

  add(reading: TraceReading): void {
    if (reading.lapDistanceM < 0) return;
    const bucket = Math.floor(reading.lapDistanceM / this.bucketM);
    if (bucket <= this.lastBucket) return;
    this.lastBucket = bucket;
    this.trace.push({
      distanceM: reading.lapDistanceM,
      throttle: reading.throttle,
      brake: reading.brake,
      speedKph: reading.speedKph,
      elapsedMs: reading.elapsedMs,
      gear: reading.gear,
      drs: reading.drs,
      ers: reading.ers,
    });
  }

  samples(): TraceSample[] {
    return [...this.trace];
  }
}
