import { join } from "node:path";

import { decodePacket } from "@/protocol/decode";
import { layout as f1_25 } from "@/protocol/f1-25";
import { layout as f1_26 } from "@/protocol/f1-26";
import { HEADER_SIZE, PacketId } from "@/protocol/header";
import { LAP_DATA_CAR_BYTES, lapDataPacketSize } from "@/protocol/common/lap-data";
import { EVENT_PACKET_BYTES } from "@/protocol/common/event";
import { SESSION_HISTORY_PACKET_BYTES } from "@/protocol/common/session-history";
import { packetWithHeader, participantsWithPlayerTeam } from "@/protocol/test/packet-builder";
import { teamName } from "@/protocol/teams";
import { readPacketFile } from "../../scripts/packet-file";
import { LapRecorder, storesLap } from "./lap-recorder";

const FORMAT = 2025;
const PLAYER = 0;

function session() {
  return packetWithHeader(40, { packetFormat: FORMAT, packetId: PacketId.Session, playerCarIndex: PLAYER })
    .uint8(0)
    .int8(40)
    .int8(20)
    .uint8(0)
    .uint16(7000)
    .uint8(18)
    .int8(11).bytes;
}

function lap(lapNum: number, extra: { invalid?: boolean; pit?: boolean; lastMs?: number; frame?: number } = {}) {
  return lapFor(FORMAT, PLAYER, lapNum, extra);
}

function lapFor(
  format: 2025 | 2026,
  player: number,
  lapNum: number,
  extra: { invalid?: boolean; pit?: boolean; lastMs?: number; frame?: number } = {},
) {
  const layout = format === 2026 ? f1_26 : f1_25;
  const writer = packetWithHeader(lapDataPacketSize(layout), {
    packetFormat: format,
    packetId: PacketId.LapData,
    playerCarIndex: player,
    frameIdentifier: extra.frame ?? lapNum * 100,
  });
  writer.seek(HEADER_SIZE + player * LAP_DATA_CAR_BYTES);
  writer
    .uint32(extra.lastMs ?? 80_000)
    .uint32(10_000)
    .uint16(25_000)
    .uint8(0)
    .uint16(27_000)
    .uint8(0)
    .skip(6)
    .float(100)
    .skip(8)
    .uint8(1)
    .uint8(lapNum)
    .uint8(extra.pit ? 2 : 0)
    .skip(2)
    .uint8(extra.invalid ? 1 : 0)
    .skip(6)
    .uint8(4);
  return writer.bytes;
}

function history(finished: { timeMs: number; valid: boolean }[]) {
  return historyFor(FORMAT, PLAYER, finished);
}

function historyFor(format: 2025 | 2026, player: number, finished: { timeMs: number; valid: boolean }[]) {
  const writer = packetWithHeader(SESSION_HISTORY_PACKET_BYTES, {
    packetFormat: format,
    packetId: PacketId.SessionHistory,
    playerCarIndex: player,
  });
  writer.uint8(player).uint8(finished.length + 1).skip(5);
  for (const entry of finished) {
    writer
      .uint32(entry.timeMs)
      .uint16(25_000)
      .uint8(0)
      .uint16(27_000)
      .uint8(0)
      .uint16(28_000)
      .uint8(0)
      .uint8(entry.valid ? 0x0f : 0);
  }
  return writer.bytes;
}

function event(code: string) {
  return packetWithHeader(EVENT_PACKET_BYTES, {
    packetFormat: FORMAT,
    packetId: PacketId.Event,
    playerCarIndex: PLAYER,
  }).ascii(code).bytes;
}

function pushAll(recorder: LapRecorder, packets: Uint8Array[], now = 1_000) {
  return packets.map((bytes) => recorder.push(decodePacket(bytes), now)).filter((lap) => lap !== undefined);
}

