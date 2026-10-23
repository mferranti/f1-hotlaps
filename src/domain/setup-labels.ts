import type { CarSetup } from "@/domain/types";

const LABELS: Record<string, string> = {
  frontWing: "Front wing",
  rearWing: "Rear wing",
  onThrottle: "On throttle diff",
  offThrottle: "Off throttle diff",
  frontCamber: "Front camber",
  rearCamber: "Rear camber",
  frontToe: "Front toe",
  rearToe: "Rear toe",
  frontSuspension: "Front suspension",
  rearSuspension: "Rear suspension",
  frontAntiRollBar: "Front anti-roll",
  rearAntiRollBar: "Rear anti-roll",
  frontSuspensionHeight: "Front ride height",
  rearSuspensionHeight: "Rear ride height",
  brakePressure: "Brake pressure",
  brakeBias: "Brake bias",
  engineBraking: "Engine braking",
  rearLeftTyrePressure: "RL tyre pressure",
  rearRightTyrePressure: "RR tyre pressure",
  frontLeftTyrePressure: "FL tyre pressure",
  frontRightTyrePressure: "FR tyre pressure",
  ballast: "Ballast",
  fuelLoad: "Fuel load",
};

export function setupRows(setup: CarSetup): { key: string; label: string; value: string }[] {
  return Object.entries(setup).map(([key, value]) => ({
    key,
    label: LABELS[key] ?? key,
    value: Number.isInteger(value) ? String(value) : value.toFixed(2),
  }));
}
