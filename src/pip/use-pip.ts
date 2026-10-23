import { useEffect } from "react";
import { AppState } from "react-native";

import { pipNative } from "@/pip/native";
import { onLeavingApp, syncPip } from "./pip-controller";
import { subscribeActivity } from "@/capture/runtime";

export function usePip() {
  useEffect(() => {
    void syncPip(pipNative);
    const app = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") void onLeavingApp(pipNative);
      if (state === "active") void syncPip(pipNative);
    });
    const stop = subscribeActivity(() => {
      void syncPip(pipNative);
    });
    return () => {
      app.remove();
      stop();
    };
  }, []);
}
