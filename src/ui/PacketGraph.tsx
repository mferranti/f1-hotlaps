import { StyleSheet, View } from "react-native";

import { colors } from "@/ui/theme";

const INNER = 72;

export function PacketGraph({ samples }: { samples: readonly number[] }) {
  const peak = Math.max(1, ...samples);
  return (
    <View style={styles.chart} accessibilityLabel="Packet rate">
      {samples.map((sample, index) => (
        <View key={index} style={[styles.bar, { height: Math.max(2, (sample / peak) * INNER) }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    height: 96,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
  },
  bar: { flex: 1, backgroundColor: colors.accent, borderRadius: 1 },
});
