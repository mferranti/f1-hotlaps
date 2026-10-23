import { decodeHeader } from "@/protocol/header";
import { SUPPORTED_PACKET_FORMATS } from "@/protocol/decode";

export const ACTIVITY_WINDOW = 60;
export const SAMPLE_MS = 1000;
export const CONNECTION_TIMEOUT_MS = 2000;
export const WAITING_LIMIT_MS = 30 * 60 * 1000;

export type LinkStatus = "waiting" | "receiving" | "unsupported";

export function packetsPerSecond(prevCount: number, nextCount: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return Math.max(0, ((nextCount - prevCount) * 1000) / elapsedMs);
}

export function pushRateSample(history: readonly number[], sample: number, window = ACTIVITY_WINDOW): number[] {
  return [...history.slice(Math.max(0, history.length + 1 - window)), sample];
}

export class PacketActivity {
  packetsPerSec = 0;
  history: number[] = Array.from({ length: ACTIVITY_WINDOW }, () => 0);
  status: LinkStatus = "waiting";
  unsupportedFormat: number | undefined;
  everReceived = false;
  waitingMs = 0;

  private count = 0;
  private prev = { count: 0, at: 0 };
  private lastPacketAt: number | undefined;

  onPacket(bytes: Uint8Array, now: number): void {
    this.count += 1;
    this.lastPacketAt = now;
    this.everReceived = true;
    try {
      const format = decodeHeader(bytes).packetFormat;
      if (!SUPPORTED_PACKET_FORMATS.includes(format)) {
        this.unsupportedFormat = format;
        this.status = "unsupported";
      } else {
        this.unsupportedFormat = undefined;
      }
    } catch {
      /* truncated Packet: still counts toward the rate */
    }
  }

  tick(now: number): void {
    const elapsed = this.prev.at === 0 ? SAMPLE_MS : now - this.prev.at;
    if (this.prev.at !== 0 && elapsed <= 0) return;
    this.packetsPerSec = packetsPerSecond(this.prev.count, this.count, elapsed);
    this.prev = { count: this.count, at: now };
    this.history = pushRateSample(this.history, this.packetsPerSec);
    if (this.unsupportedFormat !== undefined) {
      this.status = "unsupported";
      this.waitingMs = 0;
      return;
    }
    const receiving =
      this.lastPacketAt !== undefined && now - this.lastPacketAt < CONNECTION_TIMEOUT_MS;
    this.status = receiving ? "receiving" : "waiting";
    this.waitingMs = receiving ? 0 : this.lastPacketAt === undefined ? 0 : now - this.lastPacketAt;
  }

  get idleTimedOut(): boolean {
    return this.status === "waiting" && this.waitingMs >= WAITING_LIMIT_MS;
  }
}
