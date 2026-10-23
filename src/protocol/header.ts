import { ByteReader } from "./byte-reader";

export const HEADER_SIZE = 29;

export const PacketId = {
  Motion: 0,
  Session: 1,
  LapData: 2,
  Event: 3,
  Participants: 4,
  CarSetups: 5,
  CarTelemetry: 6,
  CarStatus: 7,
  FinalClassification: 8,
  LobbyInfo: 9,
  CarDamage: 10,
  SessionHistory: 11,
  TyreSets: 12,
  MotionEx: 13,
  TimeTrial: 14,
  LapPositions: 15,
  /** F1 26 only. */
  CarTelemetry2: 16,
} as const;

export interface PacketHeader {
  packetFormat: number;
  gameYear: number;
  gameMajorVersion: number;
  gameMinorVersion: number;
  packetVersion: number;
  packetId: number;
  /** uint64 as a decimal string so it survives JSON and SQLite. */
  sessionUid: string;
  sessionTime: number;
  frameIdentifier: number;
  /** Does not go back after a flashback. */
  overallFrameIdentifier: number;
  playerCarIndex: number;
  /** 255 when there is no second player. */
  secondaryPlayerCarIndex: number;
}

/** Packet format is the first uint16; used when we only need a format check. */
export function peekPacketFormat(bytes: Uint8Array): number {
  if (bytes.byteLength < 2) {
    throw new RangeError(`Packet is ${bytes.byteLength} bytes; the header needs ${HEADER_SIZE}`);
  }
  return bytes[0]! | (bytes[1]! << 8);
}

/** packetId sits at byte 6 of every header. */
export function peekPacketId(bytes: Uint8Array): number {
  if (bytes.byteLength < 7) {
    throw new RangeError(`Packet is ${bytes.byteLength} bytes; the header needs ${HEADER_SIZE}`);
  }
  return bytes[6]!;
}

/** The header layout is identical in F1 25 and F1 26. */
export function decodeHeader(bytes: Uint8Array): PacketHeader {
  if (bytes.byteLength < HEADER_SIZE) {
    throw new RangeError(`Packet is ${bytes.byteLength} bytes; the header needs ${HEADER_SIZE}`);
  }
  const r = new ByteReader(bytes);
  return {
    packetFormat: r.uint16(),
    gameYear: r.uint8(),
    gameMajorVersion: r.uint8(),
    gameMinorVersion: r.uint8(),
    packetVersion: r.uint8(),
    packetId: r.uint8(),
    sessionUid: r.uint64().toString(),
    sessionTime: r.float(),
    frameIdentifier: r.uint32(),
    overallFrameIdentifier: r.uint32(),
    playerCarIndex: r.uint8(),
    secondaryPlayerCarIndex: r.uint8(),
  };
}
