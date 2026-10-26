import { Pressable, StyleSheet, View } from "react-native";

import type { TyreKind } from "@/protocol/tyres";
import { TyreIcon, tyreIconLabel } from "@/ui/TyreIcon";
import { TYRE_KINDS } from "@/ui/tyre-filter";

/** Painted tyre types as checkbox buttons. Checked types stay in the Lap list. */
export function TyreFilter({
  selected,
  onToggle,
}: {
  selected: ReadonlySet<TyreKind>;
  onToggle: (kind: TyreKind) => void;
}) {
  return (
    <View style={styles.row}>
      {TYRE_KINDS.map((kind) => {
        const checked = selected.has(kind);
        return (
          <Pressable
            key={kind}
            onPress={() => onToggle(kind)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={tyreIconLabel(kind)}
            style={[styles.button, checked ? null : styles.off]}
          >
            <TyreIcon kind={kind} size={32} accessible={false} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: { borderRadius: 10, padding: 4 },
  off: { opacity: 0.35 },
});
