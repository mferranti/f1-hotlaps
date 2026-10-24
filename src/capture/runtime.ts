import { PacketActivity, SAMPLE_MS } from "@/activity/packet-activity";
import { DEFAULT_TELEMETRY_PORT, listenUdp, type StopListening } from "@/capture/udp-listener";
import type { CompletedLap } from "@/domain/types";
import { getLiveCar, setLiveCar, type LiveCar } from "@/live/live-store";
import {
  decodePacket,
  PacketId,
  peekPacketId,
  playerCar,
  recordedTeamId,
  UnsupportedPacketFormatError,
} from "@/protocol";
import { LapRecorder, storesLap } from "@/recording/lap-recorder";
import type { LapRepository } from "@/storage/lap-repository";
import { MemoryLapRepository } from "@/storage/memory-lap-repository";
import { SettingsRepository, type KvStore } from "@/storage/settings-repository";
import { SqliteLapRepository } from "@/storage/sqlite-lap-repository";

export const activity = new PacketActivity();
export const recorder = new LapRecorder();

const RECORDED_PACKET_IDS = new Set<number>([
  PacketId.Session,
  PacketId.LapData,
  PacketId.Event,
  PacketId.Participants,
  PacketId.CarSetups,
  PacketId.CarTelemetry,
  PacketId.CarStatus,
  PacketId.FinalClassification,
  PacketId.SessionHistory,
]);

const LIVE_UI_MS = 100;

const activityListeners = new Set<() => void>();
let activityVersion = 0;
const lapListeners = new Set<() => void>();
let lastLiveNotifyAt = 0;

export function subscribeActivity(listener: () => void): () => void {
  activityListeners.add(listener);
  return () => activityListeners.delete(listener);
}

export function subscribeLaps(listener: () => void): () => void {
  lapListeners.add(listener);
  return () => lapListeners.delete(listener);
}

function notifyLaps(): void {
  lapListeners.forEach((listen) => listen());
}

function liveCarChanged(prev: LiveCar | null, next: LiveCar): boolean {
  if (!prev) return true;
  return (
    prev.game !== next.game ||
    prev.trackId !== next.trackId ||
    prev.sessionType !== next.sessionType ||
    prev.lapNumber !== next.lapNumber ||
    prev.currentLapTimeMs !== next.currentLapTimeMs ||
    prev.speedKph !== next.speedKph ||
    prev.throttle !== next.throttle ||
    prev.brake !== next.brake ||
    prev.teamId !== next.teamId ||
    prev.myTeam !== next.myTeam
  );
}

export function getActivityVersion(): number {
  return activityVersion;
}

function notifyActivity(): void {
  activityVersion += 1;
  activityListeners.forEach((listen) => listen());
}

let laps: LapRepository = new MemoryLapRepository();
let settings: SettingsRepository | undefined;
let stop: StopListening | undefined;
let tick: ReturnType<typeof setInterval> | undefined;

export function lapRepository(): LapRepository {
  return laps;
}

export function setLapRepository(repo: LapRepository): void {
  laps = repo;
}

export async function startRuntime(kv: KvStore): Promise<void> {
  try {
    settings = new SettingsRepository(kv);
    laps = new SqliteLapRepository();
  } catch {
    laps = new MemoryLapRepository();
  }
  try {
    const port = (await settings?.get())?.port ?? DEFAULT_TELEMETRY_PORT;
    await listen(port);
  } catch {
    /* bind can fail on Fast Refresh while the previous socket still owns the port */
  }
  if (tick) clearInterval(tick);
  tick = setInterval(() => {
    activity.tick(Date.now());
    notifyActivity();
    if (activity.idleTimedOut) recorder.reset();
  }, SAMPLE_MS);
}

export async function restartRuntime(port: number): Promise<void> {
  await listen(port);
}

export function stopRuntime(): void {
  void stop?.();
  stop = undefined;
  if (tick) clearInterval(tick);
  tick = undefined;
  recorder.reset();
}

async function listen(port: number): Promise<void> {
  await stop?.();
  stop = undefined;
  stop = await listenUdp(port, (bytes) => {
    const now = Date.now();
    const firstPacket = !activity.everReceived;
    activity.onPacket(bytes, now);
    const packetId = bytes.byteLength < 7 ? -1 : peekPacketId(bytes);
    if (!RECORDED_PACKET_IDS.has(packetId)) {
      if (firstPacket) notifyActivity();
      return;
    }
    try {
      const packet = decodePacket(bytes);
      const completed = recorder.push(packet, now);
      if (completed) void commit(completed);
      if (packet.kind === "finalClassification") {
        const player = packet.header.playerCarIndex;
        if (player < packet.cars.length) {
          const car = playerCar(packet.cars, player);
          void laps
            .saveSessionResult({
              game: packet.header.packetFormat === 2026 ? "f1-26" : "f1-25",
              sessionUid: packet.header.sessionUid,
              position: car.position,
              resultStatus: car.resultStatus,
            })
            .then(() => notifyLaps());
        }
      }
      updateLive(packet);
    } catch (error) {
      if (!(error instanceof UnsupportedPacketFormatError) && !(error instanceof RangeError)) throw error;
    }
    if (firstPacket) notifyActivity();
  });
}

async function commit(lap: CompletedLap): Promise<void> {
  const current = await settings?.get();
  if (!storesLap(lap.valid, current?.storeInvalidLaps ?? true)) return;
  const retention = current?.traceRetention ?? "all";
  await laps.commitLap(lap, retention);
  notifyLaps();
}

function updateLive(packet: ReturnType<typeof decodePacket>): void {
  const game = packet.header.packetFormat === 2026 ? "f1-26" : "f1-25";
  const player = packet.header.playerCarIndex;
  const prev = getLiveCar();
  const next: LiveCar = {
    game,
    trackId: prev?.trackId ?? -1,
    sessionType: prev?.sessionType ?? 0,
    lapNumber: prev?.lapNumber ?? 0,
    currentLapTimeMs: prev?.currentLapTimeMs ?? 0,
    speedKph: prev?.speedKph ?? 0,
    throttle: prev?.throttle ?? 0,
    brake: prev?.brake ?? 0,
    teamId: prev?.teamId,
    myTeam: prev?.myTeam,
  };
  if (packet.kind === "session") {
    next.trackId = packet.data.trackId;
    next.sessionType = packet.data.sessionType;
  }
  if (packet.kind === "participants" && player < packet.cars.length) {
    const car = playerCar(packet.cars, player);
    next.teamId = recordedTeamId(car);
    next.myTeam = car.myTeam;
  }
  if (packet.kind === "lapData" && player < packet.cars.length) {
    const car = playerCar(packet.cars, player);
    next.lapNumber = car.currentLapNum;
    next.currentLapTimeMs = car.currentLapTimeMs;
  }
  if (packet.kind === "carTelemetry" && player < packet.cars.length) {
    const car = playerCar(packet.cars, player);
    next.speedKph = car.speedKph;
    next.throttle = car.throttle;
    next.brake = car.brake;
  }
  if (!liveCarChanged(prev, next)) return;
  const discrete =
    prev === null ||
    prev.game !== next.game ||
    prev.trackId !== next.trackId ||
    prev.sessionType !== next.sessionType ||
    prev.lapNumber !== next.lapNumber ||
    prev.teamId !== next.teamId ||
    prev.myTeam !== next.myTeam;
  const at = performance.now();
  const notify = discrete || at - lastLiveNotifyAt >= LIVE_UI_MS;
  if (notify) lastLiveNotifyAt = at;
  setLiveCar(next, notify);
}
