import { activity } from "@/capture/runtime";

export interface PipNative {
  arm(): Promise<void>;
  disarm(): Promise<void>;
  isActive(): Promise<boolean>;
  setOverlay?(rate: number, receiving: boolean, history?: readonly number[]): Promise<void>;
}

/** Picture-in-picture stays armed so leaving the app can be tested without Packets. */
export function shouldEnterPip(): boolean {
  return !activity.idleTimedOut;
}

/**
 * Keep the native session armed in the foreground. Disarm after the 30-minute Waiting limit.
 */
export async function syncPip(native: PipNative): Promise<void> {
  if (shouldEnterPip()) await native.arm();
  else await native.disarm();
  await pushOverlay(native);
}

async function pushOverlay(native: PipNative): Promise<void> {
  await native.setOverlay?.(activity.packetsPerSec, activity.status === "receiving", activity.history);
}

export async function onLeavingApp(native: PipNative): Promise<void> {
  if (shouldEnterPip()) await native.arm();
  else await native.disarm();
  await pushOverlay(native);
}

export async function onIdleTimeout(native: PipNative): Promise<void> {
  if (activity.idleTimedOut) await native.disarm();
}
