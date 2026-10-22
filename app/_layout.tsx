import { Link, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

function ConfigButton() {
  return (
    <Link href="/config" asChild>
      <Pressable accessibilityRole="button" hitSlop={8}>
        <Text>Config</Text>
      </Pressable>
    </Link>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={({ route }) => ({
          headerRight: route.name === "config" ? undefined : () => <ConfigButton />,
        })}
      >
        <Stack.Screen name="index" options={{ title: "F1 Hotlaps" }} />
        <Stack.Screen name="laps/index" options={{ title: "Laps history" }} />
        <Stack.Screen name="laps/[id]" options={{ title: "Lap" }} />
        <Stack.Screen name="config" options={{ title: "Config" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
