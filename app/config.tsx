import * as Clipboard from "expo-clipboard";
import * as Network from "expo-network";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import Storage from "expo-sqlite/kv-store";
import Svg, { Path, Rect } from "react-native-svg";

import { restartRuntime, lapRepository } from "@/capture/runtime";
import { formatMegabytes } from "@/domain/format";
import { exportLaps, pickExport } from "@/storage/export";
import type { StoredData } from "@/storage/lap-repository";
import { SettingsRepository, validatePort, type Settings } from "@/storage/settings-repository";
import { colors } from "@/ui/theme";

const settings = new SettingsRepository(Storage);

const DEFAULTS: Settings = {
  port: 20777,
  speedUnit: "kph",
  temperatureUnit: "c",
  traceRetention: "all",
};

export default function ConfigScreen() {
  const [lan, setLan] = useState("");
  const [draft, setDraft] = useState<Settings>(DEFAULTS);
  const [portOpen, setPortOpen] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<StoredData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [keepFastest, setKeepFastest] = useState(true);
  const [portText, setPortText] = useState("20777");
  const [error, setError] = useState<string | null>(null);
  const [usedBytes, setUsedBytes] = useState(0);

  useEffect(() => {
    void Network.getIpAddressAsync().then(setLan).catch(() => setLan(""));
    void settings.get().then((value) => {
      setDraft(value);
      setPortText(String(value.port));
    });
    void lapRepository().usedBytes().then(setUsedBytes);
  }, []);

  const imperial = draft.speedUnit === "mph" && draft.temperatureUnit === "f";
  const keepAllTraces = draft.traceRetention === "all";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Network</Text>
      <View style={styles.card}>
        <NetworkRow
          label="LAN address"
          value={lan || "unknown"}
          copyLabel="Copy address"
          onCopy={() => void Clipboard.setStringAsync(lan)}
        />
        <View style={styles.divider} />
        <NetworkRow
          label="UDP port"
          value={String(draft.port)}
          copyLabel="Copy port"
          onCopy={() => void Clipboard.setStringAsync(String(draft.port))}
        />
      </View>
      <Pressable
        style={styles.action}
        onPress={() => {
          setPortText(String(draft.port));
          setError(null);
          setPortOpen(true);
        }}
      >
        <Text style={styles.actionText}>Change UDP port</Text>
      </Pressable>

      <Text style={styles.kicker}>Units</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Metric system</Text>
            <Text style={styles.muted}>{imperial ? "mph · °F" : "km/h · °C"}</Text>
          </View>
          <Switch
            value={!imperial}
            onValueChange={(metric) => {
              const next: Settings = metric
                ? { ...draft, speedUnit: "kph", temperatureUnit: "c" }
                : { ...draft, speedUnit: "mph", temperatureUnit: "f" };
              setDraft(next);
              void settings.setSpeedUnit(next.speedUnit);
              void settings.setTemperatureUnit(next.temperatureUnit);
            }}
            trackColor={{ true: colors.accent }}
            accessibilityLabel="Metric system"
          />
        </View>
      </View>

      <Text style={styles.kicker}>Traces</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Keep every Trace</Text>
            <Text style={styles.muted}>
              {keepAllTraces
                ? "Every Lap keeps a Trace. This uses more storage: About 2 MB for 100 Laps on a typical track."
                : "Only Fastest and Latest keep a Trace"}
            </Text>
          </View>
          <Switch
            value={keepAllTraces}
            onValueChange={(on) => {
              const next = on ? "all" : "fastest-latest";
              setDraft({ ...draft, traceRetention: next });
              void settings.setTraceRetention(next);
            }}
            trackColor={{ true: colors.accent }}
            accessibilityLabel="Keep every trace"
          />
        </View>
      </View>

      <Text style={styles.kicker}>Data</Text>
      <Text style={styles.muted}>Using {formatMegabytes(usedBytes)}</Text>
      <Pressable style={styles.action} onPress={() => void exportLaps(lapRepository())}>
        <Text style={styles.actionText}>Export</Text>
      </Pressable>
      <Pressable
        style={styles.action}
        onPress={() => {
          setImportError(null);
          void pickExport()
            .then((data) => {
              if (!data) return;
              setPendingImport(data);
              setImportOpen(true);
            })
            .catch((error: unknown) => {
              setImportError(error instanceof Error ? error.message : "This file is not an F1 Hotlaps export.");
            });
        }}
      >
        <Text style={styles.actionText}>Import</Text>
      </Pressable>
      {importError ? <Text style={styles.error}>{importError}</Text> : null}
      <Pressable
        style={styles.action}
        onPress={() => {
          setKeepFastest(true);
          setWipeOpen(true);
        }}
      >
        <Text style={styles.actionText}>Wipe data</Text>
      </Pressable>

      <Modal visible={portOpen} animationType="fade" transparent onRequestClose={() => setPortOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPortOpen(false)} />
          <View style={styles.popup}>
            <Text style={styles.title}>UDP port</Text>
            <TextInput
              value={portText}
              onChangeText={(text) => {
                setPortText(text);
                setError(null);
              }}
              keyboardType="number-pad"
              style={styles.input}
              autoFocus
            />
            {error ? <Text style={styles.error}>{error}</Text> : (
              <Text style={styles.muted}>1024–65535</Text>
            )}
            <Pressable
              style={styles.action}
              onPress={() => {
                const port = Number(portText);
                if (!validatePort(port)) {
                  setError("Enter a port from 1024 to 65535");
                  return;
                }
                void settings.setPort(port).then(() => restartRuntime(port));
                setDraft({ ...draft, port });
                setPortOpen(false);
              }}
            >
              <Text style={styles.actionText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={importOpen} animationType="fade" transparent onRequestClose={() => setImportOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setImportOpen(false)} />
          <View style={styles.popup}>
            <Text style={styles.title}>Import</Text>
            <Text style={styles.muted}>
              This replaces stored Sessions, Laps, and Traces. This operation is not recoverable.
            </Text>
            <View style={styles.row}>
              <Pressable style={styles.action} onPress={() => setImportOpen(false)}>
                <Text style={styles.actionText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.action}
                onPress={() => {
                  const data = pendingImport;
                  setImportOpen(false);
                  setPendingImport(null);
                  if (!data) return;
                  void lapRepository()
                    .replaceAll(data)
                    .then(() => lapRepository().usedBytes())
                    .then(setUsedBytes)
                    .catch(() => setImportError("This file is not an F1 Hotlaps export."));
                }}
              >
                <Text style={styles.actionText}>Import</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={wipeOpen} animationType="fade" transparent onRequestClose={() => setWipeOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setWipeOpen(false)} />
          <View style={styles.popup}>
            <Text style={styles.title}>Wipe data</Text>
            <Text style={styles.muted}>
              This deletes stored Sessions, Laps, and Traces. This operation is not recoverable.
            </Text>
            <Pressable
              style={styles.checkRow}
              onPress={() => setKeepFastest((value) => !value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: keepFastest }}
            >
              <View style={[styles.check, keepFastest && styles.checkOn]}>
                {keepFastest ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={styles.muted}>Keep the Fastest Lap on each track</Text>
            </Pressable>
            <View style={styles.row}>
              <Pressable style={styles.action} onPress={() => setWipeOpen(false)}>
                <Text style={styles.actionText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.action}
                onPress={() => {
                  void lapRepository()
                    .wipeAll(keepFastest)
                    .then(() => lapRepository().usedBytes())
                    .then(setUsedBytes);
                  setWipeOpen(false);
                }}
              >
                <Text style={styles.actionText}>Wipe</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function NetworkRow({
  label,
  value,
  copyLabel,
  onCopy,
}: {
  label: string;
  value: string;
  copyLabel: string;
  onCopy: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, styles.grow]}>{value}</Text>
      <Pressable
        onPress={onCopy}
        accessibilityRole="button"
        accessibilityLabel={copyLabel}
        hitSlop={8}
        style={styles.iconBtn}
      >
        <CopyIcon />
      </Pressable>
    </View>
  );
}

function CopyIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Rect
        x="9"
        y="9"
        width="11"
        height="13"
        rx="2"
        fill="none"
        stroke={colors.text}
        strokeWidth={2}
      />
      <Path
        d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3"
        fill="none"
        stroke={colors.text}
        strokeWidth={2}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  kicker: { color: colors.muted, fontSize: 14, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { color: colors.muted, fontSize: 13, width: 96 },
  grow: { flex: 1, textAlign: "right" },
  title: { color: colors.text, fontSize: 16, fontWeight: "600" },
  value: { color: colors.text, fontSize: 18, fontVariant: ["tabular-nums"] },
  muted: { color: colors.muted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  iconBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 8,
  },
  action: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  actionText: { color: colors.text, fontWeight: "600" },
  backdrop: { flex: 1, backgroundColor: "#0008", justifyContent: "center", padding: 24 },
  popup: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  input: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    padding: 10,
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
  error: { color: colors.accent },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: colors.text, fontSize: 14, fontWeight: "700" },
});
