import type { TraceRetention } from "@/domain/types";
import type { SpeedUnit, TemperatureUnit } from "@/domain/units";

export const DEFAULT_PORT = 20777;
export const MIN_PORT = 1024;
export const MAX_PORT = 65535;

export interface KvStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface Settings {
  port: number;
  speedUnit: SpeedUnit;
  temperatureUnit: TemperatureUnit;
  traceRetention: TraceRetention;
  /** When true, Invalid Laps are stored. On by default. */
  storeInvalidLaps: boolean;
}

export function validatePort(port: number): boolean {
  return Number.isInteger(port) && port >= MIN_PORT && port <= MAX_PORT;
}

const KEYS = {
  port: "udp.port",
  speedUnit: "units.speed",
  temperatureUnit: "units.temperature",
  traceRetention: "traces.retention",
  storeInvalidLaps: "laps.storeInvalid",
} as const;

export class SettingsRepository {
  constructor(private readonly kv: KvStore) {}

  async get(): Promise<Settings> {
    return {
      port: parsePort(await this.kv.getItem(KEYS.port)),
      speedUnit: parseSpeed(await this.kv.getItem(KEYS.speedUnit)),
      temperatureUnit: parseTemperature(await this.kv.getItem(KEYS.temperatureUnit)),
      traceRetention: parseRetention(await this.kv.getItem(KEYS.traceRetention)),
      storeInvalidLaps: parseStoreInvalid(await this.kv.getItem(KEYS.storeInvalidLaps)),
    };
  }

  async setPort(port: number): Promise<void> {
    if (!validatePort(port)) throw new RangeError(`UDP port ${port} is not in ${MIN_PORT}–${MAX_PORT}`);
    await this.kv.setItem(KEYS.port, String(port));
  }

  async setSpeedUnit(unit: SpeedUnit): Promise<void> {
    await this.kv.setItem(KEYS.speedUnit, unit);
  }

  async setTemperatureUnit(unit: TemperatureUnit): Promise<void> {
    await this.kv.setItem(KEYS.temperatureUnit, unit);
  }

  async setTraceRetention(retention: TraceRetention): Promise<void> {
    await this.kv.setItem(KEYS.traceRetention, retention);
  }

  async setStoreInvalidLaps(store: boolean): Promise<void> {
    await this.kv.setItem(KEYS.storeInvalidLaps, store ? "true" : "false");
  }
}

function parsePort(value: string | null): number {
  if (value === null) return DEFAULT_PORT;
  const port = Number(value);
  return validatePort(port) ? port : DEFAULT_PORT;
}

function parseSpeed(value: string | null): SpeedUnit {
  return value === "mph" ? "mph" : "kph";
}

function parseTemperature(value: string | null): TemperatureUnit {
  return value === "f" ? "f" : "c";
}

function parseRetention(value: string | null): TraceRetention {
  return value === "fastest-latest" ? "fastest-latest" : "all";
}

function parseStoreInvalid(value: string | null): boolean {
  return value !== "false";
}
