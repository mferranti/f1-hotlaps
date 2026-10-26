import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import type { Condition } from "@/domain/types";
import { gameModeName } from "@/protocol/game-modes";
import type { TyreKind } from "@/protocol/tyres";
import { teamName } from "@/protocol/teams";
import { trackLabel } from "@/protocol/tracks";
import { lapRepository } from "@/capture/runtime";
import type { LapFacets, LapPageQuery, LapSort, LapSummary } from "@/storage/lap-repository";
import { CheckRow } from "@/ui/CheckRow";
import { Chip } from "@/ui/Chip";
import { LapRow, LapsEmpty, LapsHeader } from "@/ui/LapsTable";
import { PagedList } from "@/ui/PagedList";
import { TyreFilter } from "@/ui/TyreFilter";
import { TYRE_KINDS } from "@/ui/tyre-filter";
import { colors } from "@/ui/theme";
import { usePage } from "@/ui/use-page";
import { useSettings } from "@/ui/use-settings";

export default function LapsHistoryScreen() {
  const [trackId, setTrackId] = useState<number | undefined>();
  const [condition, setCondition] = useState<Condition | undefined>();
  const [gameMode, setGameMode] = useState<number | undefined>();
  const [teamId, setTeamId] = useState<number | undefined>();
  const [tracks, setTracks] = useState<number[]>([]);
  const [peers, setPeers] = useState<LapSummary[]>([]);
  const [facets, setFacets] = useState<LapFacets>({ gameModes: [], teamIds: [] });
  const [trackOpen, setTrackOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<LapSort>("newest");
  const [hideInvalid, setHideInvalid] = useState(true);
  const [tyres, setTyres] = useState<ReadonlySet<TyreKind>>(() => new Set(TYRE_KINDS));
  const { speedUnit, temperatureUnit } = useSettings();

  const selectedTrackId = trackId ?? tracks[0];
  const query = useMemo(() => {
    if (selectedTrackId === undefined) return null;
    return {
      trackId: selectedTrackId,
      sort,
      condition,
      gameMode,
      teamId,
      validOnly: hideInvalid,
      tyreKinds: TYRE_KINDS.filter((kind) => tyres.has(kind)),
    };
  }, [selectedTrackId, sort, condition, gameMode, teamId, hideInvalid, tyres]);
  const loadLaps = useCallback((pageQuery: LapPageQuery) => lapRepository().listLapPage(pageQuery), []);
  const page = usePage(loadLaps, query);
  const colorPeers = useMemo(() => peers.filter((peer) => peer.valid), [peers]);

  const reloadTrack = useCallback(() => {
    void lapRepository()
      .listTracks()
      .then((nextTracks) => {
        setTracks(nextTracks);
        const track = trackId ?? nextTracks[0];
        if (track === undefined) {
          setPeers([]);
          setFacets({ gameModes: [], teamIds: [] });
          return;
        }
        void Promise.all([
          lapRepository().listLaps({ trackId: track, sort: "newest" }),
          lapRepository().listLapFacets(track),
        ]).then(([nextPeers, nextFacets]) => {
          setPeers(nextPeers);
          setFacets(nextFacets);
        });
      });
  }, [trackId]);

  useEffect(() => {
    reloadTrack();
  }, [reloadTrack]);

  function toggleTyre(kind: TyreKind) {
    setTyres((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  const modes = facets.gameModes;
  const teams = facets.teamIds;

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

      <PagedList
        items={page.items}
        keyExtractor={(lap) => String(lap.id)}
        hasMore={page.hasMore}
        loadingMore={page.loadingMore}
        onLoadMore={page.loadMore}
        refreshing={page.refreshing}
        onRefresh={() => {
          void page.refresh();
          void reloadTrack();
        }}
        contentContainerStyle={styles.table}
        listHeader={<LapsHeader showFinishedTime />}
        listEmpty={page.loaded ? <LapsEmpty /> : null}
        extraData={colorPeers}
        renderItem={(lap) => (
          <LapRow
            lap={lap}
            colorPeers={colorPeers}
            showFinishedTime
            speedUnit={speedUnit}
            temperatureUnit={temperatureUnit}
          />
        )}
      />

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
            <Text style={styles.muted}>Tyre</Text>
            <TyreFilter selected={tyres} onToggle={toggleTyre} />
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
