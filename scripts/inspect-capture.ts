import { decodePacket } from "../src/protocol/decode";
import { trackName } from "../src/protocol/tracks";
import { sessionTypeName } from "../src/protocol/session-types";
import { playerCar } from "../src/protocol/types";
import { readPacketFile } from "./packet-file";

const path = process.argv[2];
if (!path) {
  console.error("usage: pnpm exec tsx scripts/inspect-capture.ts <file>");
  process.exit(1);
}

type LapNote = {
  startMs: number;
  endMs?: number;
  lapNum: number;
  lastTimeMs: number;
  invalid: boolean;
  pit: boolean;
  flashback: boolean;
  weather: number;
  sessionUid: string;
  history?: { timeMs: number; valid: boolean; atMs: number };
};

const records = readPacketFile(path);
const first = decodePacket(records[0]!.bytes);
console.log(
  `packets ${records.length} duration ${(records.at(-1)?.offsetMs ?? 0) / 1000}s format ${first.header.packetFormat} year ${first.header.gameYear}`,
);

let weather = 0;
let trackId = -1;
let sessionType = 0;
let player = 0;
let sessionUid = "";
const events: string[] = [];
const laps: LapNote[] = [];
let current: LapNote | undefined;

for (const { offsetMs, bytes } of records) {
  let packet;
  try {
    packet = decodePacket(bytes);
  } catch {
    continue;
  }
  player = packet.header.playerCarIndex;
  if (packet.header.sessionUid !== sessionUid) {
    if (current && current.endMs === undefined) current.endMs = offsetMs;
    current = undefined;
    sessionUid = packet.header.sessionUid;
    events.push(`${(offsetMs / 1000).toFixed(1)}s new-session ${sessionUid.slice(-6)}`);
  }

  if (packet.kind === "session") {
    weather = packet.data.weather;
    trackId = packet.data.trackId;
    sessionType = packet.data.sessionType;
  }

  if (packet.kind === "event") {
    const code = packet.event.code;
    if (code === "FLBK" || code === "SSTA" || code === "SEND") {
      events.push(`${(offsetMs / 1000).toFixed(1)}s ${code}`);
      if (code === "FLBK" && current) current.flashback = true;
      if (code === "SEND" && current && current.endMs === undefined) {
        current.endMs = offsetMs;
        events.push(`${(offsetMs / 1000).toFixed(1)}s mid-lap end lap ${current.lapNum}`);
      }
    }
  }

  if (packet.kind === "lapData") {
    if (player >= packet.cars.length) continue;
    const car = playerCar(packet.cars, player);
    if (!current || car.currentLapNum !== current.lapNum) {
      if (current && current.endMs === undefined) current.endMs = offsetMs;
      current = {
        startMs: offsetMs,
        lapNum: car.currentLapNum,
        lastTimeMs: car.lastLapTimeMs,
        invalid: car.currentLapInvalid,
        pit: car.pitStatus !== 0,
        flashback: false,
        weather,
        sessionUid,
      };
      laps.push(current);
    } else {
      current.invalid ||= car.currentLapInvalid;
      current.pit ||= car.pitStatus !== 0;
      current.lastTimeMs = car.lastLapTimeMs;
    }
  }

  if (packet.kind === "sessionHistory" && packet.data.carIdx === player) {
    const finished = packet.data.laps.slice(0, Math.max(0, packet.data.numLaps - 1));
    for (const note of laps) {
      if (note.sessionUid !== sessionUid) continue;
      const entry = finished[note.lapNum - 1];
      if (entry && !note.history && entry.lapTimeMs > 0) {
        note.history = { timeMs: entry.lapTimeMs, valid: entry.lapValid, atMs: offsetMs };
      }
    }
  }
}

console.log(`track ${trackName(trackId)} (${trackId}) session ${sessionTypeName(sessionType)} (${sessionType})`);
console.log("events:");
for (const line of events) console.log(`  ${line}`);
console.log("laps:");
for (const lap of laps) {
  const hist = lap.history
    ? `${lap.history.valid ? "valid" : "invalid-hist"} ${(lap.history.timeMs / 1000).toFixed(3)}s @ ${(lap.history.atMs / 1000).toFixed(1)}s`
    : "no-history";
  console.log(
    `  lap ${lap.lapNum} ${(lap.startMs / 1000).toFixed(1)}-${((lap.endMs ?? 0) / 1000).toFixed(1)}s weather ${lap.weather}` +
      `${lap.invalid ? " invalid" : ""}${lap.pit ? " pit" : ""}${lap.flashback ? " flashback" : ""} ${hist}`,
  );
}
