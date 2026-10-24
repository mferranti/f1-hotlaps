export interface RetentionCandidate {
  id: number;
  lapTimeMs: number;
  finishedAt: number;
  /** Absent means Valid. An Invalid Lap cannot be Fastest or Latest. */
  valid?: boolean;
}

/**
 * Picks which Laps of one group (Game, track, Condition) keep a Trace.
 * Fastest: lowest lap time among Valid Laps, the earlier Lap wins a tie.
 * Latest: most recently finished Valid Lap that is not the Fastest.
 */
export function tracedLaps(group: readonly RetentionCandidate[]): {
  fastestId: number | null;
  latestId: number | null;
} {
  let fastest: RetentionCandidate | undefined;
  for (const lap of group) {
    if (lap.valid === false) continue;
    if (
      !fastest ||
      lap.lapTimeMs < fastest.lapTimeMs ||
      (lap.lapTimeMs === fastest.lapTimeMs && lap.finishedAt < fastest.finishedAt)
    ) {
      fastest = lap;
    }
  }

  let latest: RetentionCandidate | undefined;
  for (const lap of group) {
    if (lap.valid === false || lap === fastest) continue;
    if (!latest || lap.finishedAt > latest.finishedAt) latest = lap;
  }

  return { fastestId: fastest?.id ?? null, latestId: latest?.id ?? null };
}
