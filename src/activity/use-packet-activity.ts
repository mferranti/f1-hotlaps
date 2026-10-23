import { useSyncExternalStore } from "react";

import { activity, getActivityVersion, subscribeActivity } from "@/capture/runtime";

export function usePacketActivity() {
  useSyncExternalStore(subscribeActivity, getActivityVersion);
  return activity;
}
