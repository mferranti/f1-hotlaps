import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatShortDate, formatShortTime } from "@/domain/format";
import { sectorColors } from "@/domain/sector-color";
import type { SpeedUnit, TemperatureUnit } from "@/domain/units";
import { teamName } from "@/protocol/teams";
import { trackLabel } from "@/protocol/tracks";
import { tyreKind } from "@/protocol/tyres";
import type { LapSummary } from "@/storage/lap-repository";
import { GameModeLines } from "@/ui/GameModeLines";
import { SectorBar } from "@/ui/SectorBar";
import { previewColumns } from "@/ui/preview-columns";
import { colors } from "@/ui/theme";
import { TyreIcon } from "@/ui/TyreIcon";
import { useSettings } from "@/ui/use-settings";

export function LapsTable({
  laps,
  peers,
  showLapNumber = false,
  showTrack = false,
  showTyre = false,
  showMode = true,
  showWeather = true,
  showFinishedTime = false,
  preview = false,
}: {
  laps: readonly LapSummary[];
  peers?: readonly LapSummary[];
  showLapNumber?: boolean;
  /** Track name. The Laps screen already filters by track, so it leaves this off. */
  showTrack?: boolean;
  /** Painted tyre, between Time and Mode. */
  showTyre?: boolean;
  showMode?: boolean;
  showWeather?: boolean;
  /** Clock time under the date, in the same two-line style as Game Mode. */
  showFinishedTime?: boolean;
  /** Match the four columns of Latest Sessions. */
  preview?: boolean;
}) {
  const colorPeers = (peers ?? laps).filter((peer) => peer.valid);
  const { speedUnit, temperatureUnit } = useSettings();
  const columns = { showLapNumber, showTrack, showTyre, showMode, showWeather, showFinishedTime, preview };
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
  showTrack = false,
  showTyre = false,
  showMode = true,
  showWeather = true,
  showFinishedTime = false,
  preview = false,
}: {
  showLapNumber?: boolean;
  showTrack?: boolean;
  showTyre?: boolean;
  showMode?: boolean;
  showWeather?: boolean;
  showFinishedTime?: boolean;
  preview?: boolean;
}) {
  const track = preview ? previewColumns.grow : styles.colTrack;
  const team = preview ? previewColumns.grow : styles.colTeam;
  const time = preview ? previewColumns.grow : styles.colTime;
  const date = preview ? previewColumns.end : showFinishedTime ? styles.colDateTime : styles.colDate;
  return (
    <View style={styles.headerRow}>
      {showLapNumber ? <Text style={[styles.head, styles.colLap]}>#</Text> : null}
      {showTrack ? <Text style={[styles.head, track]}>Track</Text> : null}
      <Text style={[styles.head, team]}>Team</Text>
      <Text style={[styles.head, time]}>Time</Text>
      {showTyre ? <Text style={[styles.head, styles.colTyre]}>Tyre</Text> : null}
      {showMode ? <Text style={[styles.head, styles.colMode]}>Mode</Text> : null}
      {showWeather ? (
        <Text style={[styles.head, styles.colWeather]} numberOfLines={1}>
          🌦️
        </Text>
      ) : null}
      <Text style={[styles.head, date]}>Date</Text>
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
  showTrack = false,
  showTyre = false,
  showMode = true,
  showWeather = true,
  showFinishedTime = false,
  preview = false,
  speedUnit,
  temperatureUnit,
}: {
  lap: LapSummary;
  colorPeers: readonly LapSummary[];
  showLapNumber?: boolean;
  showTrack?: boolean;
  showTyre?: boolean;
  showMode?: boolean;
  showWeather?: boolean;
  showFinishedTime?: boolean;
  preview?: boolean;
  speedUnit: SpeedUnit;
  temperatureUnit: TemperatureUnit;
}) {
  const kind = tyreKind(lap.visualTyreCompound, lap.tyreCompound);
  return (
    <Link href={`/laps/${lap.id}`} asChild>
      <Pressable style={StyleSheet.flatten([styles.dataRow, lap.valid ? null : styles.invalidRow])}>
        {showLapNumber ? <Text style={[styles.cell, styles.colLap]}>{lap.lapNumber}</Text> : null}
        {showTrack ? (
          <Text style={[styles.cell, preview ? previewColumns.grow : styles.colTrack]} numberOfLines={1}>
            {trackLabel(lap.trackId)}
          </Text>
        ) : null}
        <Text style={[styles.cell, preview ? previewColumns.grow : styles.colTeam]} numberOfLines={2}>
          {teamName(lap.teamId)}
        </Text>
        <View style={preview ? previewColumns.grow : styles.colTime}>
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
        {showTyre ? (
          kind ? (
            <View style={styles.colTyre}>
              <TyreIcon kind={kind} size={22} />
            </View>
          ) : (
            <Text style={[styles.cell, styles.colTyre]}>-</Text>
          )
        ) : null}
        {showMode ? (
          <GameModeLines style={styles.colMode} gameMode={lap.gameMode} sessionType={lap.sessionType} />
        ) : null}
        {showWeather ? (
          <Text style={[styles.cell, styles.colWeather]}>{lap.condition === "wet" ? "🌧️" : "☀️"}</Text>
        ) : null}
        {showFinishedTime ? (
          <View style={preview ? previewColumns.end : styles.colDateTime}>
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
  colTrack: { flex: 1.15, minWidth: 0 },
  colTeam: { width: 90 },
  colTime: { width: 60 },
  colTyre: { width: 26, textAlign: "center", alignItems: "center" },
  colMode: { flex: 1.1, minWidth: 0 },
  colWeather: { width: 18, textAlign: "center" },
  colDate: { width: 52, textAlign: "right" },
  colDateTime: { width: 52, textAlign: "right", alignItems: "flex-end" },
  muted: { color: colors.muted, marginTop: 8 },
});
