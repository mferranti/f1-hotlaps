import { tracedLaps, type RetentionCandidate } from "@/domain/trace-retention";
import type { CompletedLap, Condition, Game, TraceRetention, TraceRole } from "@/domain/types";
import { tyreFilterMatches } from "@/protocol/tyres";

import type {
  LapFacets,
  LapPageQuery,
  LapQuery,
  LapSort,
  LapSummary,
  SessionFacets,
  SessionPageQuery,
  SessionQuery,
  SessionSummary,
  StoredLap,
  StoredSession,
} from "./lap-repository";
import { PAGE_SIZE, pageBy, type Page } from "./page";

export interface GroupedLap extends RetentionCandidate {
  game: Game;
  trackId: number;
  condition: Condition;
}

/** Ids of the Laps in one group (game, track, Condition) that keep a Trace. */
export function keptTraceIds(
  group: readonly RetentionCandidate[],
  retention: TraceRetention = "fastest-latest",
): number[] {
  if (retention === "all") return group.map((lap) => lap.id);
  const { fastestId, latestId } = tracedLaps(group);
  return [fastestId, latestId].filter((id): id is number => id !== null);
}

/** Fastest Lap id in each Game, track, and Condition group. */
export function fastestIds(laps: readonly GroupedLap[]): number[] {
  const ids: number[] = [];
  for (const group of grouped(laps).values()) {
    const { fastestId } = tracedLaps(group);
    if (fastestId !== null) ids.push(fastestId);
  }
  return ids;
}

/** Fastest or Latest role of every Lap; pass whole groups or the roles are wrong. */
export function traceRoles(laps: readonly GroupedLap[]): Map<number, TraceRole> {
  const roles = new Map<number, TraceRole>();
  for (const group of grouped(laps).values()) {
    const { fastestId, latestId } = tracedLaps(group);
    if (fastestId !== null) roles.set(fastestId, "fastest");
    if (latestId !== null) roles.set(latestId, "latest");
  }
  return roles;
}

function grouped(laps: readonly GroupedLap[]): Map<string, GroupedLap[]> {
  const groups = new Map<string, GroupedLap[]>();
  for (const lap of laps) {
    const key = `${lap.game}|${lap.trackId}|${lap.condition}`;
    const group = groups.get(key);
    if (group) group.push(lap);
    else groups.set(key, [lap]);
  }
  return groups;
}

export function matchesQuery(
  lap: { trackId: number; condition: Condition; gameMode?: number; teamId?: number },
  query: Pick<LapQuery, "trackId" | "condition" | "gameMode" | "teamId">,
): boolean {
  return (
    (query.trackId === undefined || lap.trackId === query.trackId) &&
    (query.condition === undefined || lap.condition === query.condition) &&
    (query.gameMode === undefined || lap.gameMode === query.gameMode) &&
    (query.teamId === undefined || lap.teamId === query.teamId)
  );
}

/** A Session row is created by its first committed Lap, so it starts when that Lap started. */
export function sessionStartedAt(firstLap: CompletedLap): number {
  return firstLap.finishedAt - firstLap.lapTimeMs;
}

type SortableLap = RetentionCandidate;

const comparators: Record<LapSort, (a: SortableLap, b: SortableLap) => number> = {
  newest: (a, b) => b.finishedAt - a.finishedAt || b.id - a.id,
  fastest: (a, b) => a.lapTimeMs - b.lapTimeMs || a.finishedAt - b.finishedAt || a.id - b.id,
};

export function sortLaps<T extends SortableLap>(laps: readonly T[], sort: LapSort): T[] {
  return [...laps].sort(comparators[sort]);
}

/** Position in the Lap sort. The id breaks a tie the same way `sortLaps` does. */
function lapCursor(lap: Pick<LapSummary, "finishedAt" | "lapTimeMs" | "id">, sort: LapSort): string {
  return sort === "newest" ? `n:${lap.finishedAt}:${lap.id}` : `f:${lap.lapTimeMs}:${lap.finishedAt}:${lap.id}`;
}

function sessionCursor(session: Pick<SessionSummary, "startedAt" | "id">): string {
  return `s:${session.startedAt}:${session.id}`;
}

function matchesLapPage(lap: LapSummary, query: LapPageQuery): boolean {
  if (query.validOnly && !lap.valid) return false;
  if (query.tyreKinds === undefined) return true;
  return tyreFilterMatches(lap.visualTyreCompound, lap.tyreCompound, new Set(query.tyreKinds));
}

