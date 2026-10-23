import { exportBody, EXPORT_FORMAT_VERSION, parseExport } from "./export";
import type { StoredData } from "./lap-repository";

const stored: StoredData = {
  sessions: [
    {
      id: 4,
      game: "f1-26",
      sessionUid: "99",
      trackId: 11,
      sessionType: 18,
      gameMode: 5,
      startedAt: 1_700_000_000_000,
      resultStatus: 3,
      position: 1,
    },
  ],
  laps: [
    {
      id: 7,
      sessionId: 4,
      game: "f1-26",
      trackId: 11,
      condition: "dry",
      lapNumber: 3,
      lapTimeMs: 81_234,
      sector1Ms: 25_000,
      sector2Ms: 27_000,
      sector3Ms: 29_234,
      teamId: 8,
      tyreCompound: 16,
      trackTempC: 40.5,
      airTempC: 28,
      setup: { frontWing: 8 },
      finishedAt: 1_700_000_100_000,
    },
  ],
  traces: [
    {
      lapId: 7,
      samples: [
        { distanceM: 0, throttle: 1, brake: 0, speedKph: 100, elapsedMs: 0, gear: 3, drs: 0, ers: 0.5 },
      ],
    },
  ],
};

const exportedAt = new Date("2026-01-02T03:04:05.000Z");

describe("export", () => {
  it("writes compact format 1 JSON that parses back to the same Sessions, Laps, and Traces", () => {
    const body = exportBody(stored, exportedAt);

    expect(body).not.toMatch(/\n/);
    expect(body).toContain(`"formatVersion":${EXPORT_FORMAT_VERSION}`);
    expect(parseExport(body)).toEqual(stored);
  });

  it("reads a pretty-printed format 1 file", () => {
    const pretty = JSON.stringify(JSON.parse(exportBody(stored, exportedAt)), null, 2);

    expect(parseExport(pretty)).toEqual(stored);
  });

  it("rejects a file this app cannot restore", () => {
    expect(() => parseExport("not json")).toThrow("This file is not an F1 Hotlaps export.");
    expect(() => parseExport(JSON.stringify({ formatVersion: 2, exportedAt: "t", sessions: [], laps: [], traces: [] }))).toThrow(
      "This export uses format 2. This app reads format 1.",
    );

    const broken = JSON.parse(exportBody(stored, exportedAt)) as {
      laps: { sessionId: number }[];
    };
    broken.laps[0]!.sessionId = 99;
    expect(() => parseExport(JSON.stringify(broken))).toThrow("This file is not an F1 Hotlaps export.");
  });
});
