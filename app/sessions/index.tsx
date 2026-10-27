import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { lapRepository } from "@/capture/runtime";
import { sessionTypeName } from "@/protocol/session-types";
import { teamName } from "@/protocol/teams";
import { trackFlag, trackName } from "@/protocol/tracks";
import type { SessionFacets, SessionPageQuery } from "@/storage/lap-repository";
import { CheckRow } from "@/ui/CheckRow";
import { Chip } from "@/ui/Chip";
import { PagedList } from "@/ui/PagedList";
import { SessionRow, SessionsEmpty, SessionsHeader } from "@/ui/SessionsTable";
import { colors } from "@/ui/theme";
import { usePage } from "@/ui/use-page";

export default function SessionsScreen() {
  const [trackId, setTrackId] = useState<number | undefined>();
  const [teamId, setTeamId] = useState<number | undefined>();
  const [sessionType, setSessionType] = useState<number | undefined>();
  const [facets, setFacets] = useState<SessionFacets>({ trackIds: [], teamIds: [], sessionTypes: [] });
  const [trackOpen, setTrackOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [hideInvalid, setHideInvalid] = useState(true);

  const query = useMemo(
    () => ({ validOnly: hideInvalid, trackId, teamId, sessionType }),
    [hideInvalid, trackId, teamId, sessionType],
  );
  const loadSessions = useCallback(
    (pageQuery: SessionPageQuery) => lapRepository().listSessionPage(pageQuery),
    [],
  );
  const page = usePage(loadSessions, query);

  const reloadFacets = useCallback(() => {
    void lapRepository().listSessionFacets({ validOnly: hideInvalid }).then(setFacets);
  }, [hideInvalid]);

  useEffect(() => {
    void lapRepository().listSessionFacets({ validOnly: hideInvalid }).then(setFacets);
  }, [hideInvalid]);

  const tracks = facets.trackIds;
  const teams = facets.teamIds;
  const types = facets.sessionTypes;

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

      <PagedList
        items={page.items}
        keyExtractor={(session) => String(session.id)}
        hasMore={page.hasMore}
        loadingMore={page.loadingMore}
        onLoadMore={page.loadMore}
        refreshing={page.refreshing}
        onRefresh={() => {
          void page.refresh();
          reloadFacets();
        }}
        contentContainerStyle={styles.table}
        listHeader={<SessionsHeader showFastest />}
        listEmpty={page.loaded ? <SessionsEmpty /> : null}
        renderItem={(session) => <SessionRow session={session} showFastest />}
      />

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
