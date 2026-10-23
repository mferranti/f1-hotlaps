import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { sessionResultLabel } from "@/domain/session-result";
import { gameModeName } from "@/protocol/game-modes";
import { isRaceSession, sessionTypeName } from "@/protocol/session-types";
import { teamName } from "@/protocol/teams";
import { trackFlag, trackName } from "@/protocol/tracks";
import type { SessionSummary } from "@/storage/lap-repository";
import { colors } from "@/ui/theme";

export function SessionsTable({ sessions }: { sessions: readonly SessionSummary[] }) {
  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={[styles.head, styles.colTrack]}>Track</Text>
        <Text style={[styles.head, styles.colTeam]}>Team</Text>
        <Text style={[styles.head, styles.colMode]}>Game Mode</Text>
        <Text style={[styles.head, styles.colResult]}>Result</Text>
      </View>
      {sessions.length === 0 ? <Text style={styles.muted}>No Sessions yet</Text> : null}
      {sessions.map((session) => (
        <Link key={session.id} href={`/sessions/${session.id}`} asChild>
          <Pressable style={styles.dataRow}>
            <View style={styles.colTrack}>
              <Text style={styles.cell} numberOfLines={1}>
                {`${trackFlag(session.trackId)} ${trackName(session.trackId)}`.trim()}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {sessionTypeName(session.sessionType)}
              </Text>
            </View>
            <Text style={[styles.cell, styles.colTeam]} numberOfLines={2}>
              {teamName(session.teamId)}
            </Text>
            <Text style={[styles.cell, styles.colMode]} numberOfLines={2}>
              {gameModeName(session.gameMode)}
            </Text>
            <Text style={[styles.cell, styles.colResult]} numberOfLines={1}>
              {sessionResultLabel(session, isRaceSession(session.sessionType))}
            </Text>
          </Pressable>
        </Link>
      ))}
    </View>
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
  sub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  colTrack: { flex: 1.4, minWidth: 0 },
  colTeam: { flex: 1.1, minWidth: 0 },
  colMode: { flex: 1.1, minWidth: 0 },
  colResult: { width: 72, textAlign: "right" },
  muted: { color: colors.muted, marginTop: 8 },
});
