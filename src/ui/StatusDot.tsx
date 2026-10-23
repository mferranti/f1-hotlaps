import { View } from "react-native";

import type { LinkStatus } from "@/activity/packet-activity";
import { colors } from "@/ui/theme";

const fill: Record<LinkStatus, string> = {
  receiving: colors.receiving,
  waiting: colors.waiting,
  unsupported: colors.unsupported,
};

export function StatusDot({ status }: { status: LinkStatus }) {
  return (
    <View
      accessibilityLabel={status}
      style={{
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: fill[status],
      }}
    />
  );
}
