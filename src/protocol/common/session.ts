import { ByteReader } from "../byte-reader";
import { HEADER_SIZE } from "../header";
import type { DecodedBody } from "../types";

const MIN_SESSION_BYTES = HEADER_SIZE + 8;
/** Bytes between m_trackId and m_gameMode (marshal zones, weather samples, assists). */
const GAME_MODE_SKIP_AFTER_TRACK = 658;

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
  let gameMode = 0;
  if (bytes.byteLength >= HEADER_SIZE + 8 + GAME_MODE_SKIP_AFTER_TRACK + 1) {
    r.skip(GAME_MODE_SKIP_AFTER_TRACK);
    gameMode = r.uint8();
  }
  return {
    kind: "session",
    data: {
      weather,
      trackTemperatureC,
      airTemperatureC,
      sessionType,
      trackId,
      gameMode,
    },
  };
}
