import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { lapRepository } from "@/capture/runtime";
import { setupGroups, type SetupGroup } from "@/domain/setup-labels";
import type { LapDetail } from "@/storage/lap-repository";
import { colors } from "@/ui/theme";

export default function SetupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lap, setLap] = useState<LapDetail | null>(null);
  const [open, setOpen] = useState<ReadonlySet<string>>(
    () => new Set(["Aerodynamics", "Transmission", "Suspension"]),
  );

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

  const groups = setupGroups(lap.setup);

  function toggle(title: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      {groups.length === 0 ? <Text style={styles.muted}>No Setup stored for this Lap.</Text> : null}
      {groups.map((group) => (
        <SetupMenu key={group.title} group={group} expanded={open.has(group.title)} onPress={() => toggle(group.title)} />
      ))}
    </ScrollView>
  );
}

function SetupBar({ fill, min, max }: { fill: number; min: string; max: string }) {
  return (
    <View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fill * 100}%` }]} />
      </View>
      <View style={styles.ends}>
        <Text style={styles.end}>{min}</Text>
        <Text style={styles.end}>{max}</Text>
      </View>
    </View>
  );
}

function SetupMenu({
  group,
  expanded,
  onPress,
}: {
  group: SetupGroup;
  expanded: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.menu}>
      <Pressable
        style={styles.header}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={styles.title}>{group.title}</Text>
        <Text style={styles.chevron}>{expanded ? "▾" : "▸"}</Text>
      </Pressable>
      {expanded
        ? group.rows.map((row) => (
            <View key={row.key} style={styles.row}>
              <View style={styles.labelCol}>
                <Text style={styles.label}>{row.label}</Text>
              </View>
              <View style={styles.barCol}>
                {row.fill === null || row.min === null || row.max === null ? null : (
                  <SetupBar fill={row.fill} min={row.min} max={row.max} />
                )}
              </View>
              <Text style={styles.value}>{row.value}</Text>
            </View>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, gap: 10 },
  muted: { color: colors.muted },
  menu: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: "700" },
  chevron: { color: colors.muted, fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
    paddingBottom: 18,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  labelCol: { flex: 1 },
  label: { color: colors.muted },
  barCol: { flex: 1, justifyContent: "center" },
  track: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: colors.accent, borderRadius: 3 },
  ends: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  end: { color: colors.muted, fontSize: 10, fontVariant: ["tabular-nums"] },
  value: {
    width: 56,
    flexShrink: 0,
    color: colors.text,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
});
