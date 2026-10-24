import { Paths, File } from "expo-file-system";
import { shareAsync } from "expo-sharing";

import type { CarSetup, Game, TraceSample } from "@/domain/types";

import type { LapRepository, StoredData, StoredLap, StoredSession, StoredTrace } from "./lap-repository";

export const EXPORT_FORMAT_VERSION = 1;

const NOT_AN_EXPORT = "This file is not an F1 Hotlaps export.";

export function exportBody(data: StoredData, now = new Date()): string {
  return JSON.stringify({
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    sessions: data.sessions,
    laps: data.laps,
    traces: data.traces,
  });
}

/** Reads a format 1 export. Pretty-printed and compact files both restore. */
export function parseExport(text: string): StoredData {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(NOT_AN_EXPORT);
  }
  if (!isRecord(value)) throw new Error(NOT_AN_EXPORT);
  if (value.formatVersion !== EXPORT_FORMAT_VERSION) {
    const version = typeof value.formatVersion === "number" ? String(value.formatVersion) : "unknown";
    throw new Error(`This export uses format ${version}. This app reads format ${EXPORT_FORMAT_VERSION}.`);
  }
  if (
    typeof value.exportedAt !== "string" ||
    !Array.isArray(value.sessions) ||
    !Array.isArray(value.laps) ||
    !Array.isArray(value.traces)
  ) {
    throw new Error(NOT_AN_EXPORT);
  }

  const sessions = value.sessions.map(parseSession);
  const laps = value.laps.map(parseLap);
  const traces = value.traces.map(parseTrace);
  const sessionIds = ids(sessions);
  const lapIds = ids(laps);
  const sessionKeys = new Set(sessions.map((session) => JSON.stringify([session.game, session.sessionUid])));
  if (sessionKeys.size !== sessions.length) throw new Error(NOT_AN_EXPORT);
  const traceIds = new Set<number>();
  for (const lap of laps) {
    if (!sessionIds.has(lap.sessionId)) throw new Error(NOT_AN_EXPORT);
  }
  for (const trace of traces) {
    if (!lapIds.has(trace.lapId) || traceIds.has(trace.lapId)) throw new Error(NOT_AN_EXPORT);
    traceIds.add(trace.lapId);
  }
  return { sessions, laps, traces };
}

/** Opens the file picker and parses the chosen export. Returns null when the picker is canceled. */
export async function pickExport(): Promise<StoredData | null> {
  const picked = await File.pickFileAsync();
  if (picked.canceled) return null;
  return parseExport(await picked.result.text());
}

export async function exportLaps(repo: LapRepository, now = new Date()): Promise<void> {
  const body = exportBody(await repo.readAll(), now);
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const file = new File(Paths.cache, `f1-hotlaps-export-${stamp}.json`);
  file.write(body);
  await shareAsync(file.uri, { mimeType: "application/json", UTI: "public.json" });
}

function parseSession(value: unknown): StoredSession {
  if (!isRecord(value)) throw new Error(NOT_AN_EXPORT);
  const id = positiveId(value.id);
  const game = parseGame(value.game);
  const sessionUid = value.sessionUid;
  const trackId = wholeNumber(value.trackId);
  const sessionType = wholeNumber(value.sessionType);
  const gameMode = wholeNumber(value.gameMode);
  const startedAt = wholeNumber(value.startedAt);
  const resultStatus = wholeNumber(value.resultStatus);
  const position = wholeNumber(value.position);
  if (typeof sessionUid !== "string") throw new Error(NOT_AN_EXPORT);
  return { id, game, sessionUid, trackId, sessionType, gameMode, startedAt, resultStatus, position };
}

function parseLap(value: unknown): StoredLap {
  if (!isRecord(value)) throw new Error(NOT_AN_EXPORT);
  const condition = value.condition;
  if (condition !== "dry" && condition !== "wet") throw new Error(NOT_AN_EXPORT);
  return {
    id: positiveId(value.id),
    sessionId: positiveId(value.sessionId),
    game: parseGame(value.game),
    trackId: wholeNumber(value.trackId),
    condition,
    lapNumber: positiveId(value.lapNumber),
    lapTimeMs: wholeNumber(value.lapTimeMs),
    sector1Ms: wholeNumber(value.sector1Ms),
    sector2Ms: wholeNumber(value.sector2Ms),
    sector3Ms: wholeNumber(value.sector3Ms),
    valid: parseValid(value.valid),
    teamId: wholeNumber(value.teamId),
    tyreCompound: wholeNumber(value.tyreCompound),
    trackTempC: finite(value.trackTempC),
    airTempC: finite(value.airTempC),
    setup: parseSetup(value.setup),
    finishedAt: wholeNumber(value.finishedAt),
  };
}

function parseTrace(value: unknown): StoredTrace {
  if (!isRecord(value) || !Array.isArray(value.samples)) throw new Error(NOT_AN_EXPORT);
  return { lapId: positiveId(value.lapId), samples: value.samples.map(parseSample) };
}

function parseSample(value: unknown): TraceSample {
  if (!isRecord(value)) throw new Error(NOT_AN_EXPORT);
  return {
    distanceM: finite(value.distanceM),
    throttle: finite(value.throttle),
    brake: finite(value.brake),
    speedKph: finite(value.speedKph),
    elapsedMs: finite(value.elapsedMs),
    gear: finite(value.gear),
    drs: finite(value.drs),
    ers: finite(value.ers),
  };
}

function parseSetup(value: unknown): CarSetup {
  if (!isRecord(value)) throw new Error(NOT_AN_EXPORT);
  const setup: Record<string, number> = {};
  for (const [key, item] of Object.entries(value)) setup[key] = finite(item);
  return setup;
}

function parseValid(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value === "boolean") return value;
  throw new Error(NOT_AN_EXPORT);
}

function parseGame(value: unknown): Game {
  if (value === "f1-25" || value === "f1-26") return value;
  throw new Error(NOT_AN_EXPORT);
}

function ids(rows: readonly { id: number }[]): Set<number> {
  const seen = new Set(rows.map((row) => row.id));
  if (seen.size !== rows.length) throw new Error(NOT_AN_EXPORT);
  return seen;
}

function positiveId(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  throw new Error(NOT_AN_EXPORT);
}

function wholeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  throw new Error(NOT_AN_EXPORT);
}

function finite(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new Error(NOT_AN_EXPORT);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
