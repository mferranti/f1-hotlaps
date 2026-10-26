import { useLocalSearchParams, useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Storage from "expo-sqlite/kv-store";
import { useEffect, useLayoutEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { lapRepository } from "@/capture/runtime";
import type { TraceSample } from "@/domain/types";
import type { SpeedUnit } from "@/domain/units";
import type { LapDetail, StoredTrace } from "@/storage/lap-repository";
import { SettingsRepository } from "@/storage/settings-repository";
import { HeaderBackButton } from "@/ui/header";
import { LandscapeFill } from "@/ui/LandscapeFill";
import { LineChart } from "@/ui/LineChart";
import { colors } from "@/ui/theme";
import {
  parseTraceGraphId,
  traceGraphSeries,
  traceGraphTitle,
  traceGraphYLabel,
  traceSectorMarkers,
} from "@/ui/trace-graphs";

export default function LapGraphScreen() {
  const { id, metric, compare: compareParam } = useLocalSearchParams<{
    id: string;
    metric?: string;
    compare?: string;
  }>();
  const graphId = parseTraceGraphId(metric);
  const compare = compareParam === "1";
  const navigation = useNavigation();
  const [lap, setLap] = useState<LapDetail | null>(null);
  const [fastest, setFastest] = useState<StoredTrace | null>(null);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>("kph");
  const [chartH, setChartH] = useState(0);

  useEffect(() => {
    void new SettingsRepository(Storage).get().then((settings) => setSpeedUnit(settings.speedUnit));
  }, []);

  useEffect(() => {
    void (async () => {
      const detail = await lapRepository().getLap(Number(id));
      setLap(detail);
      if (!detail) return;
      setFastest(await lapRepository().getFastestTrace(detail.game, detail.trackId, detail.condition));
    })();
  }, [id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      orientation: "landscape",
      presentation: "fullScreenModal",
    });
  }, [navigation]);

  if (!graphId || !lap?.trace) {
    return (
      <LandscapeFill>
        <StatusBar hidden />
        <Text style={styles.muted}>Graph not found</Text>
      </LandscapeFill>
    );
  }

  const overlay: readonly TraceSample[] | null =
    graphId === "delta" ? (fastest?.samples ?? null) : compare && fastest ? fastest.samples : null;

  return (
    <LandscapeFill>
      <StatusBar hidden />
      <View style={styles.top}>
        <HeaderBackButton />
        <Text style={styles.title}>{traceGraphTitle(graphId)}</Text>
      </View>
      <View style={styles.chart} onLayout={(event) => setChartH(event.nativeEvent.layout.height)}>
        <LineChart
          xLabel="Distance (m)"
          yLabel={traceGraphYLabel(graphId, speedUnit)}
          series={traceGraphSeries(graphId, lap.trace, overlay, speedUnit)}
          markers={traceSectorMarkers(lap.trace, lap.sector1Ms, lap.sector2Ms)}
          centerZero={graphId === "delta"}
          height={chartH > 0 ? chartH : undefined}
        />
      </View>
    </LandscapeFill>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.muted },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { color: colors.text, fontSize: 16, fontWeight: "600" },
  chart: { flex: 1, minHeight: 160 },
});
