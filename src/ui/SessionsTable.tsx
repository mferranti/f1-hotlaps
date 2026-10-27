import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatLapTime } from "@/domain/format";
import { sessionResultLabel } from "@/domain/session-result";
import { isRaceSession } from "@/protocol/session-types";
import { teamName } from "@/protocol/teams";
import { trackFlag, trackName } from "@/protocol/tracks";
import type { SessionSummary } from "@/storage/lap-repository";
import { GameModeLines } from "@/ui/GameModeLines";
import { previewColumns } from "@/ui/preview-columns";
import { colors } from "@/ui/theme";

export function SessionsTable({
  sessions,
  showFastest = false,
  preview = false,
}: {
  sessions: readonly SessionSummary[];
  /** Fastest Lap time, before Result. */
  showFastest?: boolean;
  /** Match the four columns of Latest laps. */
  preview?: boolean;
}) {
  return (
    <View>
      <SessionsHeader showFastest={showFastest} preview={preview} />
      {sessions.length === 0 ? <SessionsEmpty /> : null}
      {sessions.map((session) => (
        <SessionRow key={session.id} session={session} showFastest={showFastest} preview={preview} />
      ))}
    </View>
  );
}

export function SessionsHeader({
  showFastest = false,
  preview = false,
}: {
  showFastest?: boolean;
  preview?: boolean;
}) {
  const track = preview ? previewColumns.grow : styles.colTrack;
  const team = preview ? previewColumns.grow : styles.colTeam;
  const mode = preview ? previewColumns.grow : styles.colMode;
  const result = preview ? previewColumns.end : styles.colResult;
  return (
    <View style={styles.headerRow}>
      <Text style={[styles.head, track]}>Track</Text>
      <Text style={[styles.head, team]}>Team</Text>
      <Text style={[styles.head, mode]}>Game Mode</Text>
      {showFastest ? <Text style={[styles.head, styles.colFastest]}>Fastest</Text> : null}
      <Text style={[styles.head, result]}>Result</Text>
    </View>
  );
}

export function SessionsEmpty() {
  return <Text style={styles.muted}>No Sessions yet</Text>;
}

export function SessionRow({
  session,
  showFastest = false,
  preview = false,
}: {
  session: SessionSummary;
  showFastest?: boolean;
  preview?: boolean;
}) {
  return (
    <Link href={`/sessions/${session.id}`} asChild>
      <Pressable style={styles.dataRow}>
        <Text style={[styles.cell, preview ? previewColumns.grow : styles.colTrack]} numberOfLines={1}>
          {`${trackFlag(session.trackId)} ${trackName(session.trackId)}`.trim()}
        </Text>
        <Text style={[styles.cell, preview ? previewColumns.grow : styles.colTeam]} numberOfLines={2}>
          {teamName(session.teamId)}
        </Text>
        <GameModeLines
          style={preview ? previewColumns.grow : styles.colMode}
          gameMode={session.gameMode}
          sessionType={session.sessionType}
        />
        {showFastest ? (
          <Text style={[styles.cell, styles.colFastest]} numberOfLines={1}>
            {session.fastestLapTimeMs === 0 ? "-" : formatLapTime(session.fastestLapTimeMs)}
          </Text>
        ) : null}
        <Text style={[styles.cell, preview ? previewColumns.end : styles.colResult]} numberOfLines={1}>
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
  colFastest: { width: 68, textAlign: "right", fontVariant: ["tabular-nums"] },
  colResult: { width: 72, textAlign: "right" },
  muted: { color: colors.muted, marginTop: 8 },
});
