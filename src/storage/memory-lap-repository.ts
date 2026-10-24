import type { CompletedLap, Condition, Game, TraceRetention, TraceSample } from "@/domain/types";

import type {
  LapDetail,
  LapQuery,
  LapRepository,
  LapSummary,
  SessionDetail,
  SessionQuery,
  SessionResult,
  SessionSummary,
  StoredData,
  StoredLap,
  StoredSession,
  StoredTrace,
} from "./lap-repository";
import {
  fastestIds,
  keptTraceIds,
  listSessionSummaries,
  matchesQuery,
  sessionLapsOldestFirst,
  sessionStartedAt,
  sortLaps,
  toLapSummary,
  toSessionSummary,
  traceRoles,
} from "./lap-rules";
import { encodeTrace } from "./trace-codec";

/** Same behaviour as the SQLite repository, kept in memory for tests. */
export class MemoryLapRepository implements LapRepository {
  private sessions: StoredSession[] = [];
  private laps: StoredLap[] = [];
  private traces = new Map<number, TraceSample[]>();
  private pendingResults = new Map<string, Pick<SessionResult, "position" | "resultStatus">>();

  async commitLap(lap: CompletedLap, traceRetention: TraceRetention = "fastest-latest"): Promise<number> {
    const session = this.findOrCreateSession(lap);
    const id = this.nextId(this.laps);
    this.laps.push({
      id,
      sessionId: session.id,
      game: lap.session.game,
      trackId: lap.session.trackId,
      condition: lap.condition,
      lapNumber: lap.lapNumber,
      lapTimeMs: lap.lapTimeMs,
      sector1Ms: lap.sector1Ms,
      sector2Ms: lap.sector2Ms,
      sector3Ms: lap.sector3Ms,
      valid: lap.valid,
      teamId: lap.teamId,
      tyreCompound: lap.tyreCompound,
      trackTempC: lap.trackTempC,
      airTempC: lap.airTempC,
      setup: { ...lap.setup },
      finishedAt: lap.finishedAt,
    });
    this.traces.set(id, lap.trace.map((sample) => ({ ...sample })));

    const group = this.group(lap.session.game, lap.session.trackId, lap.condition);
    const kept = new Set(keptTraceIds(group, traceRetention));
    for (const member of group) {
      if (!kept.has(member.id)) this.traces.delete(member.id);
    }
    return id;
  }

  async listLaps(query: LapQuery): Promise<LapSummary[]> {
    const laps = this.laps.filter((lap) => {
      const session = this.session(lap.sessionId);
      return matchesQuery(
        { trackId: lap.trackId, condition: lap.condition, gameMode: session.gameMode, teamId: lap.teamId },
        query,
      );
    });
    const roles = traceRoles(laps);
    return sortLaps(laps, query.sort).map((lap) =>
      toLapSummary(lap, this.session(lap.sessionId), this.traces.has(lap.id), roles.get(lap.id) ?? null),
    );
  }

  async listSessions(query: SessionQuery = {}): Promise<SessionSummary[]> {
    return listSessionSummaries(this.sessions, this.laps, query);
  }

  async saveSessionResult(result: SessionResult): Promise<void> {
    const session = this.sessions.find((row) => row.game === result.game && row.sessionUid === result.sessionUid);
    if (!session) {
      this.pendingResults.set(`${result.game}|${result.sessionUid}`, {
        position: result.position,
        resultStatus: result.resultStatus,
      });
      return;
    }
    session.position = result.position;
    session.resultStatus = result.resultStatus;
  }

  async getSession(id: number): Promise<SessionDetail | null> {
    const session = this.sessions.find((candidate) => candidate.id === id);
    if (!session) return null;
    const laps = sessionLapsOldestFirst(this.laps.filter((lap) => lap.sessionId === id));
    const roles = traceRoles(this.laps);
    const last = laps[laps.length - 1];
    return {
      ...toSessionSummary(session, laps),
      sessionUid: session.sessionUid,
      trackTempC: last?.trackTempC ?? 0,
      airTempC: last?.airTempC ?? 0,
      laps: laps.map((lap) => toLapSummary(lap, session, this.traces.has(lap.id), roles.get(lap.id) ?? null)),
    };
  }

