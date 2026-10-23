import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

/**
 * Recording file format: a flat sequence of records, no file header.
 * Each record is `[uint32 LE offsetMs][uint16 LE length][length bytes]`,
 * where offsetMs counts from the first Packet of the recording and the
 * bytes are the Packet exactly as received. A file may be gzipped whole.
 */
export type PacketRecord = { offsetMs: number; bytes: Uint8Array };

export const RECORD_HEADER_BYTES = 6;
const PACKET_ID_OFFSET = 6;
const MAX_OFFSET_MS = 0xffffffff;
const MAX_PACKET_BYTES = 0xffff;

/** Session, LapData, Event, CarSetups, CarTelemetry, CarStatus, SessionHistory. */
export const KEPT_PACKET_IDS: ReadonlySet<number> = new Set([1, 2, 3, 5, 6, 7, 11]);

export function encodeRecord({ offsetMs, bytes }: PacketRecord): Uint8Array {
  if (!Number.isInteger(offsetMs) || offsetMs < 0 || offsetMs > MAX_OFFSET_MS) {
    throw new RangeError(`offsetMs out of range: ${offsetMs}`);
  }
  if (bytes.length > MAX_PACKET_BYTES) {
    throw new RangeError(`Packet too long: ${bytes.length} bytes`);
  }
  const out = new Uint8Array(RECORD_HEADER_BYTES + bytes.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, offsetMs, true);
  view.setUint16(4, bytes.length, true);
  out.set(bytes, RECORD_HEADER_BYTES);
  return out;
}

export function encodeRecords(records: readonly PacketRecord[]): Uint8Array {
  const chunks = records.map(encodeRecord);
  const out = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

export function decodeRecords(data: Uint8Array): PacketRecord[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const records: PacketRecord[] = [];
  let at = 0;
  while (at < data.length) {
    if (at + RECORD_HEADER_BYTES > data.length) {
      throw new Error(`Truncated record header at byte ${at}`);
    }
    const offsetMs = view.getUint32(at, true);
    const length = view.getUint16(at + 4, true);
    const start = at + RECORD_HEADER_BYTES;
    if (start + length > data.length) {
      throw new Error(`Truncated record body at byte ${at}`);
    }
    records.push({ offsetMs, bytes: data.slice(start, start + length) });
    at = start + length;
  }
  return records;
}

export function isGzip(data: Uint8Array): boolean {
  return data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b;
}

export function readPacketFile(path: string): PacketRecord[] {
  const raw = new Uint8Array(readFileSync(path));
  return decodeRecords(isGzip(raw) ? new Uint8Array(gunzipSync(raw)) : raw);
}

export function packetId(bytes: Uint8Array): number | undefined {
  return bytes[PACKET_ID_OFFSET];
}

/** Keeps records in [fromMs, toMs] with a kept Packet id, rebased so the cut starts at 0 ms. */
export function trimRecords(
  records: readonly PacketRecord[],
  fromMs: number,
  toMs: number,
  keptIds: ReadonlySet<number> = KEPT_PACKET_IDS,
): PacketRecord[] {
  const base = Math.round(fromMs);
  return records
    .filter(({ offsetMs, bytes }) => {
      const id = packetId(bytes);
      return offsetMs >= fromMs && offsetMs <= toMs && id !== undefined && keptIds.has(id);
    })
    .map(({ offsetMs, bytes }) => ({ offsetMs: offsetMs - base, bytes }));
}

/** Parses `61.2s`, `1500ms`, `2m3.5s`, or a bare number of seconds into milliseconds. */
export function parseDuration(text: string): number {
  const trimmed = text.trim();
  const units: Record<string, number> = { ms: 1, s: 1000, m: 60_000 };
  const pattern = /(\d+(?:\.\d+)?)(ms|s|m)?/gy;
  let total = 0;
  let consumed = 0;
  for (const match of trimmed.matchAll(pattern)) {
    const unit = match[2] ?? "s";
    total += Number(match[1]) * (units[unit] ?? 1000);
    consumed += match[0].length;
  }
  if (trimmed.length === 0 || consumed !== trimmed.length) {
    throw new Error(`Invalid duration: "${text}"`);
  }
  return total;
}
