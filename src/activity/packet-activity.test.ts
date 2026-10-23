import { PacketActivity, packetsPerSecond, pushRateSample, WAITING_LIMIT_MS } from "./packet-activity";
import { packetWithHeader } from "@/protocol/test/packet-builder";
import { PacketId } from "@/protocol/header";

describe("packetsPerSecond", () => {
  it("returns 0 when no time passed", () => {
    expect(packetsPerSecond(10, 20, 0)).toBe(0);
  });

  it("scales a 250 ms sample up to a second", () => {
    expect(packetsPerSecond(0, 5, 250)).toBe(20);
  });
});

describe("pushRateSample", () => {
  it("keeps the last window samples", () => {
    expect(pushRateSample([1, 2, 3], 4, 3)).toEqual([2, 3, 4]);
  });
});

describe("PacketActivity", () => {
  it("is Receiving within 2 seconds of a Packet and Waiting after that", () => {
    const activity = new PacketActivity();
    activity.onPacket(packetWithHeader(29, { packetFormat: 2025, packetId: PacketId.Motion }).bytes, 1000);
    activity.tick(1000);
    expect(activity.status).toBe("receiving");
    expect(activity.everReceived).toBe(true);
    activity.tick(3500);
    expect(activity.status).toBe("waiting");
  });

  it("marks an unsupported format without treating it as Receiving of a supported Game", () => {
    const activity = new PacketActivity();
    activity.onPacket(packetWithHeader(29, { packetFormat: 2024, packetId: PacketId.Motion }).bytes, 1000);
    activity.tick(1000);
    expect(activity.status).toBe("unsupported");
    expect(activity.unsupportedFormat).toBe(2024);
  });

  it("times out after 30 minutes of Waiting", () => {
    const activity = new PacketActivity();
    activity.onPacket(packetWithHeader(29, { packetFormat: 2025, packetId: PacketId.Motion }).bytes, 0);
    activity.tick(0);
    activity.tick(WAITING_LIMIT_MS);
    expect(activity.idleTimedOut).toBe(true);
  });

  it("does not drop the rate when two ticks share a timestamp", () => {
    const activity = new PacketActivity();
    const bytes = packetWithHeader(29, { packetFormat: 2025, packetId: PacketId.Motion }).bytes;
    for (let i = 0; i < 10; i += 1) activity.onPacket(bytes, 1000);
    activity.tick(1000);
    expect(activity.packetsPerSec).toBe(10);
    activity.tick(1000);
    expect(activity.packetsPerSec).toBe(10);
    expect(activity.history.at(-1)).toBe(10);
  });
});
