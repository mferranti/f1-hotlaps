interface TimedDistance {
  distanceM: number;
  elapsedMs: number;
}

/** Distance along a Lap where sector 1 and sector 2 end. Samples are in lap order. */
export function sectorEndDistances(
  samples: readonly TimedDistance[],
  sector1Ms: number,
  sector2Ms: number,
): { sector1M: number | null; sector2M: number | null } {
  const sector1M = sector1Ms > 0 ? distanceAtElapsed(samples, sector1Ms) : null;
  const sector2EndMs = sector1Ms + sector2Ms;
  const sector2M =
    sector2Ms > 0 && sector2EndMs > sector1Ms ? distanceAtElapsed(samples, sector2EndMs) : null;
  if (sector1M != null && sector2M != null && sector2M <= sector1M) return { sector1M, sector2M: null };
  return { sector1M, sector2M };
}

function distanceAtElapsed(samples: readonly TimedDistance[], elapsedMs: number): number | null {
  if (samples.length < 2) return null;
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  if (elapsedMs < first.elapsedMs || elapsedMs > last.elapsedMs) return null;
  for (let index = 1; index < samples.length; index++) {
    const prev = samples[index - 1]!;
    const next = samples[index]!;
    if (next.elapsedMs < elapsedMs) continue;
    const span = next.elapsedMs - prev.elapsedMs;
    if (span <= 0) return next.distanceM;
    const ratio = (elapsedMs - prev.elapsedMs) / span;
    return prev.distanceM + ratio * (next.distanceM - prev.distanceM);
  }
  return last.distanceM;
}
