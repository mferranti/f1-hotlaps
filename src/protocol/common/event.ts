import { ByteReader } from "../byte-reader";
import { HEADER_SIZE } from "../header";
import type { DecodedBody, EventData } from "../types";

export const EVENT_PACKET_BYTES = 45;

export function decodeEvent(bytes: Uint8Array): DecodedBody {
  if (bytes.byteLength < HEADER_SIZE + 4) {
    throw new RangeError(`Event Packet is ${bytes.byteLength} bytes; expected ${EVENT_PACKET_BYTES}`);
  }
  const r = new ByteReader(bytes, HEADER_SIZE);
  const code = r.ascii(4);
  return { kind: "event", event: readDetails(code, r) };
}

function readDetails(code: string, r: ByteReader): EventData {
  if (code === "SSTA") return { code: "SSTA" };
  if (code === "SEND") return { code: "SEND" };
  if (code === "FLBK") {
    return {
      code: "FLBK",
      flashbackFrameIdentifier: r.uint32(),
      flashbackSessionTime: r.float(),
    };
  }
  return { code };
}
