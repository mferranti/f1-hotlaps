import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { sessionResultLabel } from "@/domain/session-result";
import { isRaceSession } from "@/protocol/session-types";
import { teamName } from "@/protocol/teams";
import { trackFlag, trackName } from "@/protocol/tracks";
import type { SessionSummary } from "@/storage/lap-repository";
import { GameModeLines } from "@/ui/GameModeLines";
import { colors } from "@/ui/theme";

export function SessionsTable({ sessions }: { sessions: readonly SessionSummary[] }) {
  return (
    <View>
      <SessionsHeader />
      {sessions.length === 0 ? <SessionsEmpty /> : null}
      {sessions.map((session) => (
        <SessionRow key={session.id} session={session} />
      ))}
    </View>
  );
}

export function SessionsHeader() {
  return (
    <View style={styles.headerRow}>
      <Text style={[styles.head, styles.colTrack]}>Track</Text>
      <Text style={[styles.head, styles.colTeam]}>Team</Text>
      <Text style={[styles.head, styles.colMode]}>Game Mode</Text>
      <Text style={[styles.head, styles.colResult]}>Result</Text>
    </View>
  );
}

export function SessionsEmpty() {
  return <Text style={styles.muted}>No Sessions yet</Text>;
}

export function SessionRow({ session }: { session: SessionSummary }) {
  return (
    <Link href={`/sessions/${session.id}`} asChild>
      <Pressable style={styles.dataRow}>
        <Text style={[styles.cell, styles.colTrack]} numberOfLines={1}>
          {`${trackFlag(session.trackId)} ${trackName(session.trackId)}`.trim()}
        </Text>
        <Text style={[styles.cell, styles.colTeam]} numberOfLines={2}>
          {teamName(session.teamId)}
        </Text>
        <GameModeLines style={styles.colMode} gameMode={session.gameMode} sessionType={session.sessionType} />
        <Text style={[styles.cell, styles.colResult]} numberOfLines={1}>
          {sessionResultLabel(session, isRaceSession(session.sessionType))}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "flex-end",
  },
  dataRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
  },
  head: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  cell: { color: colors.text, fontSize: 12 },
  colTrack: { flex: 1.4, minWidth: 0 },
  colTeam: { flex: 1.1, minWidth: 0 },
  colMode: { flex: 1.1, minWidth: 0 },
  colResult: { width: 72, textAlign: "right" },
  muted: { color: colors.muted, marginTop: 8 },
});
