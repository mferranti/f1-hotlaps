/** Evenly spaced axis values including both ends. */
export function axisTicks(min: number, max: number, count = 5): number[] {
  if (count < 2) return [min];
  if (min === max) return Array.from({ length: count }, () => min);
  return Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1));
}
