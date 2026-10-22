/** @jest-environment node */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

import {
  decodeRecords,
  encodeRecord,
  encodeRecords,
  isGzip,
  packetId,
  parseDuration,
  readPacketFile,
  trimRecords,
  type PacketRecord,
} from "./packet-file";

function packet(id: number, extra: number[] = []): Uint8Array {
  // packetFormat 2026 LE, gameYear 26, major 1, minor 0, packetVersion 1, packetId
  return new Uint8Array([0xea, 0x07, 26, 1, 0, 1, id, ...extra]);
}

describe("record encoding", () => {
  it("writes [uint32 LE offsetMs][uint16 LE length][bytes]", () => {
    const encoded = encodeRecord({ offsetMs: 0x01020304, bytes: new Uint8Array([9, 8, 7]) });
    expect([...encoded]).toEqual([0x04, 0x03, 0x02, 0x01, 0x03, 0x00, 9, 8, 7]);
  });

  it("round-trips several records unchanged", () => {
    const records: PacketRecord[] = [
      { offsetMs: 0, bytes: packet(1, [1, 2, 3]) },
      { offsetMs: 16, bytes: packet(6) },
      { offsetMs: 4_000_000_000, bytes: new Uint8Array(0) },
    ];
    expect(decodeRecords(encodeRecords(records))).toEqual(records);
  });

  it("rejects offsets and lengths that do not fit", () => {
    expect(() => encodeRecord({ offsetMs: -1, bytes: packet(1) })).toThrow(RangeError);
    expect(() => encodeRecord({ offsetMs: 1.5, bytes: packet(1) })).toThrow(RangeError);
    expect(() => encodeRecord({ offsetMs: 0, bytes: new Uint8Array(0x10000) })).toThrow(RangeError);
  });

  it("reports truncated files", () => {
    const encoded = encodeRecord({ offsetMs: 5, bytes: packet(2) });
    expect(() => decodeRecords(encoded.slice(0, 4))).toThrow(/header/);
    expect(() => decodeRecords(encoded.slice(0, -1))).toThrow(/body/);
  });

  it("decodes from a view into a larger buffer", () => {
    const encoded = encodeRecord({ offsetMs: 7, bytes: packet(3) });
    const padded = new Uint8Array(encoded.length + 4);
    padded.set(encoded, 2);
    expect(decodeRecords(padded.subarray(2, 2 + encoded.length))).toEqual([
      { offsetMs: 7, bytes: packet(3) },
    ]);
  });
});

describe("packetId", () => {
  it("reads the byte at offset 6 of the header", () => {
    expect(packetId(packet(11))).toBe(11);
    expect(packetId(new Uint8Array(3))).toBeUndefined();
  });
});

describe("trimRecords", () => {
  const records: PacketRecord[] = [
    { offsetMs: 1000, bytes: packet(1) },
    { offsetMs: 1500, bytes: packet(0) }, // Motion: dropped
    { offsetMs: 2000, bytes: packet(2) },
    { offsetMs: 2500, bytes: packet(4) }, // Participants: dropped
    { offsetMs: 3000, bytes: packet(11) },
    { offsetMs: 3500, bytes: packet(6) },
    { offsetMs: 4000, bytes: new Uint8Array(3) }, // too short to have an id
  ];

  it("keeps kept ids inside the inclusive range and rebases to 0", () => {
    expect(trimRecords(records, 1500, 3000)).toEqual([
      { offsetMs: 500, bytes: packet(2) },
      { offsetMs: 1500, bytes: packet(11) },
    ]);
  });

  it("keeps every kept id across the whole file", () => {
    expect(trimRecords(records, 0, Infinity).map((r) => packetId(r.bytes))).toEqual([1, 2, 11, 6]);
  });

  it("never produces negative offsets for a fractional start", () => {
    const cut = trimRecords([{ offsetMs: 62, bytes: packet(2) }], 61.6, 100);
    expect(cut[0]?.offsetMs).toBe(0);
  });
});

describe("parseDuration", () => {
  it.each([
    ["61.2s", 61_200],
    ["1500ms", 1500],
    ["2m3.5s", 123_500],
    ["90", 90_000],
    [" 0s ", 0],
  ])("parses %p", (text, ms) => {
    expect(parseDuration(text)).toBeCloseTo(ms);
  });

  it.each(["", "abc", "1h", "-1s", "1.s"])("rejects %p", (text) => {
    expect(() => parseDuration(text)).toThrow(/Invalid duration/);
  });
});

describe("readPacketFile", () => {
  let dir: string;
  const records: PacketRecord[] = [
    { offsetMs: 0, bytes: packet(1, [42]) },
    { offsetMs: 33, bytes: packet(7) },
  ];

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "packets-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("reads a raw file", () => {
    const path = join(dir, "raw.bin");
    writeFileSync(path, encodeRecords(records));
    expect(readPacketFile(path)).toEqual(records);
  });

  it("reads a gzipped file, detected by magic bytes not extension", () => {
    const gz = gzipSync(encodeRecords(records));
    expect(isGzip(gz)).toBe(true);
    const path = join(dir, "no-extension");
    writeFileSync(path, gz);
    expect(readPacketFile(path)).toEqual(records);
  });

  it("reads an empty file as no records", () => {
    const path = join(dir, "empty.bin");
    writeFileSync(path, new Uint8Array(0));
    expect(readPacketFile(path)).toEqual([]);
  });
});
