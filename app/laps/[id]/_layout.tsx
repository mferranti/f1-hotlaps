import { Stack } from "expo-router";

import { ConfigHeaderButton, HeaderBackButton, stackHeaderOptions } from "@/ui/header";

export default function LapLayout() {
  return (
    <Stack
      screenOptions={{
        ...stackHeaderOptions,
        headerRight: () => <ConfigHeaderButton />,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Lap", headerLeft: () => <HeaderBackButton /> }}
      />
      <Stack.Screen
        name="setup"
        options={{ title: "Setup", headerLeft: () => <HeaderBackButton /> }}
      />
      <Stack.Screen
        name="graph"
        options={{
          headerShown: false,
          orientation: "landscape",
          presentation: "fullScreenModal",
          animation: "fade",
        }}
      />
    </Stack>
  );
}
