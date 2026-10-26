import type { CompletedLap, Condition, Game, TraceRetention } from "@/domain/types";
import type { SQLiteDatabase } from "expo-sqlite";

import { getDatabase } from "./db";
import type {
  LapDetail,
  LapFacets,
  LapPageQuery,
  LapQuery,
  LapRepository,
  LapSummary,
  SessionDetail,
  SessionFacets,
  SessionPageQuery,
  SessionQuery,
  SessionResult,
  SessionSummary,
  StoredData,
  StoredLap,
  StoredTrace,
} from "./lap-repository";
import {
  fastestIds,
  keptTraceIds,
  lapFacets,
  lapPage,
  listSessionSummaries,
  matchesQuery,
  sessionFacets,
  sessionLapsOldestFirst,
  sessionPage,
  sessionStartedAt,
  sortLaps,
  toLapSummary,
  toSessionSummary,
  traceRoles,
} from "./lap-rules";
import type { Page } from "./page";
import { newUuid } from "./id";
import { decodeTrace, encodeTrace } from "./trace-codec";

type LapRow = {
  id: number;
  uuid: string;
  session_id: number;
  game: Game;
  track_id: number;
  condition: Condition;
  lap_number: number;
  lap_time_ms: number;
  sector1_ms: number;
  sector2_ms: number;
  sector3_ms: number;
  valid: number;
  invalid_reason: string;
  team_id: number;
  tyre_compound: number;
  visual_tyre_compound: number;
  tyre_age_laps: number;
  track_temp_c: number;
  air_temp_c: number;
  setup_json: string;
  finished_at: number;
  session_type: number;
  game_mode: number;
};

/** SQLite LapRepository. Screens talk to this through the interface, never the database. */
export class SqliteLapRepository implements LapRepository {
  private pendingResults = new Map<string, SessionResult>();

  constructor(private readonly open: () => Promise<SQLiteDatabase> = getDatabase) {}