describe("LapRecorder", () => {
  it("does not store the Lap already in progress when it connects", () => {
    const recorder = new LapRecorder();
    const committed = pushAll(recorder, [session(), lap(2), lap(3), history([{ timeMs: 80_000, valid: true }])]);
    expect(committed).toEqual([]);
  });

  it("commits a Lap it saw start once Session History marks it valid", () => {
    const recorder = new LapRecorder();
    const committed = pushAll(recorder, [
      session(),
      lap(1),
      lap(2),
      lap(3, { lastMs: 81_034 }),
      history([
        { timeMs: 90_000, valid: true },
        { timeMs: 81_034, valid: true },
      ]),
    ]);
    expect(committed).toHaveLength(1);
    expect(committed[0]?.valid).toBe(true);
    expect(committed[0]?.lapTimeMs).toBe(81_034);
    expect(committed[0]?.session.trackId).toBe(11);
    expect(committed[0]?.condition).toBe("dry");
  });

  it("returns an Invalid Lap the Game marks during the Lap or in Session History", () => {
    const during = new LapRecorder();
    const fromFlag = pushAll(during, [
      session(),
      lap(1),
      lap(2, { invalid: true }),
      lap(3),
      history([
        { timeMs: 1, valid: true },
        { timeMs: 2, valid: true },
      ]),
    ]);
    expect(fromFlag).toHaveLength(1);
    expect(fromFlag[0]?.valid).toBe(false);
    expect(fromFlag[0]?.lapTimeMs).toBe(2);

    const hist = new LapRecorder();
    const fromHistory = pushAll(hist, [
      session(),
      lap(1),
      lap(2),
      lap(3, { lastMs: 81_000 }),
      history([
        { timeMs: 90_000, valid: true },
        { timeMs: 81_000, valid: false },
      ]),
    ]);
    expect(fromHistory).toHaveLength(1);
    expect(fromHistory[0]?.valid).toBe(false);
    expect(fromHistory[0]?.lapTimeMs).toBe(81_000);
  });

  it("drops a pit Lap and a flashback", () => {
    const pits = new LapRecorder();
    expect(pushAll(pits, [session(), lap(1), lap(2, { pit: true }), lap(3), history([{ timeMs: 1, valid: true }, { timeMs: 2, valid: true }])])).toEqual([]);

    const flash = new LapRecorder();
    expect(pushAll(flash, [session(), lap(1), lap(2), event("FLBK"), lap(3), history([{ timeMs: 1, valid: true }, { timeMs: 2, valid: true }])])).toEqual([]);
  });

  it("stores an Invalid Lap only when Config keeps them", () => {
    expect(storesLap(true, false)).toBe(true);
    expect(storesLap(false, true)).toBe(true);
    expect(storesLap(false, false)).toBe(false);
  });

  it("drops a pending Lap when the Session ends", () => {
    const recorder = new LapRecorder();
    const committed = pushAll(recorder, [session(), lap(1), lap(2), lap(3), event("SEND"), history([{ timeMs: 1, valid: true }, { timeMs: 2, valid: true }])]);
    expect(committed).toEqual([]);
  });

  it.each([
    { format: 2025 as const, teamId: 5, myTeam: false, name: "Alpine" },
    { format: 2026 as const, teamId: 477, myTeam: false, name: "Ferrari" },
    { format: 2025 as const, teamId: 104, myTeam: false, name: "My F1 Team" },
    { format: 2025 as const, teamId: 221, myTeam: false, name: "My F1 Team" },
    { format: 2025 as const, teamId: 0, myTeam: true, name: "My F1 Team" },
    { format: 2026 as const, teamId: 104, myTeam: true, name: "My F1 Team" },
    {
      format: 2025 as const,
      teamId: 0,
      myTeam: true,
      name: "My F1 Team",
      structFormat: 2026 as const,
      numCars: 22,
    },
  ])("stores the player car Team ($name) from Participants, not slot 0 Mercedes", ({
    format,
    teamId,
    myTeam,
    name,
    structFormat,
    numCars,
  }) => {
    const player = 19;
    const recorder = new LapRecorder();
    const committed = pushAll(recorder, [
      packetWithHeader(40, { packetFormat: format, packetId: PacketId.Session, playerCarIndex: player })
        .uint8(0)
        .int8(40)
        .int8(20)
        .uint8(0)
        .uint16(7000)
        .uint8(18)
        .int8(11).bytes,
      participantsWithPlayerTeam({
        packetFormat: format,
        playerCarIndex: player,
        teamId,
        myTeam,
        structFormat,
        numCars,
      }),
      lapFor(format, player, 1),
      lapFor(format, player, 2),
      lapFor(format, player, 3, { lastMs: 81_034 }),
      historyFor(format, player, [
        { timeMs: 90_000, valid: true },
        { timeMs: 81_034, valid: true },
      ]),
    ]);
    expect(committed).toHaveLength(1);
    expect(teamName(committed[0]!.teamId)).toBe(name);
    expect(committed[0]!.teamId).not.toBe(0);
  });

  it("commits the valid Lap from the recorded Spa clean-lap fixture", () => {
    const recorder = new LapRecorder();
    const packets = readPacketFile(join(__dirname, "../../fixtures/packets/f1-25-clean-lap.bin.gz"));
    const committed = packets
      .map((record, index) => recorder.push(decodePacket(record.bytes), 1_000 + index))
      .filter((lap) => lap !== undefined);
    expect(committed.some((lap) => lap.lapTimeMs === 108_055)).toBe(true);
  });
});
