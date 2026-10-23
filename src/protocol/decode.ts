import { f1_25 } from "./f1-25";
import { f1_26 } from "./f1-26";
import { decodeHeader } from "./header";
import type { DecodedPacket, GameDecoder } from "./types";

const games = new Map<number, GameDecoder>([f1_25, f1_26].map((g) => [g.packetFormat, g]));

export const SUPPORTED_PACKET_FORMATS: readonly number[] = [...games.keys()];

/** The Packet's header names a packet format no Game decoder handles (e.g. the game is set to 2024). */
export class UnsupportedPacketFormatError extends Error {
  constructor(readonly packetFormat: number) {
    super(
      `Unsupported packet format ${packetFormat}; expected one of ${SUPPORTED_PACKET_FORMATS.join(", ")}`,
    );
    this.name = "UnsupportedPacketFormatError";
  }
}

/** Decode one Packet with the Game layout chosen by the header's packet format. */
export function decodePacket(bytes: Uint8Array): DecodedPacket {
  const header = decodeHeader(bytes);
  const game = games.get(header.packetFormat);
  if (!game) throw new UnsupportedPacketFormatError(header.packetFormat);
  const decode = game.decoders[header.packetId];
  return { header, ...(decode ? decode(bytes) : { kind: "undecoded" }) };
}
