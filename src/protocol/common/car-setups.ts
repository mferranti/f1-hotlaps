import { ByteReader } from "../byte-reader";
import { HEADER_SIZE } from "../header";
import type { GameLayout } from "../layout";
import type { CarSetupData, DecodedBody } from "../types";

export const CAR_SETUP_BYTES = 50;

export function carSetupsPacketSize(layout: GameLayout): number {
  return HEADER_SIZE + layout.numCars * CAR_SETUP_BYTES + 4;
}

export function decodeCarSetups(bytes: Uint8Array, layout: GameLayout): DecodedBody {
  const expected = carSetupsPacketSize(layout);
  if (bytes.byteLength < expected) {
    throw new RangeError(`Car Setups Packet is ${bytes.byteLength} bytes; expected ${expected}`);
  }
  const r = new ByteReader(bytes, HEADER_SIZE);
  const cars = r.array(layout.numCars, () => readSetup(r));
  return { kind: "carSetups", cars };
}

function readSetup(r: ByteReader): CarSetupData {
  return {
    frontWing: r.uint8(),
    rearWing: r.uint8(),
    onThrottle: r.uint8(),
    offThrottle: r.uint8(),
    frontCamber: r.float(),
    rearCamber: r.float(),
    frontToe: r.float(),
    rearToe: r.float(),
    frontSuspension: r.uint8(),
    rearSuspension: r.uint8(),
    frontAntiRollBar: r.uint8(),
    rearAntiRollBar: r.uint8(),
    frontSuspensionHeight: r.uint8(),
    rearSuspensionHeight: r.uint8(),
    brakePressure: r.uint8(),
    brakeBias: r.uint8(),
    engineBraking: r.uint8(),
    rearLeftTyrePressure: r.float(),
    rearRightTyrePressure: r.float(),
    frontLeftTyrePressure: r.float(),
    frontRightTyrePressure: r.float(),
    ballast: r.uint8(),
    fuelLoad: r.float(),
  };
}