  async getLap(id: number): Promise<LapDetail | null> {
    const lap = this.laps.find((candidate) => candidate.id === id);
    if (!lap) return null;
    const roles = traceRoles(this.group(lap.game, lap.trackId, lap.condition));
    const trace = this.traces.get(id);
    return {
      ...lap,
      setup: { ...lap.setup },
      sessionType: this.session(lap.sessionId).sessionType,
      gameMode: this.session(lap.sessionId).gameMode,
      hasTrace: trace !== undefined,
      role: roles.get(id) ?? null,
      trace: trace ? trace.map((sample) => ({ ...sample })) : null,
    };
  }

  async getFastestTrace(game: Game, trackId: number, condition: Condition): Promise<StoredTrace | null> {
    const roles = traceRoles(this.group(game, trackId, condition));
    for (const [lapId, role] of roles) {
      const samples = this.traces.get(lapId);
      if (role === "fastest" && samples) return { lapId, samples: samples.map((s) => ({ ...s })) };
    }
    return null;
  }

  async listTracks(): Promise<number[]> {
    return [...new Set(this.laps.map((lap) => lap.trackId))].sort((a, b) => a - b);
  }

  async wipeAll(keepFastest = false): Promise<void> {
    if (keepFastest) {
      const kept = new Set(fastestIds(this.laps));
      this.laps = this.laps.filter((lap) => kept.has(lap.id));
      this.traces = new Map([...this.traces.entries()].filter(([id]) => kept.has(id)));
      const sessionIds = new Set(this.laps.map((lap) => lap.sessionId));
      this.sessions = this.sessions.filter((session) => sessionIds.has(session.id));
      return;
    }
    this.sessions = [];
    this.laps = [];
    this.traces.clear();
    this.pendingResults.clear();
  }

  async usedBytes(): Promise<number> {
    let bytes = 0;
    for (const samples of this.traces.values()) bytes += encodeTrace(samples).byteLength;
    for (const lap of this.laps) bytes += JSON.stringify(lap.setup).length;
    return bytes;
  }

  async replaceAll(data: StoredData): Promise<void> {
    this.sessions = data.sessions.map((session) => ({ ...session }));
    this.laps = data.laps.map((lap) => ({ ...lap, setup: { ...lap.setup } }));
    this.traces = new Map(
      data.traces.map((trace) => [trace.lapId, trace.samples.map((sample) => ({ ...sample }))]),
    );
    this.pendingResults.clear();
  }

  async readAll(): Promise<StoredData> {
    return {
      sessions: this.sessions.map((session) => ({ ...session })),
      laps: this.laps.map((lap) => ({ ...lap, setup: { ...lap.setup } })),
      traces: [...this.traces.entries()]
        .sort(([a], [b]) => a - b)
        .map(([lapId, samples]) => ({ lapId, samples: samples.map((s) => ({ ...s })) })),
    };
  }

  private findOrCreateSession(lap: CompletedLap): StoredSession {
    const { game, sessionUid, trackId, sessionType, gameMode } = lap.session;
    const existing = this.sessions.find((s) => s.game === game && s.sessionUid === sessionUid);
    if (existing) return existing;
    const pending = this.pendingResults.get(`${game}|${sessionUid}`);
    this.pendingResults.delete(`${game}|${sessionUid}`);
    const session: StoredSession = {
      id: this.nextId(this.sessions),
      game,
      sessionUid,
      trackId,
      sessionType,
      gameMode,
      startedAt: sessionStartedAt(lap),
      resultStatus: pending?.resultStatus ?? 0,
      position: pending?.position ?? 0,
    };
    this.sessions.push(session);
    return session;
  }

  private nextId(rows: readonly { id: number }[]): number {
    return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
  }

  private session(id: number): StoredSession {
    const session = this.sessions.find((candidate) => candidate.id === id);
    if (!session) throw new Error(`Session ${id} not found`);
    return session;
  }

  private group(game: Game, trackId: number, condition: Condition): StoredLap[] {
    return this.laps.filter(
      (lap) => lap.game === game && lap.trackId === trackId && lap.condition === condition,
    );
  }
}
