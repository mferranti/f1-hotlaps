import { ByteReader } from "../byte-reader";
import { HEADER_SIZE } from "../header";
import type { GameLayout } from "../layout";
import type { CarTelemetryData, DecodedBody } from "../types";
import { readPlayerCars } from "./player-cars";

export function carTelemetryCarBytes(layout: GameLayout): number {
  return layout.engineTemperature === "uint16" ? 60 : 59;
}

export function carTelemetryPacketSize(layout: GameLayout): number {
  return HEADER_SIZE + layout.numCars * carTelemetryCarBytes(layout) + 3;
}

export function decodeCarTelemetry(bytes: Uint8Array, layout: GameLayout, playerCarIndex: number): DecodedBody {
  const expected = carTelemetryPacketSize(layout);
  if (bytes.byteLength < expected) {
    throw new RangeError(`Car Telemetry Packet is ${bytes.byteLength} bytes; expected ${expected}`);
  }
  const r = new ByteReader(bytes, HEADER_SIZE);
  const cars = readPlayerCars(r, layout.numCars, playerCarIndex, carTelemetryCarBytes(layout), () =>
    readTelemetry(r, layout),
  );
  return { kind: "carTelemetry", cars };
}

function readTelemetry(r: ByteReader, layout: GameLayout): CarTelemetryData {
  const speedKph = r.uint16();
  const throttle = r.float();
  r.skip(4); // steer
  const brake = r.float();
  r.skip(1); // clutch
  const gear = r.int8();
  r.skip(2); // engine RPM
  const drs = r.uint8();
  r.skip(layout.engineTemperature === "uint16" ? 41 : 40);
  return { speedKph, throttle, brake, gear, drs };
}
