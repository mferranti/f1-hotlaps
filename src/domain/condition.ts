import type { Condition } from "@/domain/types";

const FIRST_WET_WEATHER = 3;

/** Maps the Session `m_weather` code: 0-2 (clear, light cloud, overcast) are Dry, 3-5 (rain, storm) are Wet. */
export function conditionFromWeather(weather: number): Condition {
  return weather >= FIRST_WET_WEATHER ? "wet" : "dry";
}
