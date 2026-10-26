import { type ReactElement } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { colors } from "@/ui/theme";

/** A list that asks for the next page when its end is on screen and another page exists. */
export function PagedList<T>({
  items,
  keyExtractor,
  renderItem,
  hasMore,
  loadingMore,
  onLoadMore,
  refreshing,
  onRefresh,
  contentContainerStyle,
  listHeader,
  listEmpty,
  extraData,
}: {
  items: readonly T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactElement;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  refreshing: boolean;
  onRefresh: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  listHeader?: ReactElement | null;
  listEmpty?: ReactElement | null;
  extraData?: unknown;
}) {
  return (
    <FlatList
      style={styles.list}
      data={items as T[]}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => renderItem(item)}
      extraData={extraData}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.accent} style={styles.footer} /> : null}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
      }
      contentContainerStyle={contentContainerStyle}
      onEndReached={() => {
        if (hasMore && !loadingMore) onLoadMore();
      }}
      onEndReachedThreshold={0.4}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  footer: { marginVertical: 16 },
});
