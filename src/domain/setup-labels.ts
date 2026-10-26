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
  rearLeftTyrePressure: "Rear left tyre pressure",
  rearRightTyrePressure: "Rear right tyre pressure",
  frontLeftTyrePressure: "Front left tyre pressure",
  frontRightTyrePressure: "Front right tyre pressure",
  ballast: "Ballast",
  fuelLoad: "Fuel load",
};

/** Inclusive ends of the setting. The bar is empty at min and full at max. */
const RANGES: Record<string, { min: number; max: number; suffix?: string }> = {
  frontWing: { min: 0, max: 50 },
  rearWing: { min: 0, max: 50 },
  onThrottle: { min: 10, max: 100, suffix: "%" },
  offThrottle: { min: 10, max: 100, suffix: "%" },
  frontCamber: { min: -3.5, max: -2.5, suffix: "°" },
  rearCamber: { min: -2.2, max: -0.7, suffix: "°" },
  frontToe: { min: 0, max: 0.5, suffix: "°" },
  rearToe: { min: 0, max: 0.5, suffix: "°" },
  frontSuspension: { min: 1, max: 41 },
  rearSuspension: { min: 1, max: 41 },
  frontAntiRollBar: { min: 1, max: 21 },
  rearAntiRollBar: { min: 1, max: 21 },
  frontSuspensionHeight: { min: 10, max: 40 },
  rearSuspensionHeight: { min: 40, max: 100 },
  brakePressure: { min: 80, max: 100, suffix: "%" },
  brakeBias: { min: 50, max: 70, suffix: "%" },
  engineBraking: { min: 0, max: 100, suffix: "%" },
  rearLeftTyrePressure: { min: 22.5, max: 29.5 },
  rearRightTyrePressure: { min: 22.5, max: 29.5 },
  frontLeftTyrePressure: { min: 20.5, max: 26.5 },
  frontRightTyrePressure: { min: 20.5, max: 26.5 },
  fuelLoad: { min: 5, max: 110, suffix: "kg" },
};

const GROUPS: { title: string; keys: string[] }[] = [
  { title: "Aerodynamics", keys: ["frontWing", "rearWing"] },
  { title: "Transmission", keys: ["onThrottle", "offThrottle"] },
  { title: "Suspension Geometry", keys: ["frontCamber", "rearCamber", "frontToe", "rearToe"] },
  {
    title: "Suspension",
    keys: [
      "frontSuspension",
      "rearSuspension",
      "frontAntiRollBar",
      "rearAntiRollBar",
      "frontSuspensionHeight",
      "rearSuspensionHeight",
    ],
  },
  { title: "Brakes", keys: ["brakePressure", "brakeBias", "engineBraking"] },
  {
    title: "Tyres",
    keys: [
      "rearLeftTyrePressure",
      "rearRightTyrePressure",
      "frontLeftTyrePressure",
      "frontRightTyrePressure",
    ],
  },
  { title: "Fuel", keys: ["ballast", "fuelLoad"] },
];

export interface SetupRow {
  key: string;
  label: string;
  value: string;
  /** 0 at the minimum, 1 at the maximum. Null when the setting has no range. */
  fill: number | null;
  /** Label under the start of the bar. Null when the setting has no range. */
  min: string | null;
  /** Label under the end of the bar. Null when the setting has no range. */
  max: string | null;
}

export interface SetupGroup {
  title: string;
  rows: SetupRow[];
}

/** Setup values in car-menu groups. A group with nothing stored is left out. */
export function setupGroups(setup: CarSetup): SetupGroup[] {
  return GROUPS.flatMap((group) => {
    const rows = group.keys.flatMap((key) => {
      const value = setup[key];
      if (value === undefined) return [];
      const range = setupRange(key, value);
      return [{ key, label: LABELS[key] ?? key, value: formatSetupValue(value), ...range }];
    });
    return rows.length === 0 ? [] : [{ title: group.title, rows }];
  });
}

function formatSetupValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function setupRange(key: string, value: number): { fill: number | null; min: string | null; max: string | null } {
  const range = RANGES[key];
  if (!range || range.max === range.min) return { fill: null, min: null, max: null };
  const span = (value - range.min) / (range.max - range.min);
  const suffix = range.suffix ?? "";
  return {
    fill: Math.min(1, Math.max(0, span)),
    min: `${range.min}${suffix}`,
    max: `${range.max}${suffix}`,
  };
}
