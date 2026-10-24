import { Link, useLocalSearchParams } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { lapRepository } from "@/capture/runtime";
import { deltaByDistance } from "@/domain/delta";
import { compareToFastest } from "@/domain/fastest-compare";
import { formatDelta } from "@/domain/format";
import { sectorColors } from "@/domain/sector-color";
import { formatTemperature, type SpeedUnit } from "@/domain/units";
import { gameModeName } from "@/protocol/game-modes";
import { teamName } from "@/protocol/teams";
import { trackLabel } from "@/protocol/tracks";
import type { LapDetail, LapSummary, StoredTrace } from "@/storage/lap-repository";
import { SettingsRepository } from "@/storage/settings-repository";
import { ExpandGraphIcon } from "@/ui/header";
import { LineChart } from "@/ui/LineChart";
import { SectorBar, sectorInk } from "@/ui/SectorBar";
import { colors } from "@/ui/theme";
import {
  TRACE_GRAPH_IDS,
  traceGraphSeries,
  traceGraphTitle,
  traceGraphYLabel,
  type TraceGraphId,
} from "@/ui/trace-graphs";

export default function LapDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lap, setLap] = useState<LapDetail | null>(null);
  const [peers, setPeers] = useState<LapSummary[]>([]);
  const [fastest, setFastest] = useState<StoredTrace | null>(null);
  const [compare, setCompare] = useState(false);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>("kph");

  useEffect(() => {
    void new SettingsRepository(Storage).get().then((settings) => setSpeedUnit(settings.speedUnit));
  }, []);

  useEffect(() => {
    void (async () => {
      const detail = await lapRepository().getLap(Number(id));
      setLap(detail);
      if (!detail) return;
      const onTrack = await lapRepository().listLaps({
        trackId: detail.trackId,
        condition: detail.condition,
        sort: "newest",
      });
      setPeers(onTrack);
      setFastest(await lapRepository().getFastestTrace(detail.game, detail.trackId, detail.condition));
    })();
  }, [id]);

  if (!lap) {
    return (
      <View style={styles.screen}>
        <Text style={styles.muted}>Lap not found</Text>
      </View>
    );
  }

  const trace = lap.trace;
  const delta = trace && fastest ? deltaByDistance(trace, fastest.samples) : [];
  const overlay = compare && fastest ? fastest.samples : null;
  const validPeers = peers.filter((peer) => peer.valid);
  const fastestLap = validPeers.find((peer) => peer.role === "fastest") ?? lap;
  const vsFastest = compareToFastest(lap, fastestLap);
  const thisSectors = sectorColors(lap, validPeers);
  const fastestSectors = sectorColors(fastestLap, validPeers);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Text style={styles.kicker}>{trackLabel(lap.trackId)}</Text>
      <SectorBar
        lapTimeMs={lap.lapTimeMs}
        sector1Ms={lap.sector1Ms}
        sector2Ms={lap.sector2Ms}
        sector3Ms={lap.sector3Ms}
        colors={sectorColors(lap, validPeers)}
        large
      />
      <Text style={styles.muted}>
        {teamName(lap.teamId)} · {gameModeName(lap.gameMode)} · {lap.condition === "wet" ? "Wet" : "Dry"} ·{" "}
        {lap.game === "f1-26" ? "F1 26" : "F1 25"}
        {lap.valid ? "" : " · Invalid"}
      </Text>
      <Text style={styles.muted}>
        Track {formatTemperature(lap.trackTempC, "c")} · air {formatTemperature(lap.airTempC, "c")}
      </Text>
      <Link href={`/laps/${lap.id}/setup`} asChild>
        <Pressable style={styles.setupBtn}>
          <Text style={styles.setupText}>Setup</Text>
        </Pressable>
      </Link>
      <Text style={styles.title}>vs Fastest</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <Text style={[styles.tableHead, styles.colLabel]} />
          <Text style={[styles.tableHead, styles.colNum]}>Lap</Text>
          <Text style={[styles.tableHead, styles.colNum]}>S1</Text>
          <Text style={[styles.tableHead, styles.colNum]}>S2</Text>
          <Text style={[styles.tableHead, styles.colNum]}>S3</Text>
        </View>
        {vsFastest.map((row) => {
          const tints = row.label === "This" ? thisSectors : row.label === "Fastest" ? fastestSectors : null;
          return (
            <View key={row.label} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colLabel]}>{row.label}</Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.colNum,
                  {
                    color: tints
                      ? sectorInk(row.label === "Fastest" || lap.lapTimeMs === fastestLap.lapTimeMs ? "purple" : "yellow")
                      : deltaInk(row.lap),
                  },
                ]}
              >
                {row.lap}
              </Text>
              <Text style={[styles.tableCell, styles.colNum, { color: tints ? sectorInk(tints.sector1) : deltaInk(row.s1) }]}>
                {row.s1}
              </Text>
              <Text style={[styles.tableCell, styles.colNum, { color: tints ? sectorInk(tints.sector2) : deltaInk(row.s2) }]}>
                {row.s2}
              </Text>
              <Text style={[styles.tableCell, styles.colNum, { color: tints ? sectorInk(tints.sector3) : deltaInk(row.s3) }]}>
                {row.s3}
              </Text>
            </View>
          );
        })}
      </View>
      {trace ? (
        <>
          <View style={styles.compareRow}>
            <Text style={styles.title}>Compare with Fastest</Text>
            <Switch
              value={compare}
              onValueChange={setCompare}
              trackColor={{ true: colors.accent }}
              accessibilityLabel="Compare with Fastest"
            />
          </View>
          {TRACE_GRAPH_IDS.filter((graphId) => graphId !== "delta").map((graphId) => (
            <TraceGraphPreview
              key={graphId}
              id={lap.id}
              graphId={graphId}
              compare={compare}
              series={traceGraphSeries(graphId, trace, overlay, speedUnit)}
              yLabel={traceGraphYLabel(graphId, speedUnit)}
            />
          ))}
          {delta.length > 0 ? (
            <TraceGraphPreview
              id={lap.id}
              graphId="delta"
              compare={compare}
              title={`Delta vs Fastest (${formatDelta(delta.at(-1)!.deltaMs)})`}
              series={traceGraphSeries("delta", trace, fastest?.samples ?? null, speedUnit)}
              yLabel={traceGraphYLabel("delta", speedUnit)}
            />
          ) : null}
        </>
      ) : (
        <Text style={styles.muted}>
          No Trace — Config can keep a Trace on every Lap, otherwise only Fastest and Latest keep one.
        </Text>
      )}
    </ScrollView>
  );
}

