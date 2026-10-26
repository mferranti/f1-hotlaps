import type { PacketHeader } from "./header";

export interface SessionData {
  weather: number;
  trackTemperatureC: number;
  airTemperatureC: number;
  sessionType: number;
  trackId: number;
  gameMode: number;
  /** 0–110. -1 when the Packet was too short to include it. */
  aiDifficulty: number;
}

export interface LapData {
  lastLapTimeMs: number;
  currentLapTimeMs: number;
  sector1Ms: number;
  sector2Ms: number;
  lapDistanceM: number;
  currentLapNum: number;
  pitStatus: number;
  numPitStops: number;
  currentLapInvalid: boolean;
  /** 0 when the car has no grid, such as practice. */
  gridPosition: number;
  driverStatus: number;
}

export type EventData =
  | { code: "FLBK"; flashbackFrameIdentifier: number; flashbackSessionTime: number }
  | { code: "SSTA" }
  | { code: "SEND" }
  | { code: string };

export interface CarSetupData {
  frontWing: number;
  rearWing: number;
  onThrottle: number;
  offThrottle: number;
  frontCamber: number;
  rearCamber: number;
  frontToe: number;
  rearToe: number;
  frontSuspension: number;
  rearSuspension: number;
  frontAntiRollBar: number;
  rearAntiRollBar: number;
  frontSuspensionHeight: number;
  rearSuspensionHeight: number;
  brakePressure: number;
  brakeBias: number;
  engineBraking: number;
  rearLeftTyrePressure: number;
  rearRightTyrePressure: number;
  frontLeftTyrePressure: number;
  frontRightTyrePressure: number;
  ballast: number;
  fuelLoad: number;
}

export interface CarTelemetryData {
  speedKph: number;
  throttle: number;
  brake: number;
  gear: number;
  drs: number;
}

export interface CarStatusData {
  actualTyreCompound: number;
  /** Visual type: soft, medium, hard, intermediate, or wet. */
  visualTyreCompound: number;
  /** Laps on the current set. */
  tyresAgeLaps: number;
  ersStoreEnergy: number;
}

export interface ParticipantData {
  teamId: number;
  /** ParticipantData.m_myTeam: 1 = My F1 Team. */
  myTeam: boolean;
}

export interface LapHistoryEntry {
  lapTimeMs: number;
  sector1Ms: number;
  sector2Ms: number;
  sector3Ms: number;
  lapValid: boolean;
}

export interface SessionHistoryData {
  carIdx: number;
  numLaps: number;
  laps: LapHistoryEntry[];
}

export interface FinalClassificationData {
  position: number;
  resultStatus: number;
  gridPosition: number;
  numPitStops: number;
  /** Total race time in seconds, without penalties. 0 when the Game did not report one. */
  totalRaceTimeS: number;
}

export type DecodedBody =
  | { kind: "session"; data: SessionData }
  | { kind: "lapData"; cars: LapData[] }
  | { kind: "event"; event: EventData }
  | { kind: "participants"; cars: ParticipantData[] }
  | { kind: "carSetups"; cars: CarSetupData[] }
  | { kind: "carTelemetry"; cars: CarTelemetryData[] }
  | { kind: "carStatus"; cars: CarStatusData[] }
  | { kind: "sessionHistory"; data: SessionHistoryData }
  | { kind: "finalClassification"; cars: FinalClassificationData[] }
  /** Supported format, but a packet id this app does not read. */
  | { kind: "undecoded" };

export type DecodedPacket = DecodedBody & { header: PacketHeader };

export type PacketDecoder = (bytes: Uint8Array, playerCarIndex: number) => DecodedBody;

export interface GameDecoder {
  packetFormat: number;
  decoders: Partial<Record<number, PacketDecoder>>;
}

export const DriverStatus = {
  Garage: 0,
  FlyingLap: 1,
  InLap: 2,
  OutLap: 3,
  OnTrack: 4,
} as const;

export const PitStatus = {
  None: 0,
  Pitting: 1,
  InPitArea: 2,
} as const;

/** LapData / FinalClassificationData m_resultStatus. */
export const ResultStatus = {
  Invalid: 0,
  Inactive: 1,
  Active: 2,
  Finished: 3,
  DidNotFinish: 4,
  Disqualified: 5,
  NotClassified: 6,
  Retired: 7,
} as const;

export function playerCar<T>(cars: readonly T[], playerCarIndex: number): T {
  const car = cars[playerCarIndex];
  if (car === undefined) {
    throw new RangeError(`playerCarIndex ${playerCarIndex} is outside ${cars.length} cars`);
  }
  return car;
}