/** `laps` is already sorted. Valid and tyre filters run before the cursor. */
export function lapPage(laps: readonly LapSummary[], query: LapPageQuery): Page<LapSummary> {
  const filtered = laps.filter((lap) => matchesLapPage(lap, query));
  return pageBy(filtered, query.cursor, query.limit ?? PAGE_SIZE, (lap) => lapCursor(lap, query.sort));
}

/** `sessions` is already newest-first. */
export function sessionPage(sessions: readonly SessionSummary[], query: SessionPageQuery = {}): Page<SessionSummary> {
  return pageBy(sessions, query.cursor, query.limit ?? PAGE_SIZE, sessionCursor);
}

export function lapFacets(laps: readonly Pick<LapSummary, "gameMode" | "teamId">[]): LapFacets {
  return {
    gameModes: uniqueSorted(laps.map((lap) => lap.gameMode)),
    teamIds: uniqueSorted(laps.map((lap) => lap.teamId)),
  };
}

export function sessionFacets(
  sessions: readonly Pick<SessionSummary, "trackId" | "teamId" | "sessionType">[],
): SessionFacets {
  return {
    trackIds: uniqueSorted(sessions.map((session) => session.trackId)),
    teamIds: uniqueSorted(sessions.map((session) => session.teamId)),
    sessionTypes: uniqueSorted(sessions.map((session) => session.sessionType)),
  };
}

function uniqueSorted(values: readonly number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

export function matchesSessionQuery(
  session: Pick<SessionSummary, "trackId" | "teamId" | "sessionType">,
  query: SessionQuery,
): boolean {
  return (
    (query.trackId === undefined || session.trackId === query.trackId) &&
    (query.teamId === undefined || session.teamId === query.teamId) &&
    (query.sessionType === undefined || session.sessionType === query.sessionType)
  );
}

export function sessionLapsOldestFirst<T extends { finishedAt: number; id: number }>(laps: readonly T[]): T[] {
  return [...laps].sort((a, b) => a.finishedAt - b.finishedAt || a.id - b.id);
}

export function toSessionSummary(session: StoredSession, laps: readonly StoredLap[]): SessionSummary {
  const ordered = sessionLapsOldestFirst(laps);
  const last = ordered[ordered.length - 1];
  const timed = ordered.filter((lap) => lap.valid);
  let fastest = timed[0]?.lapTimeMs ?? 0;
  for (const lap of timed) if (lap.lapTimeMs < fastest) fastest = lap.lapTimeMs;
  return {
    id: session.id,
    game: session.game,
    trackId: session.trackId,
    sessionType: session.sessionType,
    gameMode: session.gameMode,
    teamId: last?.teamId ?? 0,
    startedAt: session.startedAt,
    finishedAt: last?.finishedAt ?? session.startedAt,
    lapCount: ordered.length,
    fastestLapTimeMs: fastest,
    resultStatus: session.resultStatus,
    position: session.position,
  };
}

export function sortSessionsNewest(sessions: readonly SessionSummary[]): SessionSummary[] {
  return [...sessions].sort((a, b) => b.startedAt - a.startedAt || b.id - a.id);
}

export function toLapSummary(
  lap: StoredLap,
  session: Pick<StoredSession, "sessionType" | "gameMode">,
  hasTrace: boolean,
  role: TraceRole | null,
): LapSummary {
  return {
    id: lap.id,
    sessionId: lap.sessionId,
    game: lap.game,
    trackId: lap.trackId,
    sessionType: session.sessionType,
    gameMode: session.gameMode,
    teamId: lap.teamId,
    lapNumber: lap.lapNumber,
    lapTimeMs: lap.lapTimeMs,
    sector1Ms: lap.sector1Ms,
    sector2Ms: lap.sector2Ms,
    sector3Ms: lap.sector3Ms,
    valid: lap.valid,
    condition: lap.condition,
    tyreCompound: lap.tyreCompound,
    visualTyreCompound: lap.visualTyreCompound,
    finishedAt: lap.finishedAt,
    hasTrace,
    role,
  };
}

export function listSessionSummaries(
  sessions: readonly StoredSession[],
  laps: readonly StoredLap[],
  query: SessionQuery = {},
): SessionSummary[] {
  const counted = query.validOnly ? laps.filter((lap) => lap.valid) : laps;
  const bySession = new Map<number, StoredLap[]>();
  for (const lap of counted) {
    const group = bySession.get(lap.sessionId);
    if (group) group.push(lap);
    else bySession.set(lap.sessionId, [lap]);
  }
  const summaries = sessions
    .map((session) => toSessionSummary(session, bySession.get(session.id) ?? []))
    .filter((session) => session.lapCount > 0 && matchesSessionQuery(session, query));
  return sortSessionsNewest(summaries);
}
