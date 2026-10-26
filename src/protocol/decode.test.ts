import {
  carSetupsPacketSize,
  carStatusPacketSize,
  carTelemetryPacketSize,
  finalClassificationPacketSize,
  participantsPacketSize,
} from "@/protocol";
import { EVENT_PACKET_BYTES } from "@/protocol/common/event";
import { lapDataPacketSize } from "@/protocol/common/lap-data";
import { SESSION_HISTORY_PACKET_BYTES } from "@/protocol/common/session-history";
import { decodePacket, UnsupportedPacketFormatError } from "@/protocol/decode";
import { layout as f1_25 } from "@/protocol/f1-25";
import { layout as f1_26 } from "@/protocol/f1-26";
import { HEADER_SIZE, PacketId } from "@/protocol/header";
import { packetWithHeader, participantsWithPlayerTeam } from "@/protocol/test/packet-builder";
import { playerCar } from "@/protocol/types";

describe("decodePacket", () => {
  it.each([2025, 2026])("decodes the header of a %i Packet", (packetFormat) => {
    const bytes = packetWithHeader(29, {
      packetFormat,
      packetId: PacketId.Motion,
      gameMajorVersion: 1,
      gameMinorVersion: 12,
      packetVersion: 1,
      sessionUid: 18446744073709551615n,
      sessionTime: 42.5,
      frameIdentifier: 1234,
      overallFrameIdentifier: 5678,
      playerCarIndex: 19,
      secondaryPlayerCarIndex: 255,
    }).bytes;

    expect(decodePacket(bytes)).toEqual({
      kind: "undecoded",
      header: {
        packetFormat,
        gameYear: packetFormat - 2000,
        gameMajorVersion: 1,
        gameMinorVersion: 12,
        packetVersion: 1,
        packetId: PacketId.Motion,
        sessionUid: "18446744073709551615",
        sessionTime: 42.5,
        frameIdentifier: 1234,
        overallFrameIdentifier: 5678,
        playerCarIndex: 19,
        secondaryPlayerCarIndex: 255,
      },
    });
  });

  it("rejects an unsupported packet format and carries the format", () => {
    const bytes = packetWithHeader(29, { packetFormat: 2024, packetId: PacketId.LapData }).bytes;

    expect(() => decodePacket(bytes)).toThrow(UnsupportedPacketFormatError);
    try {
      decodePacket(bytes);
    } catch (error) {
      expect((error as UnsupportedPacketFormatError).packetFormat).toBe(2024);
    }
  });

  it("rejects a Packet shorter than the header", () => {
    expect(() => decodePacket(new Uint8Array(10))).toThrow(RangeError);
  });
});

describe("packet sizes", () => {
  it("matches the F1 25 spec", () => {
    expect(lapDataPacketSize(f1_25)).toBe(1285);
    expect(carSetupsPacketSize(f1_25)).toBe(1133);
    expect(carTelemetryPacketSize(f1_25)).toBe(1352);
    expect(carStatusPacketSize(f1_25)).toBe(1239);
    expect(participantsPacketSize(f1_25)).toBe(1284);
    expect(finalClassificationPacketSize(f1_25)).toBe(1042);
    expect(SESSION_HISTORY_PACKET_BYTES).toBe(1460);
    expect(EVENT_PACKET_BYTES).toBe(45);
  });

  it("matches the F1 26 spec", () => {
    expect(lapDataPacketSize(f1_26)).toBe(1399);
    expect(carSetupsPacketSize(f1_26)).toBe(1233);
    expect(carTelemetryPacketSize(f1_26)).toBe(1448);
    expect(carStatusPacketSize(f1_26)).toBe(1445);
    expect(participantsPacketSize(f1_26)).toBe(1470);
    expect(finalClassificationPacketSize(f1_26)).toBe(1134);
  });
});

