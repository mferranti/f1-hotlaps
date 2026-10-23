import { ByteReader } from "../byte-reader";
import { HEADER_SIZE } from "../header";
import type { GameLayout } from "../layout";
import type { DecodedBody, ParticipantData } from "../types";

/** Bytes after m_myTeam (race number through livery colours). */
const AFTER_MY_TEAM = 52;

export function participantCarBytes(layout: GameLayout): number {
  return layout.participantTeamId === "uint16" ? 60 : 57;
}

export function participantsPacketSize(layout: GameLayout): number {
  return HEADER_SIZE + 1 + layout.numCars * participantCarBytes(layout);
}

export function decodeParticipants(bytes: Uint8Array, layout: GameLayout): DecodedBody {
  const used = participantsLayoutForSize(bytes.byteLength, layout);
  const expected = participantsPacketSize(used);
  if (bytes.byteLength < expected) {
    throw new RangeError(`Participants Packet is ${bytes.byteLength} bytes; expected ${expected}`);
  }
  const r = new ByteReader(bytes, HEADER_SIZE);
  r.skip(1); // numActiveCars
  const cars = r.array(used.numCars, () => readParticipant(r, used));
  return { kind: "participants", cars };
}

/** F1 26 often still sends packet format 2025; car width is whichever struct divides the payload. */
function participantsLayoutForSize(byteLength: number, layout: GameLayout): GameLayout {
  const payload = byteLength - HEADER_SIZE - 1;
  if (payload <= 0) return layout;
  const preferred = participantCarBytes(layout);
  const otherWidth = preferred === 60 ? 57 : 60;
  if (payload % preferred === 0) {
    return { ...layout, numCars: payload / preferred };
  }
  if (payload % otherWidth === 0) {
    return {
      ...layout,
      numCars: payload / otherWidth,
      participantTeamId: otherWidth === 60 ? "uint16" : "uint8",
    };
  }
  return layout;
}

function readParticipant(r: ByteReader, layout: GameLayout): ParticipantData {
  r.skip(layout.participantTeamId === "uint16" ? 5 : 3);
  const teamId = layout.participantTeamId === "uint16" ? r.uint16() : r.uint8();
  const myTeam = r.uint8() === 1;
  r.skip(AFTER_MY_TEAM);
  return { teamId, myTeam };
}
