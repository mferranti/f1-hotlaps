import type { Game } from "@/domain/types";
import { imperialUnits, type SpeedUnit, type TemperatureUnit } from "@/domain/units";

/** F1 25 or F1 26. */
export function formatGame(game: Game): string {
  return game === "f1-26" ? "F1 26" : "F1 25";
}

/** Formats a lap or sector time as m:ss.mmm, e.g. 1:21.034. */
export function formatLapTime(ms: number): string {
  const total = Math.round(ms);
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const millis = total % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

/** Sector times under a minute drop the 0: prefix, e.g. 23.456. */
export function formatSectorTime(ms: number): string {
  const formatted = formatLapTime(ms);
  return formatted.startsWith("0:") ? formatted.slice(2) : formatted;
}

/** Stored size in megabytes, e.g. 0.0 MB or 2.4 MB. */
export function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** `dd/mm/yy`, or `mm/dd/yy` when the metric system is mph and °F. */
export function formatShortDate(ms: number, speedUnit: SpeedUnit, temperatureUnit: TemperatureUnit): string {
  const date = new Date(ms);
  const month = twoDigits(date.getMonth() + 1);
  const day = twoDigits(date.getDate());
  const year = twoDigits(date.getFullYear() % 100);
  return imperialUnits(speedUnit, temperatureUnit) ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
}

/** Local clock time as HH:mm. */
export function formatShortTime(ms: number): string {
  const date = new Date(ms);
  return `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

/** Formats a time delta against the Fastest as signed seconds, e.g. +0.123 or -1.450. */
export function formatDelta(ms: number): string {
  const total = Math.round(ms);
  const sign = total < 0 ? "-" : "+";
  return `${sign}${(Math.abs(total) / 1000).toFixed(3)}`;
}
