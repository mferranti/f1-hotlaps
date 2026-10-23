import { Paths, File } from "expo-file-system";
import { shareAsync } from "expo-sharing";

import type { LapRepository } from "./lap-repository";

export const EXPORT_FORMAT_VERSION = 1;

export async function exportLaps(repo: LapRepository, now = new Date()): Promise<void> {
  const data = await repo.readAll();
  const body = JSON.stringify(
    {
      formatVersion: EXPORT_FORMAT_VERSION,
      exportedAt: now.toISOString(),
      sessions: data.sessions,
      laps: data.laps,
      traces: data.traces,
    },
    null,
    2,
  );
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const file = new File(Paths.cache, `f1-hotlaps-export-${stamp}.json`);
  file.write(body);
  await shareAsync(file.uri, { mimeType: "application/json", UTI: "public.json" });
}
