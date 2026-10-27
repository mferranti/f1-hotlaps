import { Link, useFocusEffect } from "expo-router";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as Network from "expo-network";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { usePacketActivity } from "@/activity/use-packet-activity";
import { lapRepository, subscribeLaps } from "@/capture/runtime";
import { formatLapTime } from "@/domain/format";
import { formatSpeed } from "@/domain/units";
import { useLiveCar } from "@/live/use-live-car";
import { sessionTypeName } from "@/protocol/session-types";
import { teamName } from "@/protocol/teams";
import { trackName } from "@/protocol/tracks";
import { pipNativeAvailable } from "@/pip/native";
import type { LapSummary, SessionSummary } from "@/storage/lap-repository";
import { LapsTable } from "@/ui/LapsTable";
import { PacketGraph } from "@/ui/PacketGraph";
import { SessionsTable } from "@/ui/SessionsTable";
import { StatusDot } from "@/ui/StatusDot";
import { colors } from "@/ui/theme";
import { useSettings } from "@/ui/use-settings";

const RECENT = 3;

export default function MainScreen() {
  const activity = usePacketActivity();
  const car = useLiveCar();
  const [lan, setLan] = useState<string | null>(null);
  const [laps, setLaps] = useState<LapSummary[]>([]);
  const [recentLaps, setRecentLaps] = useState<LapSummary[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([]);
  const { speedUnit } = useSettings();

  const loadRecent = useCallback(async () => {
    try {
      const [allLaps, sessions] = await Promise.all([
        lapRepository().listLaps({ sort: "newest" }),
        lapRepository().listSessions({ validOnly: true }),
      ]);
      const visible = allLaps.filter((lap) => lap.valid);
      setLaps(visible);
      setRecentLaps(visible.slice(0, RECENT));
      setRecentSessions(sessions.slice(0, RECENT));
    } catch {
      setLaps([]);
      setRecentLaps([]);
      setRecentSessions([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRecent();
      return subscribeLaps(() => {
        void loadRecent();
      });
    }, [loadRecent]),
  );

  useEffect(() => {
    void Network.getIpAddressAsync().then(setLan).catch(() => setLan(null));
  }, []);

  useEffect(() => {
    if (activity.idleTimedOut) void deactivateKeepAwake();
    else void activateKeepAwakeAsync();
  }, [activity.idleTimedOut]);

  const label =
    activity.status === "unsupported"
      ? `Unsupported format ${activity.unsupportedFormat} — set the game's UDP format to 2025 or 2026`
      : activity.status === "receiving"
        ? "Receiving"
        : "Waiting";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <View style={styles.row}>
        <StatusDot status={activity.status} />
        <Text style={styles.rate}>{Math.round(activity.packetsPerSec)}/s</Text>
        <Text style={styles.muted}>{label}</Text>
      </View>
      <PacketGraph samples={activity.history} />
      {car ? (
        <View style={styles.card}>
          <Text style={styles.title}>
            {trackName(car.trackId)} · {sessionTypeName(car.sessionType)}
          </Text>
          {car.teamId !== undefined ? (
            <Text style={styles.muted}>
              {teamName(car.teamId)}
              {car.myTeam ? " · myTeam 1" : ""}
            </Text>
          ) : null}
          <Text style={styles.muted}>
            Lap {car.lapNumber} · {formatLapTime(car.currentLapTimeMs)}
          </Text>
          <Text style={styles.car}>
            {formatSpeed(car.speedKph, speedUnit)} · throttle {Math.round(car.throttle * 100)}% · brake{" "}
            {Math.round(car.brake * 100)}%
          </Text>
        </View>
      ) : null}
      {activity.status !== "receiving" ? (
        <Text style={styles.muted}>
          Point the game UDP telemetry at {lan ?? "this phone"}, port 20777, format 2025 or 2026.
        </Text>
      ) : null}
      {!pipNativeAvailable ? (
        <Text style={styles.muted}>
          Picture-in-picture is not in this build. Run pnpm ios or pnpm android, then open the new app.
        </Text>
      ) : null}

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.section}>Latest laps</Text>
          <Link href="/laps" asChild>
            <Pressable>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </Link>
        </View>
        <LapsTable
          laps={recentLaps}
          peers={laps}
          showTrack
          showMode={false}
          showWeather={false}
          showFinishedTime
          preview
        />
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.section}>Latest Sessions</Text>
          <Link href="/sessions" asChild>
            <Pressable>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </Link>
        </View>
        <SessionsTable sessions={recentSessions} preview />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, gap: 16, paddingBottom: 32 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rate: { color: colors.text, fontSize: 22, fontVariant: ["tabular-nums"] },
  muted: { color: colors.muted },
  title: { color: colors.text, fontSize: 18, fontWeight: "600" },
  sectionBlock: { gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  section: { color: colors.text, fontSize: 18, fontWeight: "700" },
  seeAll: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  car: { color: colors.text, marginTop: 8 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
});
