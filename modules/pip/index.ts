import { requireOptionalNativeModule } from "expo";

import type { PipNative } from "@/pip/pip-controller";

type Native = PipNative & {
  addListener(event: string, listener: (body: { active: boolean }) => void): { remove(): void };
};

function load(): Native | null {
  return requireOptionalNativeModule<Native>("Pip");
}

const native = load();

export const pipNativeAvailable = native != null;

export const pipNative: PipNative = native ?? {
  async arm() {},
  async disarm() {},
  async isActive() {
    return false;
  },
  async setOverlay() {},
};

export function onPipModeChange(listener: (active: boolean) => void): () => void {
  if (!native) return () => {};
  const sub = native.addListener("onModeChange", (body) => listener(body.active));
  return () => sub.remove();
}
