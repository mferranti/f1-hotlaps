import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { lapRepository } from "@/capture/runtime";
import { setupRows } from "@/domain/setup-labels";
import type { LapDetail } from "@/storage/lap-repository";
import { colors } from "@/ui/theme";

export default function SetupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lap, setLap] = useState<LapDetail | null>(null);

  useEffect(() => {
    void lapRepository().getLap(Number(id)).then(setLap);
  }, [id]);

  if (!lap) {
    return (
      <View style={styles.screen}>
        <Text style={styles.muted}>Lap not found</Text>
      </View>
    );
  }

  const rows = setupRows(lap.setup);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, gap: 8 }}>
      {rows.length === 0 ? <Text style={styles.muted}>No Setup stored for this Lap.</Text> : null}
      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  muted: { color: colors.muted },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { color: colors.muted },
  value: { color: colors.text, fontVariant: ["tabular-nums"] },
});
