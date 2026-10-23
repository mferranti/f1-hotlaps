import { useSyncExternalStore } from "react";

import { getLiveCar, subscribeLiveCar } from "./live-store";

export function useLiveCar() {
  return useSyncExternalStore(subscribeLiveCar, getLiveCar);
}
