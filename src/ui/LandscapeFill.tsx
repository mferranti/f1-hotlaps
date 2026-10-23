import type { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { landscapeFrame } from "@/ui/landscape-frame";
import { colors } from "@/ui/theme";

export function LandscapeFill({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const frame = landscapeFrame(width, height);
  const padding = frame.rotated
    ? {
        paddingTop: Math.max(12, insets.right),
        paddingBottom: Math.max(12, insets.left),
        paddingLeft: Math.max(16, insets.top),
        paddingRight: Math.max(16, insets.bottom),
      }
    : {
        paddingTop: Math.max(12, insets.top),
        paddingBottom: Math.max(12, insets.bottom),
        paddingLeft: Math.max(16, insets.left),
        paddingRight: Math.max(16, insets.right),
      };

  if (!frame.rotated) {
    return <View style={[styles.fill, padding]}>{children}</View>;
  }

  return (
    <View style={styles.host}>
      <View
        style={[
          styles.rotated,
          padding,
          {
            width: frame.width,
            height: frame.height,
            left: frame.left,
            top: frame.top,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg, gap: 8 },
  host: { flex: 1, backgroundColor: colors.bg, overflow: "hidden" },
  rotated: {
    position: "absolute",
    backgroundColor: colors.bg,
    gap: 8,
    transform: [{ rotate: "90deg" }],
  },
});
