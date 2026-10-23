# Packet fixtures

Trimmed, gzipped Packet recordings used by tests. Each file is named `<game>-<scenario>.bin.gz`, with `<game>` being `f1-25` or `f1-26`.

## Format

A flat sequence of records with no file header, gzipped as a whole:

```
[uint32 LE offsetMs][uint16 LE length][length bytes]
```

`offsetMs` counts from the first Packet in the file (a trimmed file starts at 0). The bytes are the Packet exactly as the Game sent it. Trimmed files only contain Packet ids 1 Session, 2 LapData, 3 Event, 5 CarSetups, 6 CarTelemetry, 7 CarStatus, and 11 SessionHistory.

Read them in tests with `readPacketFile(path)` from `scripts/packet-file.ts`; it returns `{ offsetMs, bytes }[]` and handles raw or gzipped files.

## Fixtures to cut for each Game

| Scenario | What the cut contains |
| --- | --- |
| `clean-lap` | One valid Lap, from crossing the line to crossing it again, plus the SessionHistory that confirms it |
| `invalid-lap` | A Lap the Game marks invalid (track limits or a cut) |
| `flashback` | A Lap with a flashback in it (the `FLBK` Event) |
| `pit-lap` | A Lap that includes a pit stop |
| `wet-lap` | A Lap in a Wet Session (light rain, heavy rain, or storm) |
| `session-end-mid-lap` | The Session ends (`SEND` Event) before the Lap in progress completes |
| `two-laps-new-fastest` | Two consecutive Laps where the second is faster than the first |

That is 14 files: `f1-25-clean-lap.bin.gz` … `f1-26-two-laps-new-fastest.bin.gz`.

Cuts from `fixtures/captures/f1-25.bin` and `f1-26.bin` (Spa). Both files arrived as packet format 2025 — set the game's UDP format to 2026 when recapturing F1 26. There is no `f1-26-wet-lap` yet; Wet Laps are in the F1 25 capture.

## Producing a fixture

1. Capture a full session into `fixtures/captures/` (gitignored). Point the Game's UDP telemetry at the IP address and port it prints. Stop with Ctrl+C.

   ```sh
   pnpm packets capture --port 20777 --out fixtures/captures/f1-26-monza.bin
   # Also feed the phone app (LAN address from Config):
   pnpm packets capture --forward 192.168.1.20:20777 --out fixtures/captures/f1-26-monza.bin
   ```

2. Find the time range of the scenario. Replay the capture into the app (or watch the clock while capturing) and note the start and end in seconds since the first Packet.

   ```sh
   pnpm packets replay fixtures/captures/f1-26-monza.bin --to 127.0.0.1:20777 --speed 4
   ```

3. Trim the range, keeping only the seven Packet ids above, and gzip it into this folder. Leave a few seconds before the Lap starts so the Session Packet and lap number change are included.

   ```sh
   pnpm packets trim fixtures/captures/f1-26-monza.bin --from 61.2s --to 152.9s --out fixtures/packets/f1-26-clean-lap.bin.gz
   ```

Durations accept `61.2s`, `1500ms`, `2m3.5s`, or bare seconds.
