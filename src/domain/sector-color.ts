export type SectorColor = "purple" | "green" | "yellow";

export interface SectorTimes {
  sessionId: number;
  sector1Ms: number;
  sector2Ms: number;
  sector3Ms: number;
}

/**
 * Purple: fastest of every compared Lap. Green: fastest in this Session but not overall.
 * Yellow: neither. A Session-best that is also the overall best is purple.
 */
export function colorSector(timeMs: number, sessionBestMs: number, overallBestMs: number): SectorColor {
  if (timeMs <= 0) return "yellow";
  if (timeMs === overallBestMs) return "purple";
  if (timeMs === sessionBestMs) return "green";
  return "yellow";
}

export function sectorColors(
  lap: SectorTimes,
  peers: readonly SectorTimes[],
): { sector1: SectorColor; sector2: SectorColor; sector3: SectorColor } {
  const session = peers.filter((peer) => peer.sessionId === lap.sessionId);
  return {
    sector1: colorSector(lap.sector1Ms, best(session, "sector1Ms"), best(peers, "sector1Ms")),
    sector2: colorSector(lap.sector2Ms, best(session, "sector2Ms"), best(peers, "sector2Ms")),
    sector3: colorSector(lap.sector3Ms, best(session, "sector3Ms"), best(peers, "sector3Ms")),
  };
}

function best(laps: readonly SectorTimes[], key: keyof Omit<SectorTimes, "sessionId">): number {
  const times = laps.map((lap) => lap[key]).filter((time) => time > 0);
  return times.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...times);
}
