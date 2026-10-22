import { createSocket } from "node:dgram";
import { closeSync, fsyncSync, mkdirSync, openSync, writeFileSync, writeSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";

import {
  encodeRecord,
  encodeRecords,
  packetId,
  parseDuration,
  readPacketFile,
  trimRecords,
} from "./packet-file";

const DEFAULT_PORT = 20777;

const USAGE = `Usage:
  pnpm packets capture [--port 20777] [--out fixtures/captures/<timestamp>.bin]
  pnpm packets replay <file> [--to 127.0.0.1:20777] [--speed 1]
  pnpm packets trim <file> [--from 0s] [--to <end>] --out fixtures/packets/<name>.bin.gz

Durations: 61.2s, 1500ms, 2m3.5s, or bare seconds. Replay and trim read .gz files too.
trim keeps Session, LapData, Event, CarSetups, CarTelemetry, CarStatus, SessionHistory
and gzips the output when --out ends in .gz.`;

function fail(message: string): never {
  console.error(`${message}\n\n${USAGE}`);
  process.exit(1);
}

function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((info) => info !== undefined && info.family === "IPv4" && !info.internal)
    .map((info) => info!.address);
}

function parsePort(text: string): number {
  const port = Number(text);
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail(`Invalid port: ${text}`);
  return port;
}

function defaultCapturePath(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `fixtures/captures/capture-${stamp}.bin`;
}

function capture(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: { port: { type: "string" }, out: { type: "string" } },
  });
  const port = parsePort(values.port ?? String(DEFAULT_PORT));
  const out = values.out ?? defaultCapturePath();
  mkdirSync(dirname(out), { recursive: true });
  const fd = openSync(out, "w");

  let startMs: number | undefined;
  let count = 0;
  const socket = createSocket("udp4");

  socket.on("message", (msg) => {
    const now = performance.now();
    startMs ??= now;
    writeSync(fd, encodeRecord({ offsetMs: Math.round(now - startMs), bytes: msg }));
    count += 1;
  });
  socket.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });

  const progress = setInterval(() => process.stdout.write(`\rPackets: ${count}`), 250);

  let stopped = false;
  function stop(code = 0): void {
    if (stopped) return;
    stopped = true;
    clearInterval(progress);
    socket.close();
    fsyncSync(fd);
    closeSync(fd);
    console.log(`\rPackets: ${count}\nSaved ${out}`);
    process.exit(code);
  }
  process.on("SIGINT", () => stop());
  process.on("SIGTERM", () => stop());

  socket.bind(port, () => {
    const addresses = lanAddresses();
    console.log(`Listening on UDP port ${port}, writing ${out}`);
    console.log(
      addresses.length > 0
        ? `Set the Game's UDP IP address to: ${addresses.join(" or ")} (port ${port})`
        : "No LAN IPv4 address found; is Wi-Fi or Ethernet connected?",
    );
    console.log("Press Ctrl+C to stop.");
  });
}

function parseTarget(text: string): { host: string; port: number } {
  const at = text.lastIndexOf(":");
  if (at <= 0) fail(`Invalid --to, expected host:port: ${text}`);
  return { host: text.slice(0, at), port: parsePort(text.slice(at + 1)) };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function replay(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { to: { type: "string" }, speed: { type: "string" } },
  });
  const file = positionals[0] ?? fail("Missing <file>");
  const { host, port } = parseTarget(values.to ?? `127.0.0.1:${DEFAULT_PORT}`);
  const speed = Number(values.speed ?? "1");
  if (!(speed > 0)) fail(`Invalid --speed: ${values.speed}`);

  const records = readPacketFile(file);
  const lastMs = records.at(-1)?.offsetMs ?? 0;
  console.log(
    `Replaying ${records.length} Packets (${(lastMs / 1000).toFixed(1)}s at ${speed}x) to ${host}:${port}`,
  );

  const socket = createSocket("udp4");
  const startMs = performance.now();
  for (const [index, { offsetMs, bytes }] of records.entries()) {
    const wait = startMs + offsetMs / speed - performance.now();
    if (wait > 0) await sleep(wait);
    await new Promise<void>((resolve, reject) =>
      socket.send(bytes, port, host, (error) => (error ? reject(error) : resolve())),
    );
    if (index % 100 === 0) process.stdout.write(`\rSent: ${index + 1}`);
  }
  socket.close();
  console.log(`\rSent: ${records.length}`);
}

function trim(args: string[]): void {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { from: { type: "string" }, to: { type: "string" }, out: { type: "string" } },
  });
  const file = positionals[0] ?? fail("Missing <file>");
  const out = values.out ?? fail("Missing --out");
  const fromMs = parseDuration(values.from ?? "0");
  const toMs = values.to === undefined ? Infinity : parseDuration(values.to);
  if (toMs < fromMs) fail("--to is before --from");

  const records = readPacketFile(file);
  const kept = trimRecords(records, fromMs, toMs);
  const encoded = encodeRecords(kept);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, out.endsWith(".gz") ? gzipSync(encoded, { level: 9 }) : encoded);

  const byId = new Map<number, number>();
  for (const { bytes } of kept) {
    const id = packetId(bytes) ?? -1;
    byId.set(id, (byId.get(id) ?? 0) + 1);
  }
  const summary = [...byId.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, n]) => `id ${id}: ${n}`)
    .join(", ");
  console.log(`Kept ${kept.length} of ${records.length} Packets (${summary || "none"})`);
  console.log(`Saved ${out}`);
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  switch (command) {
    case "capture":
      return capture(rest);
    case "replay":
      return replay(rest);
    case "trim":
      return trim(rest);
    default:
      fail(command ? `Unknown command: ${command}` : "Missing command");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