describe("decoded bodies", () => {
  it.each([
    { format: 2025, layout: f1_25 },
    { format: 2026, layout: f1_26 },
  ])("reads the player car from a $format Session, Lap, Setup, Telemetry, Status, History, and Event", ({
    format,
    layout,
  }) => {
    const player = 3;

    const session = packetWithHeader(40, { packetFormat: format, packetId: PacketId.Session, playerCarIndex: player });
    session.uint8(4).int8(42).int8(28).uint8(0).uint16(5000).uint8(15).int8(11);

    const lap = packetWithHeader(lapDataPacketSize(layout), {
      packetFormat: format,
      packetId: PacketId.LapData,
      playerCarIndex: player,
    });
    lap.seek(HEADER_SIZE + player * 57);
    lap
      .uint32(81_034)
      .uint32(12_000)
      .uint16(25_000)
      .uint8(0)
      .uint16(27_000)
      .uint8(0)
      .skip(6)
      .float(512.5)
      .skip(8)
      .uint8(1)
      .uint8(4)
      .uint8(2)
      .uint8(3)
      .uint8(1)
      .uint8(1)
      .skip(5)
      .uint8(7)
      .uint8(4);

    const setup = packetWithHeader(carSetupsPacketSize(layout), {
      packetFormat: format,
      packetId: PacketId.CarSetups,
      playerCarIndex: player,
    });
    setup.seek(HEADER_SIZE + player * 50);
    setup.uint8(8).uint8(9);

    const telemetry = packetWithHeader(carTelemetryPacketSize(layout), {
      packetFormat: format,
      packetId: PacketId.CarTelemetry,
      playerCarIndex: player,
    });
    telemetry.seek(HEADER_SIZE + player * (format === 2025 ? 60 : 59));
    telemetry.uint16(287).float(0.5).float(0).float(0.25);

    const status = packetWithHeader(carStatusPacketSize(layout), {
      packetFormat: format,
      packetId: PacketId.CarStatus,
      playerCarIndex: player,
    });
    status.seek(HEADER_SIZE + player * (format === 2025 ? 55 : 59) + 25);
    status.uint8(16).uint8(17).uint8(6).int8(0).float(0).float(0).float(1_500_000);

    const history = packetWithHeader(SESSION_HISTORY_PACKET_BYTES, {
      packetFormat: format,
      packetId: PacketId.SessionHistory,
      playerCarIndex: player,
    });
    history.uint8(player).uint8(2).skip(5).uint32(81_034).uint16(25_000).uint8(0).uint16(27_000).uint8(0).uint16(29_034).uint8(0).uint8(0x0f);

    const flashback = packetWithHeader(EVENT_PACKET_BYTES, {
      packetFormat: format,
      packetId: PacketId.Event,
      playerCarIndex: player,
    });
    flashback.ascii("FLBK").uint32(99).float(12.5);

    const sessionPacket = decodePacket(session.bytes);
    if (sessionPacket.kind !== "session") throw new Error(sessionPacket.kind);
    expect(sessionPacket.data).toEqual({
      weather: 4,
      trackTemperatureC: 42,
      airTemperatureC: 28,
      sessionType: 15,
      trackId: 11,
      gameMode: 0,
      aiDifficulty: -1,
    });

    const lapPacket = decodePacket(lap.bytes);
    if (lapPacket.kind !== "lapData") throw new Error(lapPacket.kind);
    expect(playerCar(lapPacket.cars, player)).toEqual({
      lastLapTimeMs: 81_034,
      currentLapTimeMs: 12_000,
      sector1Ms: 25_000,
      sector2Ms: 27_000,
      lapDistanceM: 512.5,
      currentLapNum: 4,
      pitStatus: 2,
      numPitStops: 3,
      currentLapInvalid: true,
      gridPosition: 7,
      driverStatus: 4,
    });

    const setupPacket = decodePacket(setup.bytes);
    if (setupPacket.kind !== "carSetups") throw new Error(setupPacket.kind);
    expect(playerCar(setupPacket.cars, player).frontWing).toBe(8);
    expect(playerCar(setupPacket.cars, player).rearWing).toBe(9);

    const telemetryPacket = decodePacket(telemetry.bytes);
    if (telemetryPacket.kind !== "carTelemetry") throw new Error(telemetryPacket.kind);
    expect(playerCar(telemetryPacket.cars, player)).toEqual({
      speedKph: 287,
      throttle: 0.5,
      brake: 0.25,
      gear: 0,
      drs: 0,
    });

    const statusPacket = decodePacket(status.bytes);
    if (statusPacket.kind !== "carStatus") throw new Error(statusPacket.kind);
    expect(playerCar(statusPacket.cars, player).actualTyreCompound).toBe(16);
    expect(playerCar(statusPacket.cars, player).visualTyreCompound).toBe(17);
    expect(playerCar(statusPacket.cars, player).tyresAgeLaps).toBe(6);
    expect(playerCar(statusPacket.cars, player).ersStoreEnergy).toBe(1_500_000);

    const historyPacket = decodePacket(history.bytes);
    if (historyPacket.kind !== "sessionHistory") throw new Error(historyPacket.kind);
    expect(historyPacket.data.carIdx).toBe(player);
    expect(historyPacket.data.laps).toHaveLength(2);
    expect(historyPacket.data.laps[0]).toEqual({
      lapTimeMs: 81_034,
      sector1Ms: 25_000,
      sector2Ms: 27_000,
      sector3Ms: 29_034,
      lapValid: true,
    });

    const otherHistory = packetWithHeader(SESSION_HISTORY_PACKET_BYTES, {
      packetFormat: format,
      packetId: PacketId.SessionHistory,
      playerCarIndex: player,
    });
    otherHistory.uint8(0).uint8(2);
    const otherHistoryPacket = decodePacket(otherHistory.bytes);
    if (otherHistoryPacket.kind !== "sessionHistory") throw new Error(otherHistoryPacket.kind);
    expect(otherHistoryPacket.data.laps).toEqual([]);

    const eventPacket = decodePacket(flashback.bytes);
    if (eventPacket.kind !== "event") throw new Error(eventPacket.kind);
    expect(eventPacket.event).toEqual({
      code: "FLBK",
      flashbackFrameIdentifier: 99,
      flashbackSessionTime: 12.5,
    });
  });

  it.each([
    { format: 2025 as const, teamId: 5, myTeam: false },
    { format: 2026 as const, teamId: 481, myTeam: false },
    { format: 2025 as const, teamId: 0, myTeam: true },
    { format: 2026 as const, teamId: 104, myTeam: true },
  ])("reads the player car Team from a $format Participants Packet", ({ format, teamId, myTeam }) => {
    const player = 19;
    const packet = decodePacket(participantsWithPlayerTeam({ packetFormat: format, playerCarIndex: player, teamId, myTeam }));
    if (packet.kind !== "participants") throw new Error(packet.kind);
    expect(playerCar(packet.cars, 0)).toEqual({ teamId: 0, myTeam: false });
    expect(playerCar(packet.cars, player)).toEqual({ teamId, myTeam });
  });

  it("reads m_myTeam from a Season 8 Participants Packet whose header still says 2025", () => {
    const player = 3;
    const bytes = participantsWithPlayerTeam({
      packetFormat: 2026,
      playerCarIndex: player,
      teamId: 0,
      myTeam: true,
    });
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint16(0, 2025, true);
    const packet = decodePacket(bytes);
    if (packet.kind !== "participants") throw new Error(packet.kind);
    expect(playerCar(packet.cars, player)).toEqual({ teamId: 0, myTeam: true });
  });

  it("reads My F1 Team from 22 F1 26 participant cars under a 2025 header", () => {
    const player = 0;
    const packet = decodePacket(
      participantsWithPlayerTeam({
        packetFormat: 2025,
        structFormat: 2026,
        numCars: 22,
        playerCarIndex: player,
        teamId: 0,
        myTeam: true,
      }),
    );
    if (packet.kind !== "participants") throw new Error(packet.kind);
    expect(playerCar(packet.cars, player)).toEqual({ teamId: 0, myTeam: true });
  });

  it("reads the player car Result from a Final Classification Packet", () => {
    const player = 2;
    const writer = packetWithHeader(finalClassificationPacketSize(f1_25), {
      packetFormat: 2025,
      packetId: PacketId.FinalClassification,
      playerCarIndex: player,
    });
    writer.seek(HEADER_SIZE + 1 + player * 46).uint8(1).uint8(58).uint8(4).uint8(0).uint8(2).uint8(3).skip(5).double(90.5);
    const packet = decodePacket(writer.bytes);
    if (packet.kind !== "finalClassification") throw new Error(packet.kind);
    expect(playerCar(packet.cars, player)).toEqual({
      position: 1,
      resultStatus: 3,
      gridPosition: 4,
      numPitStops: 2,
      totalRaceTimeS: 90.5,
    });
  });

  it("reads AI difficulty and game mode from a full Session Packet", () => {
    const writer = packetWithHeader(753, { packetFormat: 2025, packetId: PacketId.Session });
    writer.uint8(0).int8(30).int8(22).uint8(50).uint16(5800).uint8(15).int8(11);
    writer.bytes[HEADER_SIZE + 640] = 90;
    writer.bytes[HEADER_SIZE + 665] = 5;
    const packet = decodePacket(writer.bytes);
    if (packet.kind !== "session") throw new Error(packet.kind);
    expect(packet.data.aiDifficulty).toBe(90);
    expect(packet.data.gameMode).toBe(5);
    expect(packet.data.trackId).toBe(11);
  });
});
