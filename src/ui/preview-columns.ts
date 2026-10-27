import { StyleSheet } from "react-native";

/** Latest laps and Latest Sessions: three equal columns, then a trailing column. */
export const previewColumns = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  end: { width: 52, textAlign: "right", alignItems: "flex-end" },
});
