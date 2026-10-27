import { join } from "node:path";

import { decodePacket } from "@/protocol/decode";
import { layout as f1_25 } from "@/protocol/f1-25";
import { layout as f1_26 } from "@/protocol/f1-26";
import { HEADER_SIZE, PacketId } from "@/protocol/header";
import { carStatusPacketSize } from "@/protocol/common/car-status";
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

function lap(lapNum: number, extra: { invalid?: boolean; pit?: boolean; lastMs?: number; frame?: number; pits?: number; grid?: number } = {}) {
  return lapFor(FORMAT, PLAYER, lapNum, extra);
}

function lapFor(
  format: 2025 | 2026,
  player: number,
  lapNum: number,
  extra: { invalid?: boolean; pit?: boolean; lastMs?: number; frame?: number; pits?: number; grid?: number } = {},
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
    .uint8(extra.pits ?? 0)
    .uint8(0)
    .uint8(extra.invalid ? 1 : 0)
    .skip(5)
    .uint8(extra.grid ?? 0)
    .uint8(4);
  return writer.bytes;
}

function history(finished: { timeMs: number; valid: boolean }[], frame = 0) {
  return historyFor(FORMAT, PLAYER, finished, frame);
}

function historyFor(
  format: 2025 | 2026,
  player: number,
  finished: { timeMs: number; valid: boolean }[],
  frame = 0,
) {
  const writer = packetWithHeader(SESSION_HISTORY_PACKET_BYTES, {
    packetFormat: format,
    packetId: PacketId.SessionHistory,
    playerCarIndex: player,
    frameIdentifier: frame,
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

function event(code: string, frame = 0) {
  return packetWithHeader(EVENT_PACKET_BYTES, {
    packetFormat: FORMAT,
    packetId: PacketId.Event,
    playerCarIndex: PLAYER,
    frameIdentifier: frame,
  }).ascii(code).bytes;
}

function finishedLaps(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    timeMs: 80_000 + (index + 1) * 1_000,
    valid: true,
  }));
}

/** Five Lap Race. The car stays on Lap 5; the next Lap never starts. */
function fiveLapRace(finalHistory: "before-end" | "after-end") {
  const packets: Uint8Array[] = [session(), event("SSTA", 50)];
  for (let lapNumber = 1; lapNumber <= 5; lapNumber += 1) {
    packets.push(lap(lapNumber, { lastMs: 80_000 + lapNumber * 1_000 }));
    if (lapNumber > 1) packets.push(history(finishedLaps(lapNumber - 1), lapNumber * 100 + 40));
  }
  const confirmed = history(finishedLaps(5), finalHistory === "before-end" ? 540 : 600);
  if (finalHistory === "before-end") packets.push(confirmed);
  packets.push(event("SEND", 580));
  if (finalHistory === "after-end") packets.push(confirmed);
  return packets;
}

function pushAll(recorder: LapRecorder, packets: Uint8Array[], now = 1_000) {
  return packets.map((bytes) => recorder.push(decodePacket(bytes), now)).filter((lap) => lap !== undefined);
}

describe("LapRecorder", () => {
  it("stores the first Lap after the Session starts", () => {
    const recorder = new LapRecorder();
    const committed = pushAll(recorder, [
      session(),
      event("SSTA"),
      lap(1),
      lap(2, { lastMs: 90_000 }),
      history([{ timeMs: 90_000, valid: true }]),
    ]);
    expect(committed).toHaveLength(1);
    expect(committed[0]?.lapNumber).toBe(1);
    expect(committed[0]?.lapTimeMs).toBe(90_000);
  });

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
    expect(committed[0]?.invalidReason).toBeNull();
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
    expect(fromFlag[0]?.invalidReason).toBeNull();
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
    expect(fromHistory[0]?.invalidReason).toBeNull();
    expect(fromHistory[0]?.lapTimeMs).toBe(81_000);
  });

  it("drops a pit Lap", () => {
    const pits = new LapRecorder();
    expect(pushAll(pits, [session(), lap(1), lap(2, { pit: true }), lap(3), history([{ timeMs: 1, valid: true }, { timeMs: 2, valid: true }])])).toEqual([]);
  });

  it("stores a flashback Lap as Invalid", () => {
    const flash = new LapRecorder();
    const committed = pushAll(flash, [
      session(),
      lap(1),
      lap(2),
      event("FLBK"),
      lap(3),
      history([
        { timeMs: 1, valid: true },
        { timeMs: 2, valid: true },
      ]),
    ]);
    expect(committed).toHaveLength(1);
    expect(committed[0]?.lapNumber).toBe(2);
    expect(committed[0]?.valid).toBe(false);
    expect(committed[0]?.invalidReason).toBe("flashback");
  });

  it("stores an Invalid Lap only when Config keeps them", () => {
    expect(storesLap(true, false)).toBe(true);
    expect(storesLap(false, true)).toBe(true);
    expect(storesLap(false, false)).toBe(false);
  });

  it.each(["before-end", "after-end"] as const)(
    "stores the last Lap of a 5 Lap Race when Session History arrives %s",
    (finalHistory) => {
      const recorder = new LapRecorder();
      const committed = pushAll(recorder, fiveLapRace(finalHistory));
      expect(committed.map((lap) => lap.lapNumber)).toEqual([1, 2, 3, 4, 5]);
      expect(committed.every((lap) => lap.valid)).toBe(true);
      expect(committed[4]?.lapTimeMs).toBe(85_000);
    },
  );

  it("drops the Lap in progress when the Session ends", () => {
    const recorder = new LapRecorder();
    const committed = pushAll(recorder, [
      session(),
      event("SSTA", 50),
      lap(1),
      lap(2, { lastMs: 81_000 }),
      history([{ timeMs: 81_000, valid: true }], 240),
      lap(3),
      event("SEND", 580),
      history(
        [
          { timeMs: 81_000, valid: true },
          { timeMs: 82_000, valid: true },
        ],
        640,
      ),
    ]);
    expect(committed.map((lap) => lap.lapNumber)).toEqual([1, 2]);
    expect(committed.every((lap) => lap.valid)).toBe(true);
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

  it("keeps AI difficulty, grid, pit stops, and tyre age on the committed Lap", () => {
    const recorder = new LapRecorder();
    const fullSession = packetWithHeader(753, { packetFormat: FORMAT, packetId: PacketId.Session, playerCarIndex: PLAYER })
      .uint8(0)
      .int8(40)
      .int8(20)
      .uint8(0)
      .uint16(7000)
      .uint8(18)
      .int8(11);
    fullSession.bytes[HEADER_SIZE + 640] = 90;
    const status = packetWithHeader(carStatusPacketSize(f1_25), {
      packetFormat: FORMAT,
      packetId: PacketId.CarStatus,
      playerCarIndex: PLAYER,
    });
    status.seek(HEADER_SIZE + 25).uint8(18).uint8(16).uint8(4);

    const committed = pushAll(recorder, [
      fullSession.bytes,
      status.bytes,
      lap(1),
      lap(2),
      lap(3, { lastMs: 81_034, grid: 6, pits: 2 }),
      history([{ timeMs: 90_000, valid: true }, { timeMs: 81_034, valid: true }]),
    ]);
    expect(committed).toHaveLength(1);
    expect(committed[0]?.tyreCompound).toBe(18);
    expect(committed[0]?.visualTyreCompound).toBe(16);
    expect(committed[0]?.tyreAgeLaps).toBe(4);
    expect(committed[0]?.session).toMatchObject({ aiDifficulty: 90, gridPosition: 6, pitStops: 2 });
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
