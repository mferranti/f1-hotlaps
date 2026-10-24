import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { lapRepository } from "@/capture/runtime";
import { formatGame, formatLapTime } from "@/domain/format";
import { sessionConditionLabel, sessionResultLabel } from "@/domain/session-result";
import { formatTemperature } from "@/domain/units";
import { gameModeName } from "@/protocol/game-modes";
import { isRaceSession, sessionTypeName } from "@/protocol/session-types";
import { teamName } from "@/protocol/teams";
import { trackFlag, trackName } from "@/protocol/tracks";
import type { SessionDetail } from "@/storage/lap-repository";
import { CheckRow } from "@/ui/CheckRow";
import { LapsTable } from "@/ui/LapsTable";
import { colors } from "@/ui/theme";

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [hideInvalid, setHideInvalid] = useState(true);

  useEffect(() => {
    void lapRepository()
      .getSession(Number(id))
      .then(setSession);
  }, [id]);

  if (!session) {
    return (
      <View style={styles.screen}>
        <Text style={styles.muted}>Session not found</Text>
      </View>
    );
  }

  const shown = hideInvalid ? session.laps.filter((lap) => lap.valid) : session.laps;
  const result = sessionResultLabel(session, isRaceSession(session.sessionType));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <Text style={styles.title}>
        {`${trackFlag(session.trackId)} ${trackName(session.trackId)}`.trim()}
      </Text>
      <Text style={styles.sub}>{sessionTypeName(session.sessionType)}</Text>

      <View style={styles.card}>
        <Fact label="Game" value={formatGame(session.game)} />
        <Fact label="Game mode" value={gameModeName(session.gameMode)} />
        <Fact label="Team" value={teamName(session.teamId)} />
        <Fact label="Condition" value={sessionConditionLabel(session.laps)} />
        <Fact label="Started" value={formatWhen(session.startedAt)} />
        <Fact label="Ended" value={formatWhen(session.finishedAt)} />
        <Fact label="Laps" value={String(shown.length)} />
        <Fact label="Fastest" value={session.fastestLapTimeMs === 0 ? "-" : formatLapTime(session.fastestLapTimeMs)} />
        {result ? <Fact label="Result" value={result} /> : null}
        {session.lapCount > 0 ? (
          <>
            <Fact label="Track temp" value={formatTemperature(session.trackTempC, "c")} />
            <Fact label="Air temp" value={formatTemperature(session.airTempC, "c")} />
          </>
        ) : null}
      </View>
      <Text style={styles.section}>Laps</Text>
      <CheckRow
        label="Hide invalid Laps"
        checked={hideInvalid}
        onPress={() => setHideInvalid((value) => !value)}
      />
      <LapsTable laps={shown} peers={session.laps} showLapNumber />
    </ScrollView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, gap: 10, paddingBottom: 32 },
  title: { color: colors.text, fontSize: 22, fontWeight: "700" },
  sub: { color: colors.muted, fontSize: 16, marginTop: -4 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  fact: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  factLabel: { color: colors.muted, fontSize: 13 },
  factValue: { color: colors.text, fontSize: 13, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  section: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 8 },
  muted: { color: colors.muted },
});
