import { decodersFor } from "../common/decoders";
import type { GameLayout } from "../layout";
import type { GameDecoder } from "../types";

export const F1_25_PACKET_FORMAT = 2025;

/** docs/telemetry/f1-25-udp-spec.txt */
export const layout: GameLayout = {
  numCars: 22,
  engineTemperature: "uint16",
  ersHarvestLimitPerLap: false,
  sessionAeroZones: false,
  participantTeamId: "uint8",
};

export const f1_25: GameDecoder = {
  packetFormat: F1_25_PACKET_FORMAT,
  decoders: decodersFor(layout),
};
