import { Link, useRouter } from "expo-router";
import { Pressable } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { colors } from "@/ui/theme";

export const stackHeaderOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  headerTitleStyle: { color: colors.text, fontWeight: "600" as const },
  headerBackTitleVisible: false,
};

export function ConfigHeaderButton() {
  return (
    <Link href="/config" asChild>
      <Pressable accessibilityRole="button" accessibilityLabel="Config" hitSlop={8}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="3" fill="none" stroke={colors.text} strokeWidth={2} />
          <Path
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
            fill="none"
            stroke={colors.text}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
    </Link>
  );
}

export function ExpandGraphIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"
        fill="none"
        stroke={colors.text}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HeaderBackButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path
          d="M15 18l-6-6 6-6"
          fill="none"
          stroke={colors.text}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}
