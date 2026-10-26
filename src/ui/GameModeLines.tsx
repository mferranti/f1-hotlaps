import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { gameModeName } from "@/protocol/game-modes";
import { sessionTypeName } from "@/protocol/session-types";
import { colors } from "@/ui/theme";

/** Game Mode on top, Session type underneath. */
export function GameModeLines({
  gameMode,
  sessionType,
  style,
}: {
  gameMode: number;
  sessionType: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style}>
      <Text style={styles.cell} numberOfLines={1}>
        {gameModeName(gameMode)}
      </Text>
      <Text style={styles.sub} numberOfLines={1}>
        {sessionTypeName(sessionType)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { color: colors.text, fontSize: 12 },
  sub: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
