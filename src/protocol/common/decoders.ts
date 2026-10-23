import { PacketId } from "../header";
import type { GameLayout } from "../layout";
import type { GameDecoder } from "../types";
import { decodeCarSetups } from "./car-setups";
import { decodeCarStatus } from "./car-status";
import { decodeCarTelemetry } from "./car-telemetry";
import { decodeEvent } from "./event";
import { decodeFinalClassification } from "./final-classification";
import { decodeLapData } from "./lap-data";
import { decodeParticipants } from "./participants";
import { decodeSession } from "./session";
import { decodeSessionHistory } from "./session-history";

/** The packet decoders shared by every Game, parameterised by its layout. */
export function decodersFor(layout: GameLayout): GameDecoder["decoders"] {
  return {
    [PacketId.Session]: decodeSession,
    [PacketId.LapData]: (bytes, player) => decodeLapData(bytes, layout, player),
    [PacketId.Event]: decodeEvent,
    [PacketId.Participants]: (bytes) => decodeParticipants(bytes, layout),
    [PacketId.CarSetups]: (bytes) => decodeCarSetups(bytes, layout),
    [PacketId.CarTelemetry]: (bytes, player) => decodeCarTelemetry(bytes, layout, player),
    [PacketId.CarStatus]: (bytes, player) => decodeCarStatus(bytes, layout, player),
    [PacketId.SessionHistory]: (bytes, player) => decodeSessionHistory(bytes, player),
    [PacketId.FinalClassification]: (bytes) => decodeFinalClassification(bytes, layout),
  };
}
