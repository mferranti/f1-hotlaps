import type { ExpoConfig } from "expo/config";
import pkg from "./package.json";

const config: ExpoConfig = {
  name: "F1 Hotlaps",
  slug: "f1-hotlaps",
  scheme: "f1hotlaps",
  version: pkg.version,
  platforms: ["ios", "android"],
  orientation: "default",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "com.mferranti.f1hotlaps",
    supportsTablet: false,
    infoPlist: {
      NSLocalNetworkUsageDescription:
        "F1 Hotlaps listens on your local network for telemetry Packets sent by the F1 game.",
    },
  },
  android: {
    package: "com.mferranti.f1hotlaps",
    permissions: ["INTERNET"],
  },
  plugins: ["expo-router", "expo-dev-client", "expo-status-bar", "expo-sqlite", "expo-sharing"],
};

export default config;
