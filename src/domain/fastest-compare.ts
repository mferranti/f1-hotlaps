import { formatDelta, formatLapTime, formatSectorTime } from "@/domain/format";

export interface TimedSectors {
  lapTimeMs: number;
  sector1Ms: number;
  sector2Ms: number;
  sector3Ms: number;
}

export interface CompareRow {
  label: string;
  lap: string;
  s1: string;
  s2: string;
  s3: string;
}

export function compareToFastest(lap: TimedSectors, fastest: TimedSectors): CompareRow[] {
  return [
    {
      label: "This",
      lap: formatLapTime(lap.lapTimeMs),
      s1: formatSectorTime(lap.sector1Ms),
      s2: formatSectorTime(lap.sector2Ms),
      s3: formatSectorTime(lap.sector3Ms),
    },
    {
      label: "Fastest",
      lap: formatLapTime(fastest.lapTimeMs),
      s1: formatSectorTime(fastest.sector1Ms),
      s2: formatSectorTime(fastest.sector2Ms),
      s3: formatSectorTime(fastest.sector3Ms),
    },
    {
      label: "Delta",
      lap: formatDelta(lap.lapTimeMs - fastest.lapTimeMs),
      s1: formatDelta(lap.sector1Ms - fastest.sector1Ms),
      s2: formatDelta(lap.sector2Ms - fastest.sector2Ms),
      s3: formatDelta(lap.sector3Ms - fastest.sector3Ms),
    },
  ];
}