  async commitLap(lap: CompletedLap, traceRetention: TraceRetention = "fastest-latest"): Promise<number> {
    const db = await this.open();
    let id = 0;
    await db.withTransactionAsync(async () => {
      const sessionId = await this.findOrCreateSession(db, lap);
      const result = await db.runAsync(
        `INSERT INTO laps (
          session_id, uuid, game, track_id, condition, lap_number, lap_time_ms,
          sector1_ms, sector2_ms, sector3_ms, valid, invalid_reason, team_id, tyre_compound, visual_tyre_compound, tyre_age_laps, track_temp_c, air_temp_c,
          setup_json, finished_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        sessionId,
        newUuid(),
        lap.session.game,
        lap.session.trackId,
        lap.condition,
        lap.lapNumber,
        lap.lapTimeMs,
        lap.sector1Ms,
        lap.sector2Ms,
        lap.sector3Ms,
        lap.valid ? 1 : 0,
        lap.invalidReason ?? "",
        lap.teamId,
        lap.tyreCompound,
        lap.visualTyreCompound,
        lap.tyreAgeLaps,
        lap.trackTempC,
        lap.airTempC,
        JSON.stringify(lap.setup),
        lap.finishedAt,
      );
      id = Number(result.lastInsertRowId);
      await db.runAsync("INSERT INTO traces (lap_id, samples) VALUES (?, ?)", id, encodeTrace(lap.trace));
      const group = await db.getAllAsync<{ id: number; lap_time_ms: number; finished_at: number }>(
        "SELECT id, lap_time_ms, finished_at FROM laps WHERE game = ? AND track_id = ? AND condition = ?",
        lap.session.game,
        lap.session.trackId,
        lap.condition,
      );
      const kept = new Set(
        keptTraceIds(
          group.map((row) => ({ id: row.id, lapTimeMs: row.lap_time_ms, finishedAt: row.finished_at })),
          traceRetention,
        ),
      );
      for (const row of group) {
        if (!kept.has(row.id)) await db.runAsync("DELETE FROM traces WHERE lap_id = ?", row.id);
      }
    });
    return id;
  }

  async listLaps(query: LapQuery): Promise<LapSummary[]> {
    const db = await this.open();
    const rows = await db.getAllAsync<LapRow>(
      `SELECT laps.*, sessions.session_type AS session_type, sessions.game_mode AS game_mode
       FROM laps JOIN sessions ON sessions.id = laps.session_id`,
    );
    const laps = rows.filter((row) =>
      matchesQuery(
        { trackId: row.track_id, condition: row.condition, gameMode: row.game_mode, teamId: row.team_id },
        query,
      ),
    );
    const roles = traceRoles(laps.map(toGrouped));
    const traced = new Set(
      (await db.getAllAsync<{ lap_id: number }>("SELECT lap_id FROM traces")).map((row) => row.lap_id),
    );
    return sortLaps(laps.map(toGrouped), query.sort).map((sorted) => {
      const row = laps.find((candidate) => candidate.id === sorted.id)!;
      return toLapSummary(
        toStoredLap(row),
        { sessionType: row.session_type, gameMode: row.game_mode },
        traced.has(row.id),
        roles.get(row.id) ?? null,
      );
    });
  }

  async listLapPage(query: LapPageQuery): Promise<Page<LapSummary>> {
    return lapPage(await this.listLaps(query), query);
  }

  async listLapFacets(trackId: number): Promise<LapFacets> {
    return lapFacets(await this.listLaps({ trackId, sort: "newest" }));
  }

  async listSessions(query: SessionQuery = {}): Promise<SessionSummary[]> {
    const db = await this.open();
    const sessions = await db.getAllAsync<StoredSessionRow>("SELECT * FROM sessions");
    const laps = await db.getAllAsync<LapRow>("SELECT * FROM laps");
    return listSessionSummaries(sessions.map(toStoredSession), laps.map(toStoredLap), query);
  }

  async listSessionPage(query: SessionPageQuery = {}): Promise<Page<SessionSummary>> {
    return sessionPage(await this.listSessions(query), query);
  }

  async listSessionFacets(query: Pick<SessionQuery, "validOnly"> = {}): Promise<SessionFacets> {
    return sessionFacets(await this.listSessions(query));
  }

  async saveSessionResult(result: SessionResult): Promise<void> {
    const db = await this.open();
    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM sessions WHERE game = ? AND session_uid = ?",
      result.game,
      result.sessionUid,
    );
    if (!existing) {
      this.pendingResults.set(`${result.game}|${result.sessionUid}`, result);
      return;
    }
    await db.runAsync(
      `UPDATE sessions SET result_status = ?, position = ?, grid_position = ?, pit_stops = ?, total_race_time_ms = ?
       WHERE id = ?`,
      result.resultStatus,
      result.position,
      result.gridPosition,
      result.pitStops,
      result.totalRaceTimeMs,
      existing.id,
    );
  }

  async getSession(id: number): Promise<SessionDetail | null> {
    const db = await this.open();
    const row = await db.getFirstAsync<StoredSessionRow>("SELECT * FROM sessions WHERE id = ?", id);
    if (!row) return null;
    const session = toStoredSession(row);
    const lapRows = await db.getAllAsync<LapRow>("SELECT * FROM laps WHERE session_id = ?", id);
    const laps = sessionLapsOldestFirst(lapRows.map(toStoredLap));
    const last = laps[laps.length - 1];
    const roles = traceRoles(
      (await db.getAllAsync<LapRow>("SELECT * FROM laps")).map(toGrouped),
    );
    const traced = new Set(
      (await db.getAllAsync<{ lap_id: number }>("SELECT lap_id FROM traces")).map((trace) => trace.lap_id),
    );
    return {
      ...toSessionSummary(session, laps),
      sessionUid: session.sessionUid,
      trackTempC: last?.trackTempC ?? 0,
      airTempC: last?.airTempC ?? 0,
      aiDifficulty: session.aiDifficulty,
      gridPosition: session.gridPosition,
      pitStops: session.pitStops,
      totalRaceTimeMs: session.totalRaceTimeMs,
      laps: laps.map((lap) => toLapSummary(lap, session, traced.has(lap.id), roles.get(lap.id) ?? null)),
    };
  }

  async getLap(id: number): Promise<LapDetail | null> {
    const db = await this.open();
    const row = await db.getFirstAsync<LapRow>(
      `SELECT laps.*, sessions.session_type AS session_type, sessions.game_mode AS game_mode
       FROM laps JOIN sessions ON sessions.id = laps.session_id WHERE laps.id = ?`,
      id,
    );
    if (!row) return null;
    const group = await db.getAllAsync<LapRow>(
      "SELECT * FROM laps WHERE game = ? AND track_id = ? AND condition = ?",
      row.game,
      row.track_id,
      row.condition,
    );
    const roles = traceRoles(group.map(toGrouped));
    const traceRow = await db.getFirstAsync<{ samples: Uint8Array }>("SELECT samples FROM traces WHERE lap_id = ?", id);
    return {
      ...toStoredLap(row),
      sessionType: row.session_type,
      gameMode: row.game_mode,
      hasTrace: traceRow !== null,
      role: roles.get(id) ?? null,
      trace: traceRow ? decodeTrace(traceRow.samples) : null,
    };
  }

  async getFastestTrace(game: Game, trackId: number, condition: Condition): Promise<StoredTrace | null> {
    const db = await this.open();
    const group = await db.getAllAsync<LapRow>(
      "SELECT * FROM laps WHERE game = ? AND track_id = ? AND condition = ?",
      game,
      trackId,
      condition,
    );
    const roles = traceRoles(group.map(toGrouped));
    for (const [lapId, role] of roles) {
      if (role !== "fastest") continue;
      const traceRow = await db.getFirstAsync<{ samples: Uint8Array }>(
        "SELECT samples FROM traces WHERE lap_id = ?",
        lapId,
      );
      if (traceRow) return { lapId, samples: decodeTrace(traceRow.samples) };
    }
    return null;
  }

  async listTracks(): Promise<number[]> {
    const db = await this.open();
    const rows = await db.getAllAsync<{ track_id: number }>(
      "SELECT DISTINCT track_id FROM laps ORDER BY track_id",
    );
    return rows.map((row) => row.track_id);
  }

  async wipeAll(keepFastest = false): Promise<void> {
    this.pendingResults.clear();
    const db = await this.open();
    await db.withTransactionAsync(async () => {
      if (keepFastest) {
        const rows = await db.getAllAsync<LapRow>("SELECT * FROM laps");
        const kept = fastestIds(rows.map(toGrouped));
        if (kept.length > 0) {
          const placeholders = kept.map(() => "?").join(", ");
          await db.runAsync(`DELETE FROM traces WHERE lap_id NOT IN (${placeholders})`, ...kept);
          await db.runAsync(`DELETE FROM laps WHERE id NOT IN (${placeholders})`, ...kept);
          await db.runAsync("DELETE FROM sessions WHERE id NOT IN (SELECT DISTINCT session_id FROM laps)");
          return;
        }
      }
      await db.runAsync("DELETE FROM traces");
      await db.runAsync("DELETE FROM laps");
      await db.runAsync("DELETE FROM sessions");
    });
  }

  async usedBytes(): Promise<number> {
    const db = await this.open();
    const pages = await db.getFirstAsync<{ page_count: number }>("PRAGMA page_count");
    const size = await db.getFirstAsync<{ page_size: number }>("PRAGMA page_size");
    return (pages?.page_count ?? 0) * (size?.page_size ?? 0);
  }

  async replaceAll(data: StoredData): Promise<void> {
    const db = await this.open();
    await db.withTransactionAsync(async () => {
      await db.runAsync("DELETE FROM traces");
      await db.runAsync("DELETE FROM laps");
      await db.runAsync("DELETE FROM sessions");
      for (const session of data.sessions) {
        await db.runAsync(
          `INSERT INTO sessions (
            id, uuid, game, session_uid, track_id, session_type, game_mode, started_at, result_status, position,
            ai_difficulty, grid_position, pit_stops, total_race_time_ms
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          session.id,
          session.uuid,
          session.game,
          session.sessionUid,
          session.trackId,
          session.sessionType,
          session.gameMode,
          session.startedAt,
          session.resultStatus,
          session.position,
          session.aiDifficulty,
          session.gridPosition,
          session.pitStops,
          session.totalRaceTimeMs,
        );
      }
      for (const lap of data.laps) {
        await db.runAsync(
          `INSERT INTO laps (
            id, uuid, session_id, game, track_id, condition, lap_number, lap_time_ms,
            sector1_ms, sector2_ms, sector3_ms, valid, invalid_reason, team_id, tyre_compound, visual_tyre_compound, tyre_age_laps, track_temp_c, air_temp_c,
            setup_json, finished_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          lap.id,
          lap.uuid,
          lap.sessionId,
          lap.game,
          lap.trackId,
          lap.condition,
          lap.lapNumber,
          lap.lapTimeMs,
          lap.sector1Ms,
          lap.sector2Ms,
          lap.sector3Ms,
          lap.valid ? 1 : 0,
          lap.invalidReason ?? "",
          lap.teamId,
          lap.tyreCompound,
          lap.visualTyreCompound,
          lap.tyreAgeLaps,
          lap.trackTempC,
          lap.airTempC,
          JSON.stringify(lap.setup),
          lap.finishedAt,
        );
      }
      for (const trace of data.traces) {
        await db.runAsync("INSERT INTO traces (lap_id, samples) VALUES (?, ?)", trace.lapId, encodeTrace(trace.samples));
      }
    });
    this.pendingResults.clear();
  }

  async readAll(): Promise<StoredData> {
    const db = await this.open();
    const sessions = await db.getAllAsync<StoredSessionRow>("SELECT * FROM sessions ORDER BY id");
    const laps = await db.getAllAsync<LapRow>("SELECT * FROM laps ORDER BY id");
    const traces = await db.getAllAsync<{ lap_id: number; samples: Uint8Array }>(
      "SELECT lap_id, samples FROM traces ORDER BY lap_id",
    );
    return {
      sessions: sessions.map((row) => ({
        id: row.id,
        uuid: row.uuid,
        game: row.game,
        sessionUid: row.session_uid,
        trackId: row.track_id,
        sessionType: row.session_type,
        gameMode: row.game_mode,
        startedAt: row.started_at,
        resultStatus: row.result_status,
        position: row.position,
        aiDifficulty: row.ai_difficulty,
        gridPosition: row.grid_position,
        pitStops: row.pit_stops,
        totalRaceTimeMs: row.total_race_time_ms,
      })),
      laps: laps.map(toStoredLap),
      traces: traces.map((row) => ({ lapId: row.lap_id, samples: decodeTrace(row.samples) })),
    };
  }

  private async findOrCreateSession(db: SQLiteDatabase, lap: CompletedLap): Promise<number> {
    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM sessions WHERE game = ? AND session_uid = ?",
      lap.session.game,
      lap.session.sessionUid,
    );
    if (existing) {
      await db.runAsync(
        "UPDATE sessions SET ai_difficulty = ?, grid_position = ?, pit_stops = ? WHERE id = ?",
        lap.session.aiDifficulty,
        lap.session.gridPosition,
        lap.session.pitStops,
        existing.id,
      );
      return existing.id;
    }
    const pending = this.pendingResults.get(`${lap.session.game}|${lap.session.sessionUid}`);
    this.pendingResults.delete(`${lap.session.game}|${lap.session.sessionUid}`);
    const result = await db.runAsync(
      `INSERT INTO sessions (
        uuid, game, session_uid, track_id, session_type, game_mode, started_at, result_status, position,
        ai_difficulty, grid_position, pit_stops, total_race_time_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newUuid(),
      lap.session.game,
      lap.session.sessionUid,
      lap.session.trackId,
      lap.session.sessionType,
      lap.session.gameMode,
      sessionStartedAt(lap),
      pending?.resultStatus ?? 0,
      pending?.position ?? 0,
      lap.session.aiDifficulty,
      pending?.gridPosition ?? lap.session.gridPosition,
      pending?.pitStops ?? lap.session.pitStops,
      pending?.totalRaceTimeMs ?? 0,
    );
    return Number(result.lastInsertRowId);
  }
}

type StoredSessionRow = {
  id: number;
  uuid: string;
  game: Game;
  session_uid: string;
  track_id: number;
  session_type: number;
  game_mode: number;
  started_at: number;
  result_status: number;
  position: number;
  ai_difficulty: number;
  grid_position: number;
  pit_stops: number;
  total_race_time_ms: number;
};

function toStoredSession(row: StoredSessionRow) {
  return {
    id: row.id,
    uuid: row.uuid,
    game: row.game,
    sessionUid: row.session_uid,
    trackId: row.track_id,
    sessionType: row.session_type,
    gameMode: row.game_mode,
    startedAt: row.started_at,
    resultStatus: row.result_status,
    position: row.position,
    aiDifficulty: row.ai_difficulty,
    gridPosition: row.grid_position,
    pitStops: row.pit_stops,
    totalRaceTimeMs: row.total_race_time_ms,
  };
}

function toStoredLap(row: LapRow): StoredLap {
  return {
    id: row.id,
    uuid: row.uuid,
    sessionId: row.session_id,
    game: row.game,
    trackId: row.track_id,
    condition: row.condition,
    lapNumber: row.lap_number,
    lapTimeMs: row.lap_time_ms,
    sector1Ms: row.sector1_ms,
    sector2Ms: row.sector2_ms,
    sector3Ms: row.sector3_ms,
    valid: Number(row.valid) !== 0,
    invalidReason: row.invalid_reason === "flashback" ? "flashback" : null,
    teamId: row.team_id,
    tyreCompound: row.tyre_compound,
    visualTyreCompound: row.visual_tyre_compound,
    tyreAgeLaps: row.tyre_age_laps,
    trackTempC: row.track_temp_c,
    airTempC: row.air_temp_c,
    setup: JSON.parse(row.setup_json) as Record<string, number>,
    finishedAt: row.finished_at,
  };
}

function toGrouped(row: LapRow) {
  return {
    id: row.id,
    lapTimeMs: row.lap_time_ms,
    finishedAt: row.finished_at,
    valid: Number(row.valid) !== 0,
    game: row.game,
    trackId: row.track_id,
    condition: row.condition,
  };
}
