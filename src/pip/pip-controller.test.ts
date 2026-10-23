import { activity } from "@/capture/runtime";
import { packetWithHeader } from "@/protocol/test/packet-builder";
import { PacketId } from "@/protocol/header";
import { onIdleTimeout, onLeavingApp, shouldEnterPip, syncPip } from "./pip-controller";
import { WAITING_LIMIT_MS } from "@/activity/packet-activity";

describe("pip-controller", () => {
  beforeEach(() => {
    activity.everReceived = false;
    activity.waitingMs = 0;
    activity.status = "waiting";
  });

  it("arms in the foreground even before any Packet arrives", async () => {
    const native = { arm: jest.fn(), disarm: jest.fn(), isActive: jest.fn() };
    expect(shouldEnterPip()).toBe(true);
    await syncPip(native);
    expect(native.arm).toHaveBeenCalled();
  });

  it("enters picture-in-picture when leaving, even while Waiting", async () => {
    activity.onPacket(packetWithHeader(29, { packetFormat: 2025, packetId: PacketId.Motion }).bytes, 0);
    const native = { arm: jest.fn(), disarm: jest.fn(), isActive: jest.fn() };
    expect(shouldEnterPip()).toBe(true);
    await onLeavingApp(native);
    expect(native.arm).toHaveBeenCalled();
  });

  it("disarms after 30 minutes of Waiting", async () => {
    activity.onPacket(packetWithHeader(29, { packetFormat: 2025, packetId: PacketId.Motion }).bytes, 0);
    activity.tick(0);
    activity.tick(WAITING_LIMIT_MS);
    const native = { arm: jest.fn(), disarm: jest.fn(), isActive: jest.fn() };
    await onIdleTimeout(native);
    expect(native.disarm).toHaveBeenCalled();
  });
});
