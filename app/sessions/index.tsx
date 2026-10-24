import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { lapRepository } from "@/capture/runtime";
import { sessionTypeName } from "@/protocol/session-types";
import { teamName } from "@/protocol/teams";
import { trackFlag, trackName } from "@/protocol/tracks";
import type { SessionSummary } from "@/storage/lap-repository";
import { CheckRow } from "@/ui/CheckRow";
import { Chip } from "@/ui/Chip";
import { SessionsTable } from "@/ui/SessionsTable";
import { colors } from "@/ui/theme";

export default function SessionsScreen() {
  const [trackId, setTrackId] = useState<number | undefined>();
  const [teamId, setTeamId] = useState<number | undefined>();
  const [sessionType, setSessionType] = useState<number | undefined>();
  const [all, setAll] = useState<SessionSummary[]>([]);
  const [trackOpen, setTrackOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [hideInvalid, setHideInvalid] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void lapRepository().listSessions({ validOnly: hideInvalid }).then(setAll);
  }, [hideInvalid]);

  async function refresh() {
    setAll(await lapRepository().listSessions({ validOnly: hideInvalid }));
  }

  const sessions = useMemo(
    () =>
      all.filter(
        (session) =>
          (trackId === undefined || session.trackId === trackId) &&
          (teamId === undefined || session.teamId === teamId) &&
          (sessionType === undefined || session.sessionType === sessionType),
      ),
    [all, trackId, teamId, sessionType],
  );
  const tracks = [...new Set(all.map((session) => session.trackId))].sort((a, b) => a - b);
  const teams = [...new Set(all.map((session) => session.teamId))].sort((a, b) => a - b);
  const types = [...new Set(all.map((session) => session.sessionType))].sort((a, b) => a - b);

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <Pressable style={styles.trackSelect} onPress={() => setTrackOpen(true)}>
          <Text style={styles.trackText}>
            {trackId === undefined ? "All tracks" : `${trackFlag(trackId)} ${trackName(trackId)}`.trim()}
          </Text>
        </Pressable>
        <Pressable style={styles.filterBtn} onPress={() => setFilterOpen(true)}>
          <Text style={styles.filterText}>Filter</Text>
        </Pressable>
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
        <SessionsTable sessions={sessions} />
      </ScrollView>

      <Modal visible={trackOpen} animationType="fade" transparent onRequestClose={() => setTrackOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setTrackOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Track</Text>
            <Pressable
              style={styles.option}
              onPress={() => {
                setTrackId(undefined);
                setTrackOpen(false);
              }}
            >
              <Text style={styles.optionText}>All tracks</Text>
            </Pressable>
            {tracks.map((id) => (
              <Pressable
                key={id}
                style={styles.option}
                onPress={() => {
                  setTrackId(id);
                  setTrackOpen(false);
                }}
              >
                <Text style={styles.optionText}>{`${trackFlag(id)} ${trackName(id)}`.trim()}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={filterOpen} animationType="fade" transparent onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFilterOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Filter</Text>
            <Text style={styles.muted}>Track</Text>
            <View style={styles.chips}>
              <Chip label="All" selected={trackId === undefined} onPress={() => setTrackId(undefined)} />
              {tracks.map((id) => (
                <Chip
                  key={id}
                  label={`${trackFlag(id)} ${trackName(id)}`.trim()}
                  selected={trackId === id}
                  onPress={() => setTrackId(id)}
                />
              ))}
            </View>
            <Text style={styles.muted}>Team</Text>
            <View style={styles.chips}>
              <Chip label="All" selected={teamId === undefined} onPress={() => setTeamId(undefined)} />
              {teams.map((id) => (
                <Chip key={id} label={teamName(id)} selected={teamId === id} onPress={() => setTeamId(id)} />
              ))}
            </View>
            <CheckRow
              label="Hide invalid Laps"
              checked={hideInvalid}
              onPress={() => setHideInvalid((value) => !value)}
            />
            <Text style={styles.muted}>Session type</Text>
            <View style={styles.chips}>
              <Chip label="All" selected={sessionType === undefined} onPress={() => setSessionType(undefined)} />
              {types.map((id) => (
                <Chip
                  key={id}
                  label={sessionTypeName(id)}
                  selected={sessionType === id}
                  onPress={() => setSessionType(id)}
                />
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
  table: { paddingHorizontal: 8, paddingBottom: 16 },
  muted: { color: colors.muted, marginTop: 8 },
  backdrop: { flex: 1, backgroundColor: "#0008", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.card, padding: 16, gap: 10, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  option: { paddingVertical: 10 },
  optionText: { color: colors.text, fontSize: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
