export type Game = "f1-25" | "f1-26";

export type Condition = "dry" | "wet";

export interface TraceSample {
  distanceM: number;
  throttle: number;
  brake: number;
  speedKph: number;
  elapsedMs: number;
  gear: number;
  drs: number;
  ers: number;
}

export type CarSetup = Readonly<Record<string, number>>;

export interface SessionInfo {
  game: Game;
  sessionUid: string;
  trackId: number;
  sessionType: number;
  gameMode: number;
}

export interface CompletedLap {
  session: SessionInfo;
  lapNumber: number;
  lapTimeMs: number;
  sector1Ms: number;
  sector2Ms: number;
  sector3Ms: number;
  condition: Condition;
  teamId: number;
  tyreCompound: number;
  trackTempC: number;
  airTempC: number;
  setup: CarSetup;
  /** Epoch ms from the phone clock when the Lap finished. */
  finishedAt: number;
  trace: TraceSample[];
}

export type TraceRole = "fastest" | "latest";

/** Which Laps keep a Trace: only Fastest and Latest, or every stored Lap. */
export type TraceRetention = "fastest-latest" | "all";
