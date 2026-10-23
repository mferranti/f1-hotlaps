import { ByteReader } from "../byte-reader";
import { HEADER_SIZE } from "../header";
import type { GameLayout } from "../layout";
import type { DecodedBody, FinalClassificationData } from "../types";

const CAR_BYTES = 46;
const AFTER_RESULT_STATUS = 40;

export function finalClassificationPacketSize(layout: GameLayout): number {
  return HEADER_SIZE + 1 + layout.numCars * CAR_BYTES;
}

export function decodeFinalClassification(bytes: Uint8Array, layout: GameLayout): DecodedBody {
  const used = classificationLayoutForSize(bytes.byteLength, layout);
  const expected = finalClassificationPacketSize(used);
  if (bytes.byteLength < expected) {
    throw new RangeError(`Final Classification Packet is ${bytes.byteLength} bytes; expected ${expected}`);
  }
  const r = new ByteReader(bytes, HEADER_SIZE);
  r.skip(1); // numCars
  const cars = r.array(used.numCars, () => readCar(r));
  return { kind: "finalClassification", cars };
}

function classificationLayoutForSize(byteLength: number, layout: GameLayout): GameLayout {
  const payload = byteLength - HEADER_SIZE - 1;
  if (payload > 0 && payload % CAR_BYTES === 0) return { ...layout, numCars: payload / CAR_BYTES };
  return layout;
}

function readCar(r: ByteReader): FinalClassificationData {
  const position = r.uint8();
  r.skip(4); // numLaps, gridPosition, points, numPitStops
  const resultStatus = r.uint8();
  r.skip(AFTER_RESULT_STATUS);
  return { position, resultStatus };
}
