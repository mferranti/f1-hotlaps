import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Storage from "expo-sqlite/kv-store";

import { startRuntime } from "@/capture/runtime";
import { usePip } from "@/pip/use-pip";
import { ConfigHeaderButton, HeaderBackButton, stackHeaderOptions } from "@/ui/header";

export default function RootLayout() {
  usePip();
  useEffect(() => {
    void startRuntime(Storage);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={({ route }) => ({
          ...stackHeaderOptions,
          headerRight: route.name === "config" ? undefined : () => <ConfigHeaderButton />,
        })}
      >
        <Stack.Screen name="index" options={{ title: "F1 Hotlaps" }} />
        <Stack.Screen name="laps/index" options={{ title: "Laps history" }} />
        <Stack.Screen name="laps/[id]" options={{ headerShown: false, title: "Lap" }} />
        <Stack.Screen name="sessions/index" options={{ title: "Sessions history" }} />
        <Stack.Screen name="sessions/[id]" options={{ title: "Session" }} />
        <Stack.Screen
          name="config"
          options={{ title: "Config", headerLeft: () => <HeaderBackButton /> }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
