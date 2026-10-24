import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import type { Condition } from "@/domain/types";
import { gameModeName } from "@/protocol/game-modes";
import { teamName } from "@/protocol/teams";
import { trackLabel } from "@/protocol/tracks";
import { lapRepository } from "@/capture/runtime";
import type { LapSort, LapSummary } from "@/storage/lap-repository";
import { CheckRow } from "@/ui/CheckRow";
import { Chip } from "@/ui/Chip";
import { LapsTable } from "@/ui/LapsTable";
import { colors } from "@/ui/theme";

export default function LapsHistoryScreen() {
  const [trackId, setTrackId] = useState<number | undefined>();
  const [condition, setCondition] = useState<Condition | undefined>();
  const [gameMode, setGameMode] = useState<number | undefined>();
  const [teamId, setTeamId] = useState<number | undefined>();
  const [laps, setLaps] = useState<LapSummary[]>([]);
  const [tracks, setTracks] = useState<number[]>([]);
  const [trackOpen, setTrackOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<LapSort>("newest");
  const [hideInvalid, setHideInvalid] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const selectedTrackId = trackId ?? tracks[0];

  useEffect(() => {
    void lapRepository().listTracks().then(setTracks);
  }, []);

  useEffect(() => {
    if (selectedTrackId === undefined) return;
    void lapRepository().listLaps({ trackId: selectedTrackId, sort }).then(setLaps);
  }, [selectedTrackId, sort]);

  async function refresh() {
    const nextTracks = await lapRepository().listTracks();
    setTracks(nextTracks);
    const track = trackId ?? nextTracks[0];
    if (track === undefined) {
      setLaps([]);
      return;
    }
    setLaps(await lapRepository().listLaps({ trackId: track, sort }));
  }

  const filtered = useMemo(
    () =>
      laps.filter(
        (lap) =>
          (!hideInvalid || lap.valid) &&
          (condition === undefined || lap.condition === condition) &&
          (gameMode === undefined || lap.gameMode === gameMode) &&
          (teamId === undefined || lap.teamId === teamId),
      ),
    [laps, hideInvalid, condition, gameMode, teamId],
  );

  const modes = [...new Set(laps.map((lap) => lap.gameMode))].sort((a, b) => a - b);
  const teams = [...new Set(laps.map((lap) => lap.teamId))].sort((a, b) => a - b);

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <Pressable style={styles.trackSelect} onPress={() => setTrackOpen(true)}>
          <Text style={styles.trackText}>
            {selectedTrackId === undefined ? "No tracks yet" : trackLabel(selectedTrackId)}
          </Text>
        </Pressable>
        <Pressable style={styles.filterBtn} onPress={() => setFilterOpen(true)}>
          <Text style={styles.filterText}>Filter</Text>
        </Pressable>
      </View>
      <View style={styles.sortRow}>
        <Chip label="Newest" selected={sort === "newest"} onPress={() => setSort("newest")} />
        <Chip label="Fastest" selected={sort === "fastest"} onPress={() => setSort("fastest")} />
      </View>

      <ScrollView
        contentContainerStyle={styles.table}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void refresh().finally(() => setRefreshing(false));
            }}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <LapsTable laps={filtered} peers={laps} />
      </ScrollView>

      <Modal visible={trackOpen} animationType="fade" transparent onRequestClose={() => setTrackOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setTrackOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Track</Text>
            {tracks.map((id) => (
              <Pressable
                key={id}
                style={styles.option}
                onPress={() => {
                  setTrackId(id);
                  setTrackOpen(false);
                }}
              >
                <Text style={styles.optionText}>{trackLabel(id)}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={filterOpen} animationType="fade" transparent onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFilterOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Filter</Text>
            <Text style={styles.muted}>Condition</Text>
            <View style={styles.chips}>
              <Chip label="All" selected={condition === undefined} onPress={() => setCondition(undefined)} />
              <Chip label="Dry" selected={condition === "dry"} onPress={() => setCondition("dry")} />
              <Chip label="Wet" selected={condition === "wet"} onPress={() => setCondition("wet")} />
            </View>
            <Text style={styles.muted}>Game mode</Text>
            <View style={styles.chips}>
              <Chip label="All" selected={gameMode === undefined} onPress={() => setGameMode(undefined)} />
              {modes.map((id) => (
                <Chip
                  key={id}
                  label={gameModeName(id)}
                  selected={gameMode === id}
                  onPress={() => setGameMode(id)}
                />
              ))}
            </View>
            <CheckRow
              label="Hide invalid Laps"
              checked={hideInvalid}
              onPress={() => setHideInvalid((value) => !value)}
            />
            <Text style={styles.muted}>Team</Text>
            <View style={styles.chips}>
              <Chip label="All" selected={teamId === undefined} onPress={() => setTeamId(undefined)} />
              {teams.map((id) => (
                <Chip key={id} label={teamName(id)} selected={teamId === id} onPress={() => setTeamId(id)} />
              ))}
            </View>
            <Pressable style={styles.filterBtn} onPress={() => setFilterOpen(false)}>
              <Text style={styles.filterText}>Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  toolbar: { flexDirection: "row", gap: 8, padding: 12, alignItems: "center" },
  trackSelect: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  trackText: { color: colors.text, fontSize: 16, fontWeight: "600" },
  filterBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterText: { color: colors.text, fontWeight: "600" },
  sortRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingBottom: 4 },
  table: { paddingHorizontal: 8, paddingBottom: 16 },
  muted: { color: colors.muted, marginTop: 8 },
  backdrop: { flex: 1, backgroundColor: "#0008", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.card, padding: 16, gap: 10, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  option: { paddingVertical: 10 },
  optionText: { color: colors.text, fontSize: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
