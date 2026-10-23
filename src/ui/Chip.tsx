import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "@/ui/theme";

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipOn]}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { borderColor: colors.border, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.bg, borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 12 },
});
