import type { TraceSample } from "@/domain/types";

export interface DistanceDelta {
  distanceM: number;
  deltaMs: number;
}

/**
 * This Lap's elapsed time minus the Fastest's at the same distance, at each of this Lap's samples.
 * Both Traces must be sorted by distance. The Fastest's time is interpolated linearly
 * and held at its first or last sample outside its range.
 */
export function deltaByDistance(
  lap: readonly TraceSample[],
  fastest: readonly TraceSample[],
): DistanceDelta[] {
  if (fastest.length === 0) return [];

  let i = 0;
  return lap.map(({ distanceM, elapsedMs }) => {
    while (i < fastest.length - 2 && fastest[i + 1]!.distanceM <= distanceM) i++;
    return { distanceM, deltaMs: elapsedMs - elapsedAt(fastest[i]!, fastest[i + 1], distanceM) };
  });
}

function elapsedAt(from: TraceSample, to: TraceSample | undefined, distanceM: number): number {
  if (!to || distanceM <= from.distanceM) return from.elapsedMs;
  if (distanceM >= to.distanceM) return to.elapsedMs;
  const ratio = (distanceM - from.distanceM) / (to.distanceM - from.distanceM);
  return from.elapsedMs + ratio * (to.elapsedMs - from.elapsedMs);
}
