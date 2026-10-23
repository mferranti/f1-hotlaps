import { decodersFor } from "../common/decoders";
import type { GameLayout } from "../layout";
import type { GameDecoder } from "../types";

export const F1_26_PACKET_FORMAT = 2026;

/** docs/telemetry/f1-26-udp-spec.txt: 24 cars, engine temperature narrowed to uint8, two additions. */
export const layout: GameLayout = {
  numCars: 24,
  engineTemperature: "uint8",
  ersHarvestLimitPerLap: true,
  sessionAeroZones: true,
  participantTeamId: "uint16",
};

export const f1_26: GameDecoder = {
  packetFormat: F1_26_PACKET_FORMAT,
  decoders: decodersFor(layout),
};
