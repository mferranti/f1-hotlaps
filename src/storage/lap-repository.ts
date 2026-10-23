import type {
  CarSetup,
  CompletedLap,
  Condition,
  Game,
  TraceRetention,
  TraceRole,
  TraceSample,
} from "@/domain/types";

export type LapSort = "newest" | "fastest";

export interface LapQuery {
  trackId?: number;
  condition?: Condition;
  gameMode?: number;
  teamId?: number;
  sort: LapSort;
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
  condition: Condition;
  finishedAt: number;
  hasTrace: boolean;
  role: TraceRole | null;
}

export interface LapDetail extends LapSummary {
  tyreCompound: number;
  trackTempC: number;
  airTempC: number;
  setup: CarSetup;
  trace: TraceSample[] | null;
}

export interface StoredSession {
  id: number;
  game: Game;
  sessionUid: string;
  trackId: number;
  sessionType: number;
  gameMode: number;
  startedAt: number;
  resultStatus: number;
  position: number;
}

export interface SessionResult {
  game: Game;
  sessionUid: string;
  position: number;
  resultStatus: number;
}

export interface StoredLap {
  id: number;
  sessionId: number;
  game: Game;
  trackId: number;
  condition: Condition;
  lapNumber: number;
  lapTimeMs: number;
  sector1Ms: number;
  sector2Ms: number;
  sector3Ms: number;
  teamId: number;
  tyreCompound: number;
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
  laps: LapSummary[];
}

export interface LapRepository {
  /** Stores the Lap and its Trace, then drops Traces the retention setting does not keep. Returns the Lap id. */
  commitLap(lap: CompletedLap, traceRetention?: TraceRetention): Promise<number>;
  listLaps(query: LapQuery): Promise<LapSummary[]>;
  listSessions(query?: SessionQuery): Promise<SessionSummary[]>;
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
