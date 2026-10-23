import { ByteReader } from "../byte-reader";
import { HEADER_SIZE } from "../header";
import type { DecodedBody, LapHistoryEntry } from "../types";

const MAX_LAPS_IN_HISTORY = 100;
const LAP_HISTORY_BYTES = 14;
const HISTORY_PREFIX_BYTES = 7;

export const SESSION_HISTORY_PACKET_BYTES =
  HEADER_SIZE + HISTORY_PREFIX_BYTES + MAX_LAPS_IN_HISTORY * LAP_HISTORY_BYTES + 8 * 3;

export function decodeSessionHistory(bytes: Uint8Array): DecodedBody {
  if (bytes.byteLength < SESSION_HISTORY_PACKET_BYTES) {
    throw new RangeError(
      `Session History Packet is ${bytes.byteLength} bytes; expected ${SESSION_HISTORY_PACKET_BYTES}`,
    );
  }
  const r = new ByteReader(bytes, HEADER_SIZE);
  const carIdx = r.uint8();
  const numLaps = r.uint8();
  r.skip(5); // tyre stints and best-lap numbers
  const entries = r.array(MAX_LAPS_IN_HISTORY, () => readLapHistory(r));
  return {
    kind: "sessionHistory",
    data: { carIdx, numLaps, laps: entries.slice(0, numLaps) },
  };
}

function readLapHistory(r: ByteReader): LapHistoryEntry {
  const lapTimeMs = r.uint32();
  const sector1Ms = r.splitTimeMs();
  const sector2Ms = r.splitTimeMs();
  const sector3Ms = r.splitTimeMs();
  const flags = r.uint8();
  return { lapTimeMs, sector1Ms, sector2Ms, sector3Ms, lapValid: (flags & 0x01) !== 0 };
}
