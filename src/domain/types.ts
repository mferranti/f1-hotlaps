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
  /** -1 until a Session Packet arrives. */
  aiDifficulty: number;
  gridPosition: number;
  pitStops: number;
}

export interface CompletedLap {
  session: SessionInfo;
  lapNumber: number;
  lapTimeMs: number;
  sector1Ms: number;
  sector2Ms: number;
  sector3Ms: number;
  /** False when the Lap does not count. */
  valid: boolean;
  /** Why the Lap is Invalid, when that is known. The Game's mark has no reason. */
  invalidReason: InvalidReason | null;
  condition: Condition;
  teamId: number;
  tyreCompound: number;
  /** Visual type from Car Status. 0 when that Packet was not seen. */
  visualTyreCompound: number;
  /** Laps already completed on this set when the Lap finished. */
  tyreAgeLaps: number;
  trackTempC: number;
  airTempC: number;
  setup: CarSetup;
  /** Epoch ms from the phone clock when the Lap finished. */
  finishedAt: number;
  trace: TraceSample[];
}

/** A cause the app can name. The Game does not say why it marked a Lap Invalid. */
export type InvalidReason = "flashback";

export type TraceRole = "fastest" | "latest";

/** Which Laps keep a Trace: only Fastest and Latest, or every stored Lap. */
export type TraceRetention = "fastest-latest" | "all";
