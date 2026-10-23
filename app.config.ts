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
  icon: "./assets/icon.png",
  ios: {
    bundleIdentifier: "com.mferranti.f1hotlaps",
    icon: "./assets/icon.png",
    supportsTablet: false,
    infoPlist: {
      NSLocalNetworkUsageDescription:
        "F1 Hotlaps listens on your local network for telemetry Packets sent by the F1 game.",
    },
  },
  android: {
    package: "com.mferranti.f1hotlaps",
    permissions: ["INTERNET"],
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#0e1116",
    },
  },
  plugins: [
    "expo-router",
    "expo-dev-client",
    "expo-status-bar",
    "expo-sqlite",
    "expo-sharing",
    "./modules/pip/app.plugin.js",
  ],
};

export default config;