function TraceGraphPreview({
  id,
  graphId,
  compare,
  series,
  yLabel,
  title,
}: {
  id: number;
  graphId: TraceGraphId;
  compare: boolean;
  series: ReturnType<typeof traceGraphSeries>;
  yLabel: string;
  title?: string;
}) {
  const name = title ?? traceGraphTitle(graphId);
  return (
    <>
      <View style={styles.graphHead}>
        <Text style={[styles.title, styles.graphTitle]}>{name}</Text>
        <Link href={`/laps/${id}/graph?metric=${graphId}&compare=${compare ? 1 : 0}`} asChild>
          <Pressable accessibilityRole="button" accessibilityLabel={`Expand ${traceGraphTitle(graphId)}`} hitSlop={8}>
            <ExpandGraphIcon />
          </Pressable>
        </Link>
      </View>
      <LineChart xLabel="Distance (m)" yLabel={yLabel} series={series} />
    </>
  );
}

function deltaInk(value: string): string {
  if (value.startsWith("-")) return colors.green;
  if (value === "+0.000") return colors.muted;
  return colors.yellow;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  kicker: { color: colors.muted, fontSize: 14 },
  title: { color: colors.text, fontSize: 16, fontWeight: "600" },
  graphHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  graphTitle: { flex: 1 },
  muted: { color: colors.muted },
  setupBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  setupText: { color: colors.text, fontWeight: "600" },
  compareRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: "hidden" },
  tableRow: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  tableHead: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  tableCell: { color: colors.text, fontSize: 12, fontVariant: ["tabular-nums"] },
  colLabel: { width: 58 },
  colNum: { flex: 1, textAlign: "right" },
});
