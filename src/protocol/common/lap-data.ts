import { ByteReader } from "../byte-reader";
import { HEADER_SIZE } from "../header";
import type { GameLayout } from "../layout";
import type { DecodedBody, LapData } from "../types";
import { readPlayerCars } from "./player-cars";

export const LAP_DATA_CAR_BYTES = 57;

export function lapDataPacketSize(layout: GameLayout): number {
  return HEADER_SIZE + layout.numCars * LAP_DATA_CAR_BYTES + 2;
}

export function decodeLapData(bytes: Uint8Array, layout: GameLayout, playerCarIndex: number): DecodedBody {
  const expected = lapDataPacketSize(layout);
  if (bytes.byteLength < expected) {
    throw new RangeError(`Lap Data Packet is ${bytes.byteLength} bytes; expected ${expected}`);
  }
  const r = new ByteReader(bytes, HEADER_SIZE);
  const cars = readPlayerCars(r, layout.numCars, playerCarIndex, LAP_DATA_CAR_BYTES, () => readLapData(r));
  return { kind: "lapData", cars };
}

function readLapData(r: ByteReader): LapData {
  const lastLapTimeMs = r.uint32();
  const currentLapTimeMs = r.uint32();
  const sector1Ms = r.splitTimeMs();
  const sector2Ms = r.splitTimeMs();
  r.skip(6); // delta to car in front and race leader
  const lapDistanceM = r.float();
  r.skip(8); // total distance, safety car delta
  r.skip(1); // car position
  const currentLapNum = r.uint8();
  const pitStatus = r.uint8();
  r.skip(2); // pit stops, sector
  const currentLapInvalid = r.uint8() === 1;
  r.skip(6); // penalties through grid position
  const driverStatus = r.uint8();
  r.skip(12); // result status through speed trap
  return {
    lastLapTimeMs,
    currentLapTimeMs,
    sector1Ms,
    sector2Ms,
    lapDistanceM,
    currentLapNum,
    pitStatus,
    currentLapInvalid,
    driverStatus,
  };
}
