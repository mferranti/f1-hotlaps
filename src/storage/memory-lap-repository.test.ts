import type { CompletedLap, SessionInfo } from "@/domain/types";
import type { SessionResult } from "./lap-repository";

import { isUuid } from "./id";
import { MemoryLapRepository } from "./memory-lap-repository";

function lap(overrides: Partial<CompletedLap> & Pick<CompletedLap, "lapTimeMs" | "finishedAt">): CompletedLap {
  return {
    session: info(),
    lapNumber: 1,
    sector1Ms: 25_000,
    sector2Ms: 27_000,
    sector3Ms: 29_000,
    valid: true,
    invalidReason: null,
    condition: "dry",
    teamId: 8,
    tyreCompound: 16,
    visualTyreCompound: 0,
    tyreAgeLaps: 0,
    trackTempC: 40,
    airTempC: 28,
    setup: { frontWing: 8 },
    trace: [{ distanceM: 0, throttle: 1, brake: 0, speedKph: 100, elapsedMs: 0, gear: 4, drs: 0, ers: 0 }],
    ...overrides,
  };
}

describe("MemoryLapRepository", () => {
  it("assigns a uuid when a Session and Lap are stored", async () => {
    const repo = new MemoryLapRepository();
    await repo.commitLap(lap({ lapTimeMs: 90_000, finishedAt: 1 }));
    await repo.commitLap(lap({ lapTimeMs: 91_000, finishedAt: 2, lapNumber: 2 }));

    const data = await repo.readAll();
    expect(data.sessions).toHaveLength(1);
    expect(isUuid(data.sessions[0]?.uuid)).toBe(true);
    expect(data.laps.map((row) => isUuid(row.uuid))).toEqual([true, true]);
    expect(data.laps[0]?.uuid).not.toBe(data.laps[1]?.uuid);
  });

  it("keeps Traces only on Fastest and Latest through the A B C D walkthrough", async () => {
    const repo = new MemoryLapRepository();
    const a = await repo.commitLap(lap({ lapTimeMs: 82_000, finishedAt: 1_000, trace: [sample("a")] }));
    expect(await traces(repo)).toEqual([a]);

    const b = await repo.commitLap(lap({ lapTimeMs: 83_000, finishedAt: 2_000, lapNumber: 2, trace: [sample("b")] }));
    expect(await traces(repo)).toEqual([a, b]);

    const c = await repo.commitLap(lap({ lapTimeMs: 81_000, finishedAt: 3_000, lapNumber: 3, trace: [sample("c")] }));
    expect(await traces(repo)).toEqual([b, c]);
    expect((await repo.getLap(a))?.trace).toBeNull();

    const d = await repo.commitLap(lap({ lapTimeMs: 81_000, finishedAt: 4_000, lapNumber: 4, trace: [sample("d")] }));
    expect(await traces(repo)).toEqual([c, d]);
    const fastest = await repo.getFastestTrace("f1-26", 11, "dry");
    expect(fastest?.lapId).toBe(c);
  });

  it("keeps a Trace on every Lap when retention is all", async () => {
    const repo = new MemoryLapRepository();
    const a = await repo.commitLap(lap({ lapTimeMs: 82_000, finishedAt: 1_000, trace: [sample("a")] }), "all");
    const b = await repo.commitLap(lap({ lapTimeMs: 83_000, finishedAt: 2_000, lapNumber: 2, trace: [sample("b")] }), "all");
    const c = await repo.commitLap(lap({ lapTimeMs: 81_000, finishedAt: 3_000, lapNumber: 3, trace: [sample("c")] }), "all");
    expect(await traces(repo)).toEqual([a, b, c]);
  });

  it("lists Sessions with Team from the last Lap and filters", async () => {
    const repo = new MemoryLapRepository();
    await repo.commitLap(lap({ lapTimeMs: 82_000, finishedAt: 1_000, teamId: 8 }));
    await repo.commitLap(
      lap({
        lapTimeMs: 81_000,
        finishedAt: 2_000,
        lapNumber: 2,
        teamId: 104,
        session: info(),
      }),
    );
    await repo.commitLap(
      lap({
        lapTimeMs: 90_000,
        finishedAt: 3_000,
        session: info({ sessionUid: "race", trackId: 10, sessionType: 15, gameMode: 1 }),
        teamId: 0,
      }),
    );

    const newest = await repo.listSessions();
    expect(newest.map((row) => row.sessionType)).toEqual([18, 15]);
    expect(newest[0]?.teamId).toBe(104);
    expect(newest[0]?.lapCount).toBe(2);
    expect(newest[0]?.fastestLapTimeMs).toBe(81_000);

    const monza = await repo.listSessions({ trackId: 11 });
    expect(monza).toHaveLength(1);
    const teams = await repo.listSessions({ teamId: 0 });
    expect(teams.map((row) => row.sessionType)).toEqual([15]);
    const types = await repo.listSessions({ sessionType: 18 });
    expect(types).toHaveLength(1);

    const detail = await repo.getSession(newest[0]!.id);
    expect(detail?.laps.map((row) => row.finishedAt)).toEqual([1_000, 2_000]);
    expect(await repo.getSession(99)).toBeNull();
  });

  it("stores a Race Result on the Session, including if the Packet arrives before the first Lap", async () => {
    const repo = new MemoryLapRepository();
    await repo.saveSessionResult(result({ sessionUid: "1", position: 1, resultStatus: 3, gridPosition: 4, pitStops: 2, totalRaceTimeMs: 90_500 }));
    const id = await repo.commitLap(
      lap({
        lapTimeMs: 90_000,
        finishedAt: 1_000,
        tyreAgeLaps: 7,
        session: info({ sessionType: 15, gameMode: 1, aiDifficulty: 80, gridPosition: 6, pitStops: 1 }),
      }),
    );
    const before = await repo.getSession((await repo.listSessions())[0]!.id);
    expect(before).toMatchObject({
      aiDifficulty: 80,
      gridPosition: 4,
      pitStops: 2,
      totalRaceTimeMs: 90_500,
    });
    expect(await repo.getLap(id)).toMatchObject({ tyreCompound: 16, tyreAgeLaps: 7 });
    await repo.saveSessionResult(result({ sessionUid: "1", position: 20, resultStatus: 4, gridPosition: 4, pitStops: 3, totalRaceTimeMs: 91_000 }));
    const [row] = await repo.listSessions();
    expect(row).toMatchObject({ position: 20, resultStatus: 4 });
    expect(await repo.getSession(row!.id)).toMatchObject({ gridPosition: 4, pitStops: 3, totalRaceTimeMs: 91_000 });
  });

  it("filters by track and Condition and sorts", async () => {
    const repo = new MemoryLapRepository();
    await repo.commitLap(lap({ lapTimeMs: 90_000, finishedAt: 1, condition: "wet" }));
    await repo.commitLap(lap({ lapTimeMs: 80_000, finishedAt: 2, session: session(16) }));
    await repo.commitLap(lap({ lapTimeMs: 85_000, finishedAt: 3 }));

    const dryMonza = await repo.listLaps({ trackId: 11, condition: "dry", sort: "fastest" });
    expect(dryMonza.map((row) => row.lapTimeMs)).toEqual([85_000]);

    const newest = await repo.listLaps({ sort: "newest" });
    expect(newest.map((row) => row.finishedAt)).toEqual([3, 2, 1]);
    expect(await repo.listTracks()).toEqual([11, 16]);
  });

  it("wipes every Session, Lap, and Trace", async () => {
    const repo = new MemoryLapRepository();
    await repo.commitLap(lap({ lapTimeMs: 80_000, finishedAt: 1 }));
    expect(await repo.usedBytes()).toBeGreaterThan(0);
    await repo.wipeAll();
    expect(await repo.readAll()).toEqual({ sessions: [], laps: [], traces: [] });
    expect(await repo.listLaps({ sort: "newest" })).toEqual([]);
    expect(await repo.usedBytes()).toBe(0);
  });

  it("replaces every Session, Lap, and Trace and keeps the stored ids", async () => {
    const repo = new MemoryLapRepository();
    await repo.saveSessionResult(result({ sessionUid: "later", position: 1, resultStatus: 3 }));
    await repo.commitLap(lap({ lapTimeMs: 90_000, finishedAt: 1 }));
    const incoming = {
      sessions: [
        {
          id: 4,
          uuid: "11111111-1111-4111-8111-111111111111",
          game: "f1-25" as const,
          sessionUid: "restored",
          trackId: 16,
          sessionType: 15,
          gameMode: 1,
          startedAt: 50,
          resultStatus: 2,
          position: 6,
          aiDifficulty: 90,
          gridPosition: 3,
          pitStops: 1,
          totalRaceTimeMs: 5_400_000,
        },
      ],
      laps: [
        {
          id: 7,
          uuid: "22222222-2222-4222-8222-222222222222",
          sessionId: 4,
          game: "f1-25" as const,
          trackId: 16,
          condition: "wet" as const,
          lapNumber: 2,
          lapTimeMs: 95_000,
          sector1Ms: 30_000,
          sector2Ms: 32_000,
          sector3Ms: 33_000,
          valid: true,
          invalidReason: null,
          teamId: 1,
          tyreCompound: 17,
          visualTyreCompound: 16,
          tyreAgeLaps: 11,
          trackTempC: 18,
          airTempC: 16,
          setup: { rearWing: 4 },
          finishedAt: 80,
        },
      ],
      traces: [
        {
          lapId: 7,
          samples: [
            { distanceM: 10, throttle: 0, brake: 1, speedKph: 80, elapsedMs: 400, gear: 2, drs: 0, ers: 0 },
          ],
        },
      ],
    };

    await repo.replaceAll(incoming);

    expect(await repo.readAll()).toEqual(incoming);
    const next = await repo.commitLap(
      lap({
        lapTimeMs: 96_000,
        finishedAt: 90,
        session: info({ sessionUid: "later" }),
      }),
    );
    expect(next).toBe(8);
    const sessions = await repo.listSessions();
    expect(sessions.find((row) => row.trackId === 11)?.position).toBe(0);
  });

  it("keeps an Invalid Lap out of Fastest and can hide it from Sessions", async () => {
    const repo = new MemoryLapRepository();
    const valid = await repo.commitLap(lap({ lapTimeMs: 90_000, finishedAt: 1 }));
    const invalid = await repo.commitLap(lap({ lapTimeMs: 70_000, finishedAt: 2, lapNumber: 2, valid: false }));
    await repo.commitLap(
      lap({
        lapTimeMs: 100_000,
        finishedAt: 3,
        valid: false,
        session: info({ sessionUid: "only-invalid", trackId: 10 }),
      }),
    );

    expect((await repo.getLap(valid))?.role).toBe("fastest");
    expect((await repo.getLap(invalid))?.role).toBeNull();
    expect((await repo.getLap(invalid))?.valid).toBe(false);

    const all = await repo.listSessions();
    expect(all).toHaveLength(2);
    expect(all.find((row) => row.trackId === 11)?.lapCount).toBe(2);
    expect(all.find((row) => row.trackId === 11)?.fastestLapTimeMs).toBe(90_000);

    const visible = await repo.listSessions({ validOnly: true });
    expect(visible).toHaveLength(1);
    expect(visible[0]?.lapCount).toBe(1);
    expect(visible[0]?.fastestLapTimeMs).toBe(90_000);

    await repo.wipeAll(true);
    expect((await repo.listLaps({ sort: "fastest" })).map((row) => row.id)).toEqual([valid]);
  });

  it("can keep the Fastest Lap on each track", async () => {
    const repo = new MemoryLapRepository();
    await repo.commitLap(lap({ lapTimeMs: 90_000, finishedAt: 1 }));
    const fastestMonza = await repo.commitLap(lap({ lapTimeMs: 80_000, finishedAt: 2, lapNumber: 2 }));
    const fastestSpa = await repo.commitLap(
      lap({ lapTimeMs: 108_000, finishedAt: 3, session: { ...session(10), sessionUid: "spa" } }),
    );
    await repo.commitLap(
      lap({ lapTimeMs: 110_000, finishedAt: 4, lapNumber: 2, session: { ...session(10), sessionUid: "spa" } }),
    );
    await repo.wipeAll(true);
    const remaining = await repo.listLaps({ sort: "fastest" });
    expect(remaining.map((row) => row.id)).toEqual([fastestMonza, fastestSpa]);
    expect(await traces(repo)).toEqual([fastestMonza, fastestSpa]);
  });
});

function sample(label: string) {
  return { distanceM: 0, throttle: 1, brake: 0, speedKph: label.length, elapsedMs: 0, gear: 4, drs: 0, ers: 0 };
}

function session(trackId: number): SessionInfo {
  return info({ sessionUid: String(trackId), trackId });
}

function info(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    game: "f1-26",
    sessionUid: "1",
    trackId: 11,
    sessionType: 18,
    gameMode: 5,
    aiDifficulty: -1,
    gridPosition: 0,
    pitStops: 0,
    ...overrides,
  };
}

function result(
  overrides: Partial<SessionResult> & Pick<SessionResult, "sessionUid" | "position" | "resultStatus">,
): SessionResult {
  return { game: "f1-26", gridPosition: 0, pitStops: 0, totalRaceTimeMs: 0, ...overrides };
}

async function traces(repo: MemoryLapRepository) {
  return (await repo.readAll()).traces.map((row) => row.lapId);
}
