export type SpeedUnit = "kph" | "mph";
export type TemperatureUnit = "c" | "f";

const MPH_PER_KPH = 0.621371;

/** The Config switch sets mph and °F together. */
export function imperialUnits(speedUnit: SpeedUnit, temperatureUnit: TemperatureUnit): boolean {
  return speedUnit === "mph" && temperatureUnit === "f";
}

export function speedValue(kph: number, unit: SpeedUnit): number {
  return unit === "mph" ? kph * MPH_PER_KPH : kph;
}

export function formatSpeed(kph: number, unit: SpeedUnit): string {
  return unit === "mph" ? `${Math.round(speedValue(kph, unit))} mph` : `${Math.round(kph)} km/h`;
}

export function formatTemperature(c: number, unit: TemperatureUnit): string {
  return unit === "f" ? `${Math.round((c * 9) / 5 + 32)} °F` : `${Math.round(c)} °C`;
}
