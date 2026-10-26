import { useFocusEffect } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { useCallback, useState } from "react";

import { DEFAULT_SETTINGS, SettingsRepository, type Settings } from "@/storage/settings-repository";

const settings = new SettingsRepository(Storage);

/** Settings for the focused screen. Reads again when the screen is shown, so Config changes apply. */
export function useSettings(): Settings {
  const [value, setValue] = useState<Settings>(DEFAULT_SETTINGS);

  useFocusEffect(
    useCallback(() => {
      let current = true;
      void settings
        .get()
        .then((next) => {
          if (current) setValue(next);
        })
        .catch(() => {
          // Keep the last settings when storage cannot be opened.
        });
      return () => {
        current = false;
      };
    }, []),
  );

  return value;
}
