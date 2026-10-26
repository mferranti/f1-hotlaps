import { join } from "node:path";

import { readPacketFile } from "../../scripts/packet-file";
import { decodePacket } from "./decode";

describe("recorded fixtures", () => {
  it("decodes Session Packets from the Spa clean-lap capture", () => {
    const packets = readPacketFile(join(__dirname, "../../fixtures/packets/f1-25-clean-lap.bin.gz"));
    const session = packets.map((record) => decodePacket(record.bytes)).find((packet) => packet.kind === "session");
    expect(session?.kind).toBe("session");
    if (session?.kind !== "session") return;
    expect(session.data.trackId).toBe(10);
    expect(session.header.packetFormat).toBe(2025);
    expect(session.data.gameMode).toBe(5);
    expect(session.data.aiDifficulty).toBe(0);
  });

  it("reads Grand Prix from the Spa wet-lap capture", () => {
    const packets = readPacketFile(join(__dirname, "../../fixtures/packets/f1-25-wet-lap.bin.gz"));
    const session = packets.map((record) => decodePacket(record.bytes)).find((packet) => packet.kind === "session");
    expect(session?.kind).toBe("session");
    if (session?.kind !== "session") return;
    expect(session.data.gameMode).toBe(4);
    expect(session.data.aiDifficulty).toBe(80);
  });
});
