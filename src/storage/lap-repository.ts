import type {
  CarSetup,
  CompletedLap,
  Condition,
  Game,
  InvalidReason,
  TraceRetention,
  TraceRole,
  TraceSample,
} from "@/domain/types";
import type { TyreKind } from "@/protocol/tyres";

import type { Page } from "./page";

export type LapSort = "newest" | "fastest";

export interface LapQuery {
  trackId?: number;
  condition?: Condition;
  gameMode?: number;
  teamId?: number;
  sort: LapSort;
}

/** A Lap history page. Filters apply before the cursor, so each page is a full page of matches. */
export interface LapPageQuery extends LapQuery {
  /** When true, Invalid Laps are omitted. */
  validOnly?: boolean;
  /** Painted tyres to keep. Omitted keeps every tyre, including a Lap with no painted tyre. */
  tyreKinds?: readonly TyreKind[];
  cursor?: string | null;
  limit?: number;
}

export interface LapFacets {
  gameModes: number[];
  teamIds: number[];
}

export interface LapSummary {
  id: number;
  sessionId: number;
  game: Game;
  trackId: number;
  sessionType: number;
  gameMode: number;
  teamId: number;
  lapNumber: number;
  lapTimeMs: number;
  sector1Ms: number;
  sector2Ms: number;
  sector3Ms: number;
  /** False when the Lap does not count. */
  valid: boolean;
  condition: Condition;
  /** Actual compound id. 0 when no Car Status was seen. */
  tyreCompound: number;
  /** Visual compound id. 0 when no Car Status was seen. */
  visualTyreCompound: number;
  finishedAt: number;
  hasTrace: boolean;
  role: TraceRole | null;
}

export interface LapDetail extends LapSummary {
  invalidReason: InvalidReason | null;
  tyreAgeLaps: number;
  trackTempC: number;
  airTempC: number;
  setup: CarSetup;
  trace: TraceSample[] | null;
}

export interface StoredSession {
  id: number;
  uuid: string;
  game: Game;
  sessionUid: string;
  trackId: number;
  sessionType: number;
  gameMode: number;
  startedAt: number;
  resultStatus: number;
  position: number;
  /** -1 until a Session Packet is seen. */
  aiDifficulty: number;
  gridPosition: number;
  pitStops: number;
  /** 0 until Final Classification reports a race time. */
  totalRaceTimeMs: number;
}

export interface SessionResult {
  game: Game;
  sessionUid: string;
  position: number;
  resultStatus: number;
  gridPosition: number;
  pitStops: number;
  totalRaceTimeMs: number;
}

export interface StoredLap {
  id: number;
  uuid: string;
  sessionId: number;
  game: Game;
  trackId: number;
  condition: Condition;
  lapNumber: number;
  lapTimeMs: number;
  sector1Ms: number;
  sector2Ms: number;
  sector3Ms: number;
  valid: boolean;
  invalidReason: InvalidReason | null;
  teamId: number;
  tyreCompound: number;
  visualTyreCompound: number;
  tyreAgeLaps: number;
  trackTempC: number;
  airTempC: number;
  setup: CarSetup;
  finishedAt: number;
}

export interface StoredTrace {
  lapId: number;
  samples: TraceSample[];
}

/** Everything stored, in stored units (km/h, °C), ordered by id. */
export interface StoredData {
  sessions: StoredSession[];
  laps: StoredLap[];
  traces: StoredTrace[];
}

export interface SessionQuery {
  trackId?: number;
  teamId?: number;
  sessionType?: number;
  /** When true, Session summaries count Valid Laps only. */
  validOnly?: boolean;
}

export interface SessionPageQuery extends SessionQuery {
  cursor?: string | null;
  limit?: number;
}

export interface SessionFacets {
  trackIds: number[];
  teamIds: number[];
  sessionTypes: number[];
}

export interface SessionSummary {
  id: number;
  game: Game;
  trackId: number;
  sessionType: number;
  gameMode: number;
  teamId: number;
  startedAt: number;
  finishedAt: number;
  lapCount: number;
  fastestLapTimeMs: number;
  resultStatus: number;
  position: number;
}

export interface SessionDetail extends SessionSummary {
  sessionUid: string;
  trackTempC: number;
  airTempC: number;
  aiDifficulty: number;
  gridPosition: number;
  pitStops: number;
  totalRaceTimeMs: number;
  laps: LapSummary[];
}

export interface LapRepository {
  /** Stores the Lap and its Trace, then drops Traces the retention setting does not keep. Returns the Lap id. */
  commitLap(lap: CompletedLap, traceRetention?: TraceRetention): Promise<number>;
  listLaps(query: LapQuery): Promise<LapSummary[]>;
  /** One page of Laps in the query's sort. `nextCursor` is null when no further page exists. */
  listLapPage(query: LapPageQuery): Promise<Page<LapSummary>>;
  /** Game modes and teams on a track, for the history filters. */
  listLapFacets(trackId: number): Promise<LapFacets>;
  listSessions(query?: SessionQuery): Promise<SessionSummary[]>;
  /** One page of Sessions, newest first. `nextCursor` is null when no further page exists. */
  listSessionPage(query?: SessionPageQuery): Promise<Page<SessionSummary>>;
  /** Tracks, teams, and Session types for the history filters. */
  listSessionFacets(query?: Pick<SessionQuery, "validOnly">): Promise<SessionFacets>;
  getSession(id: number): Promise<SessionDetail | null>;
  saveSessionResult(result: SessionResult): Promise<void>;
  getLap(id: number): Promise<LapDetail | null>;
  getFastestTrace(game: Game, trackId: number, condition: Condition): Promise<StoredTrace | null>;
  /** Track ids that have at least one Lap, ascending. */
  listTracks(): Promise<number[]>;
  readAll(): Promise<StoredData>;
  /** Bytes used by stored Sessions, Laps, and Traces. */
  usedBytes(): Promise<number>;
  /** Deletes stored Laps. When keepFastest is true, the Fastest Lap in each group remains. This cannot be undone. */
  wipeAll(keepFastest?: boolean): Promise<void>;
  /** Replaces every stored Session, Lap, and Trace. This cannot be undone. */
  replaceAll(data: StoredData): Promise<void>;
}
