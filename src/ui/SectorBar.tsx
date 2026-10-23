import { StyleSheet, Text, View } from "react-native";

import { formatLapTime, formatSectorTime } from "@/domain/format";
import type { SectorColor } from "@/domain/sector-color";
import { colors } from "@/ui/theme";

export function SectorBar({
  lapTimeMs,
  sector1Ms,
  sector2Ms,
  sector3Ms,
  colors: sectorColors,
  large = false,
  showTimes = true,
}: {
  lapTimeMs: number;
  sector1Ms: number;
  sector2Ms: number;
  sector3Ms: number;
  colors: { sector1: SectorColor; sector2: SectorColor; sector3: SectorColor };
  large?: boolean;
  showTimes?: boolean;
}) {
  const times = [sector1Ms, sector2Ms, sector3Ms];
  const inks = [sectorColors.sector1, sectorColors.sector2, sectorColors.sector3].map(sectorInk);
  const compact = !showTimes && !large;
  return (
    <View style={[styles.wrap, large && styles.wrapLarge, compact && styles.wrapFit]}>
      <Text style={[styles.time, large && styles.timeLarge]}>{formatLapTime(lapTimeMs)}</Text>
      <View style={[styles.row, compact && styles.rowCompact]}>
        {inks.map((color, index) => (
          <View key={index} style={{ flex: 1, gap: compact ? 0 : 2 }}>
            <View style={[styles.line, compact && styles.lineCompact, { backgroundColor: color }]} />
            {showTimes ? (
              <Text style={[styles.sector, large && styles.sectorLarge, { color }]}>
                {formatSectorTime(times[index]!)}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export function sectorInk(color: SectorColor): string {
  if (color === "purple") return colors.purple;
  if (color === "green") return colors.green;
  return colors.yellow;
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  wrapLarge: { gap: 8 },
  wrapFit: { alignSelf: "flex-start" },
  time: { color: colors.text, fontSize: 13, fontVariant: ["tabular-nums"], fontWeight: "600" },
  timeLarge: { fontSize: 28 },
  row: { flexDirection: "row", gap: 6 },
  rowCompact: { gap: 2 },
  line: { height: 3, borderRadius: 2 },
  lineCompact: { height: 2, borderRadius: 1 },
  sector: { color: colors.muted, fontSize: 12, fontVariant: ["tabular-nums"] },
  sectorLarge: { fontSize: 16 },
});
