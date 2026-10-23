import { participantCarBytes, participantsPacketSize } from "../common/participants";
import { layout as f1_25 } from "../f1-25";
import { layout as f1_26 } from "../f1-26";
import { HEADER_SIZE, PacketId } from "../header";
import type { GameLayout } from "../layout";
import { ByteWriter } from "./byte-writer";

export interface HeaderFields {
  packetFormat: number;
  packetId: number;
  gameMajorVersion?: number;
  gameMinorVersion?: number;
  packetVersion?: number;
  sessionUid?: bigint;
  sessionTime?: number;
  frameIdentifier?: number;
  overallFrameIdentifier?: number;
  playerCarIndex?: number;
  secondaryPlayerCarIndex?: number;
}

const HEADER_BYTES = 29;

/** Zero-filled Packet of `byteLength` with a little-endian PacketHeader; the writer sits after the header. */
export function packetWithHeader(byteLength: number, header: HeaderFields): ByteWriter {
  return new ByteWriter(byteLength)
    .uint16(header.packetFormat)
    .uint8(header.packetFormat % 100)
    .uint8(header.gameMajorVersion ?? 1)
    .uint8(header.gameMinorVersion ?? 0)
    .uint8(header.packetVersion ?? 1)
    .uint8(header.packetId)
    .uint64(header.sessionUid ?? 0n)
    .float(header.sessionTime ?? 0)
    .uint32(header.frameIdentifier ?? 0)
    .uint32(header.overallFrameIdentifier ?? 0)
    .uint8(header.playerCarIndex ?? 0)
    .uint8(header.secondaryPlayerCarIndex ?? 255)
    .seek(HEADER_BYTES);
}

/** Participants Packet with Mercedes in slot 0 and the player's Team in `playerCarIndex`. */
export function participantsWithPlayerTeam(options: {
  packetFormat: 2025 | 2026;
  playerCarIndex: number;
  teamId: number;
  myTeam?: boolean;
  /** Struct year; F1 26 often keeps packet format 2025. */
  structFormat?: 2025 | 2026;
  numCars?: number;
}): Uint8Array {
  const structFormat = options.structFormat ?? options.packetFormat;
  const base = structFormat === 2026 ? f1_26 : f1_25;
  const layout: GameLayout = { ...base, numCars: options.numCars ?? base.numCars };
  const carBytes = participantCarBytes(layout);
  const writer = packetWithHeader(participantsPacketSize(layout), {
    packetFormat: options.packetFormat,
    packetId: PacketId.Participants,
    playerCarIndex: options.playerCarIndex,
  });
  writer.uint8(2);
  writeTeam(writer, layout, carBytes, 0, 0, false);
  writeTeam(writer, layout, carBytes, options.playerCarIndex, options.teamId, options.myTeam === true);
  return writer.bytes;
}

function writeTeam(
  writer: ByteWriter,
  layout: GameLayout,
  carBytes: number,
  index: number,
  teamId: number,
  myTeam: boolean,
): void {
  writer.seek(HEADER_SIZE + 1 + index * carBytes);
  if (layout.participantTeamId === "uint16") {
    writer.skip(5).uint16(teamId).uint8(myTeam ? 1 : 0);
  } else {
    writer.skip(3).uint8(teamId).uint8(myTeam ? 1 : 0);
  }
}
