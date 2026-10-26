import { ByteReader } from "../byte-reader";
import { HEADER_SIZE } from "../header";
import type { DecodedBody } from "../types";

const MIN_SESSION_BYTES = HEADER_SIZE + 8;
/**
 * Payload offsets in the packed Session struct (F1 25 is 753 bytes, F1 26 appends aero zones after this).
 * m_aiDifficulty is 640, m_gameMode is 665.
 */
const AI_DIFFICULTY_AT = 640;
const GAME_MODE_AT = 665;

export function decodeSession(bytes: Uint8Array): DecodedBody {
  if (bytes.byteLength < MIN_SESSION_BYTES) {
    throw new RangeError(`Session Packet is ${bytes.byteLength} bytes; expected at least ${MIN_SESSION_BYTES}`);
  }
  const r = new ByteReader(bytes, HEADER_SIZE);
  const weather = r.uint8();
  const trackTemperatureC = r.int8();
  const airTemperatureC = r.int8();
  r.skip(1); // total laps
  r.skip(2); // track length
  const sessionType = r.uint8();
  const trackId = r.int8();
  const aiDifficulty = byteAt(bytes, AI_DIFFICULTY_AT, -1);
  const gameMode = byteAt(bytes, GAME_MODE_AT, 0);
  return {
    kind: "session",
    data: {
      weather,
      trackTemperatureC,
      airTemperatureC,
      sessionType,
      trackId,
      gameMode,
      aiDifficulty,
    },
  };
}

function byteAt(bytes: Uint8Array, payloadOffset: number, missing: number): number {
  const index = HEADER_SIZE + payloadOffset;
  return index < bytes.byteLength ? bytes[index]! : missing;
}
