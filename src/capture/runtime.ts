import { PacketActivity, SAMPLE_MS } from "@/activity/packet-activity";
import { listenUdp, type StopListening } from "@/capture/udp-listener";
import type { CompletedLap } from "@/domain/types";
import { getLiveCar, setLiveCar, type LiveCar } from "@/live/live-store";
import { decodePacket, playerCar, recordedTeamId, UnsupportedPacketFormatError } from "@/protocol";
import { LapRecorder } from "@/recording/lap-recorder";
import type { LapRepository } from "@/storage/lap-repository";
import { MemoryLapRepository } from "@/storage/memory-lap-repository";
import { SettingsRepository, type KvStore } from "@/storage/settings-repository";
import { SqliteLapRepository } from "@/storage/sqlite-lap-repository";

export const activity = new PacketActivity();
export const recorder = new LapRecorder();

const activityListeners = new Set<() => void>();
let activityVersion = 0;

export function subscribeActivity(listener: () => void): () => void {
  activityListeners.add(listener);
  return () => activityListeners.delete(listener);
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
    const { port } = await settings.get();
    await listen(port);
  } catch {
    laps = new MemoryLapRepository();
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
  stop?.();
  stop = undefined;
  if (tick) clearInterval(tick);
  tick = undefined;
  recorder.reset();
}

async function listen(port: number): Promise<void> {
  stop?.();
  stop = await listenUdp(port, (bytes) => {
    const now = Date.now();
    const firstPacket = !activity.everReceived;
    activity.onPacket(bytes, now);
    try {
      const packet = decodePacket(bytes);
      const completed = recorder.push(packet, now);
      if (completed) void commit(completed);
      if (packet.kind === "finalClassification") {
        const player = packet.header.playerCarIndex;
        if (player < packet.cars.length) {
          const car = playerCar(packet.cars, player);
          void laps.saveSessionResult({
            game: packet.header.packetFormat === 2026 ? "f1-26" : "f1-25",
            sessionUid: packet.header.sessionUid,
            position: car.position,
            resultStatus: car.resultStatus,
          });
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
  const retention = (await settings?.get())?.traceRetention ?? "all";
  await laps.commitLap(lap, retention);
}

function updateLive(packet: ReturnType<typeof decodePacket>): void {
  const game = packet.header.packetFormat === 2026 ? "f1-26" : "f1-25";
  const player = packet.header.playerCarIndex;
  const next: LiveCar = getLiveCar() ?? {
    game,
    trackId: -1,
    sessionType: 0,
    lapNumber: 0,
    currentLapTimeMs: 0,
    speedKph: 0,
    throttle: 0,
    brake: 0,
  };
  next.game = game;
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
  setLiveCar({ ...next });
}
