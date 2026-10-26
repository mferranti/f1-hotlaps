import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatShortDate, formatShortTime } from "@/domain/format";
import { sectorColors } from "@/domain/sector-color";
import type { SpeedUnit, TemperatureUnit } from "@/domain/units";
import { teamName } from "@/protocol/teams";
import type { LapSummary } from "@/storage/lap-repository";
import { GameModeLines } from "@/ui/GameModeLines";
import { SectorBar } from "@/ui/SectorBar";
import { colors } from "@/ui/theme";
import { useSettings } from "@/ui/use-settings";

export function LapsTable({
  laps,
  peers,
  showLapNumber = false,
  showWeather = true,
  showFinishedTime = false,
}: {
  laps: readonly LapSummary[];
  peers?: readonly LapSummary[];
  showLapNumber?: boolean;
  showWeather?: boolean;
  /** Clock time under the date, in the same two-line style as Game Mode. */
  showFinishedTime?: boolean;
}) {
  const colorPeers = (peers ?? laps).filter((peer) => peer.valid);
  const { speedUnit, temperatureUnit } = useSettings();
  const columns = { showLapNumber, showWeather, showFinishedTime };
  return (
    <View>
      <LapsHeader {...columns} />
      {laps.length === 0 ? <LapsEmpty /> : null}
      {laps.map((lap) => (
        <LapRow
          key={lap.id}
          lap={lap}
          colorPeers={colorPeers}
          speedUnit={speedUnit}
          temperatureUnit={temperatureUnit}
          {...columns}
        />
      ))}
    </View>
  );
}

export function LapsHeader({
  showLapNumber = false,
  showWeather = true,
  showFinishedTime = false,
}: {
  showLapNumber?: boolean;
  showWeather?: boolean;
  showFinishedTime?: boolean;
}) {
  return (
    <View style={styles.headerRow}>
      {showLapNumber ? <Text style={[styles.head, styles.colLap]}>#</Text> : null}
      <Text style={[styles.head, styles.colTeam]}>Team</Text>
      <Text style={[styles.head, styles.colTime]}>Time</Text>
      <Text style={[styles.head, styles.colMode]}>Mode</Text>
      {showWeather ? (
        <Text style={[styles.head, styles.colWeather]} numberOfLines={1}>
          🌦️
        </Text>
      ) : null}
      <Text style={[styles.head, showFinishedTime ? styles.colDateTime : styles.colDate]}>Date</Text>
    </View>
  );
}

export function LapsEmpty() {
  return <Text style={styles.muted}>No Laps yet</Text>;
}

export function LapRow({
  lap,
  colorPeers,
  showLapNumber = false,
  showWeather = true,
  showFinishedTime = false,
  speedUnit,
  temperatureUnit,
}: {
  lap: LapSummary;
  colorPeers: readonly LapSummary[];
  showLapNumber?: boolean;
  showWeather?: boolean;
  showFinishedTime?: boolean;
  speedUnit: SpeedUnit;
  temperatureUnit: TemperatureUnit;
}) {
  return (
    <Link href={`/laps/${lap.id}`} asChild>
      <Pressable style={StyleSheet.flatten([styles.dataRow, lap.valid ? null : styles.invalidRow])}>
        {showLapNumber ? <Text style={[styles.cell, styles.colLap]}>{lap.lapNumber}</Text> : null}
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
        <GameModeLines style={styles.colMode} gameMode={lap.gameMode} sessionType={lap.sessionType} />
        {showWeather ? (
          <Text style={[styles.cell, styles.colWeather]}>{lap.condition === "wet" ? "🌧️" : "☀️"}</Text>
        ) : null}
        {showFinishedTime ? (
          <View style={styles.colDateTime}>
            <Text style={[styles.cell, styles.alignEnd]} numberOfLines={1}>
              {formatShortDate(lap.finishedAt, speedUnit, temperatureUnit)}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {formatShortTime(lap.finishedAt)}
            </Text>
          </View>
        ) : (
          <Text style={[styles.cell, styles.colDate]} numberOfLines={1}>
            {formatShortDate(lap.finishedAt, speedUnit, temperatureUnit)}
          </Text>
        )}
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
  invalidRow: { opacity: 0.7 },
  head: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  cell: { color: colors.text, fontSize: 12 },
  sub: { color: colors.muted, fontSize: 11, marginTop: 2, textAlign: "right" },
  alignEnd: { textAlign: "right" },
  colLap: { width: 28 },
  colTeam: { flex: 1.2, minWidth: 0 },
  colTime: { width: 80 },
  colMode: { flex: 1.1, minWidth: 0 },
  colWeather: { width: 24, textAlign: "center" },
  colDate: { width: 52, textAlign: "right" },
  colDateTime: { width: 68, textAlign: "right", alignItems: "flex-end" },
  muted: { color: colors.muted, marginTop: 8 },
});
