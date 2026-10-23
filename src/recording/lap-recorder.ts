import { conditionFromWeather } from "@/domain/condition";
import { TraceBuilder } from "@/domain/trace-builder";
import type { CarSetup, CompletedLap, Game } from "@/domain/types";
import {
  DriverStatus,
  PitStatus,
  playerCar,
  recordedTeamId,
  type DecodedPacket,
  type LapHistoryEntry,
} from "@/protocol";

interface PendingLap {
  lapNumber: number;
  lapTimeMs: number;
  sector1Ms: number;
  sector2Ms: number;
  condition: CompletedLap["condition"];
  teamId: number;
  tyreCompound: number;
  trackTempC: number;
  airTempC: number;
  setup: CarSetup;
  finishedAt: number;
  trace: CompletedLap["trace"];
}

/**
 * Decides which finished Laps count. A Lap is stored only if this recorder saw it
 * start, it stayed valid, and Session History confirms it.
 */
export class LapRecorder {
  private sessionUid = "";
  private game: Game = "f1-25";
  private trackId = -1;
  private sessionType = 0;
  private gameMode = 0;
  private weather = 0;
  private trackTempC = 0;
  private airTempC = 0;
  private setup: CarSetup = {};
  private teamId = 255;
  private tyreCompound = 0;
  private lastErs = 0;
  private lastFrame = 0;
  private player = 0;
  private observingLap: number | null = null;
  private started = false;
  private invalid = false;
  private lastDistanceM = 0;
  private lastElapsedMs = 0;
  private lastSector1Ms = 0;
  private lastSector2Ms = 0;
  private trace = new TraceBuilder();
  private pending: PendingLap | null = null;

  /** Drop the Lap in progress (app went to the background without picture-in-picture). */
  reset(): void {
    this.pending = null;
    this.observingLap = null;
    this.started = false;
    this.invalid = false;
    this.trace = new TraceBuilder();
  }

  push(packet: DecodedPacket, nowMs: number): CompletedLap | undefined {
    if (packet.header.sessionUid !== this.sessionUid) {
      this.reset();
      this.sessionUid = packet.header.sessionUid;
      this.game = packet.header.packetFormat === 2026 ? "f1-26" : "f1-25";
    }
    this.player = packet.header.playerCarIndex;
    if (packet.header.frameIdentifier < this.lastFrame) this.invalid = true;
    this.lastFrame = packet.header.frameIdentifier;

    switch (packet.kind) {
      case "session":
        this.weather = packet.data.weather;
        this.trackTempC = packet.data.trackTemperatureC;
        this.airTempC = packet.data.airTemperatureC;
        this.sessionType = packet.data.sessionType;
        this.trackId = packet.data.trackId;
        this.gameMode = packet.data.gameMode;
        return undefined;
      case "participants":
        if (this.player < packet.cars.length) this.teamId = recordedTeamId(playerCar(packet.cars, this.player));
        return undefined;
      case "carSetups":
        if (this.player < packet.cars.length) this.setup = { ...playerCar(packet.cars, this.player) } as CarSetup;
        return undefined;
      case "carStatus":
        if (this.player < packet.cars.length) {
          const car = playerCar(packet.cars, this.player);
          this.tyreCompound = car.actualTyreCompound;
          this.lastErs = car.ersStoreEnergy;
        }
        return undefined;
      case "carTelemetry":
        if (this.started && !this.invalid && this.player < packet.cars.length) {
          const car = playerCar(packet.cars, this.player);
          this.trace.add({
            lapDistanceM: this.lastDistanceM,
            throttle: car.throttle,
            brake: car.brake,
            speedKph: car.speedKph,
            elapsedMs: this.lastElapsedMs,
            gear: car.gear,
            drs: car.drs,
            ers: this.lastErs,
          });
        }
        return undefined;
      case "lapData":
        return this.onLapData(packet, nowMs);
      case "event":
        if (packet.event.code === "FLBK") this.invalid = true;
        if (packet.event.code === "SSTA" || packet.event.code === "SEND") {
          this.reset();
        }
        return undefined;
      case "sessionHistory":
        return packet.data.carIdx === this.player ? this.onHistory(packet.data.laps) : undefined;
      default:
        return undefined;
    }
  }

  private onLapData(packet: Extract<DecodedPacket, { kind: "lapData" }>, nowMs: number): CompletedLap | undefined {
    if (this.player >= packet.cars.length) return undefined;
    const car = playerCar(packet.cars, this.player);
    const sector1Ms = this.lastSector1Ms;
    const sector2Ms = this.lastSector2Ms;
    this.lastDistanceM = car.lapDistanceM;
    this.lastElapsedMs = car.currentLapTimeMs;
    this.lastSector1Ms = car.sector1Ms;
    this.lastSector2Ms = car.sector2Ms;

    this.latchInvalid(car);

    if (this.observingLap === null) {
      this.observingLap = car.currentLapNum;
      this.started = false;
      return undefined;
    }

    if (car.currentLapNum === this.observingLap) return undefined;

    if (this.started && !this.invalid) {
      this.pending = {
        lapNumber: this.observingLap,
        lapTimeMs: car.lastLapTimeMs,
        sector1Ms,
        sector2Ms,
        condition: conditionFromWeather(this.weather),
        teamId: this.teamId,
        tyreCompound: this.tyreCompound,
        trackTempC: this.trackTempC,
        airTempC: this.airTempC,
        setup: { ...this.setup },
        finishedAt: nowMs,
        trace: this.trace.samples(),
      };
    } else {
      this.pending = null;
    }

    this.observingLap = car.currentLapNum;
    this.started = true;
    this.invalid = false;
    this.trace = new TraceBuilder();
    this.lastDistanceM = car.lapDistanceM;
    this.lastElapsedMs = car.currentLapTimeMs;
    this.latchInvalid(car);
    return undefined;
  }

  private latchInvalid(car: { currentLapInvalid: boolean; pitStatus: number; driverStatus: number }): void {
    if (
      car.currentLapInvalid ||
      car.pitStatus !== PitStatus.None ||
      car.driverStatus === DriverStatus.Garage ||
      car.driverStatus === DriverStatus.InLap ||
      car.driverStatus === DriverStatus.OutLap
    ) {
      this.invalid = true;
    }
  }

  private onHistory(laps: readonly LapHistoryEntry[]): CompletedLap | undefined {
    if (!this.pending) return undefined;
    const entry = laps[this.pending.lapNumber - 1];
    if (!entry || entry.lapTimeMs <= 0) return undefined;
    const pending = this.pending;
    this.pending = null;
    if (!entry.lapValid) return undefined;
    return {
      session: {
        game: this.game,
        sessionUid: this.sessionUid,
        trackId: this.trackId,
        sessionType: this.sessionType,
        gameMode: this.gameMode,
      },
      lapNumber: pending.lapNumber,
      lapTimeMs: entry.lapTimeMs,
      sector1Ms: entry.sector1Ms,
      sector2Ms: entry.sector2Ms,
      sector3Ms: entry.sector3Ms,
      condition: pending.condition,
      teamId: pending.teamId,
      tyreCompound: pending.tyreCompound,
      trackTempC: pending.trackTempC,
      airTempC: pending.airTempC,
      setup: pending.setup,
      finishedAt: pending.finishedAt,
      trace: pending.trace,
    };
  }
}
