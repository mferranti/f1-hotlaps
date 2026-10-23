import { ByteReader } from "../byte-reader";
import { HEADER_SIZE } from "../header";
import type { GameLayout } from "../layout";
import type { CarStatusData, DecodedBody } from "../types";
import { readPlayerCars } from "./player-cars";

export function carStatusCarBytes(layout: GameLayout): number {
  return layout.ersHarvestLimitPerLap ? 59 : 55;
}

export function carStatusPacketSize(layout: GameLayout): number {
  return HEADER_SIZE + layout.numCars * carStatusCarBytes(layout);
}

export function decodeCarStatus(bytes: Uint8Array, layout: GameLayout, playerCarIndex: number): DecodedBody {
  const expected = carStatusPacketSize(layout);
  if (bytes.byteLength < expected) {
    throw new RangeError(`Car Status Packet is ${bytes.byteLength} bytes; expected ${expected}`);
  }
  const r = new ByteReader(bytes, HEADER_SIZE);
  const cars = readPlayerCars(r, layout.numCars, playerCarIndex, carStatusCarBytes(layout), () =>
    readStatus(r, layout),
  );
  return { kind: "carStatus", cars };
}

function readStatus(r: ByteReader, layout: GameLayout): CarStatusData {
  r.skip(25); // through drsActivationDistance
  const actualTyreCompound = r.uint8();
  r.skip(12); // visual compound through MGU-K power
  const ersStoreEnergy = r.float();
  r.skip(layout.ersHarvestLimitPerLap ? 17 : 13);
  return { actualTyreCompound, ersStoreEnergy };
}
