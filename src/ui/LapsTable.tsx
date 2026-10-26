import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { sectorColors } from "@/domain/sector-color";
import { gameModeName } from "@/protocol/game-modes";
import { teamName } from "@/protocol/teams";
import type { LapSummary } from "@/storage/lap-repository";
import { SectorBar } from "@/ui/SectorBar";
import { colors } from "@/ui/theme";

export function LapsTable({
  laps,
  peers,
  showLapNumber = false,
}: {
  laps: readonly LapSummary[];
  peers?: readonly LapSummary[];
  showLapNumber?: boolean;
}) {
  const colorPeers = (peers ?? laps).filter((peer) => peer.valid);
  return (
    <View>
      <View style={styles.headerRow}>
        {showLapNumber ? <Text style={[styles.head, styles.colLap]}>#</Text> : null}
        <Text style={[styles.head, styles.colTeam]}>Team</Text>
        <Text style={[styles.head, styles.colTime]}>Time</Text>
        <Text style={[styles.head, styles.colMode]}>Mode</Text>
        <Text style={[styles.head, styles.colWeather]} numberOfLines={1}>
          Weather
        </Text>
        <Text style={[styles.head, styles.colDate]}>Date</Text>
      </View>
      {laps.length === 0 ? <Text style={styles.muted}>No Laps yet</Text> : null}
      {laps.map((lap) => (
        <Link key={lap.id} href={`/laps/${lap.id}`} asChild>
          <Pressable
            style={StyleSheet.flatten([styles.dataRow, lap.valid ? null : styles.invalidRow])}
          >
            {showLapNumber ? (
              <Text style={[styles.cell, styles.colLap]}>{lap.lapNumber}</Text>
            ) : null}
            <Text style={[styles.cell, styles.colTeam]} numberOfLines={2}>
              {teamName(lap.teamId)}
            </Text>
            <View style={styles.colTime}>
              <SectorBar
                lapTimeMs={lap.lapTimeMs}
                sector1Ms={lap.sector1Ms}
                sector2Ms={lap.sector2Ms}
                sector3Ms={lap.sector3Ms}
                colors={sectorColors(
                  lap,
                  colorPeers.filter((peer) => peer.condition === lap.condition),
                )}
                showTimes={false}
              />
            </View>
            <Text style={[styles.cell, styles.colMode]} numberOfLines={2}>
              {gameModeName(lap.gameMode)}
            </Text>
            <Text style={[styles.cell, styles.colWeather]}>{lap.condition === "wet" ? "🌧️" : "☀️"}</Text>
            <Text style={[styles.cell, styles.colDate]} numberOfLines={1}>
              {new Date(lap.finishedAt).toLocaleDateString(undefined, {
                month: "numeric",
                day: "numeric",
                year: "2-digit",
              })}
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
  invalidRow: { opacity: 0.7 },
  head: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  cell: { color: colors.text, fontSize: 12 },
  colLap: { width: 28 },
  colTeam: { flex: 1.2, minWidth: 0 },
  colTime: { width: 80 },
  colMode: { flex: 1.1, minWidth: 0 },
  colWeather: { width: 56, textAlign: "center" },
  colDate: { width: 52, textAlign: "right" },
  muted: { color: colors.muted, marginTop: 8 },
});
