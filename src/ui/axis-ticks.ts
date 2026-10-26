/** A range with 0 in the middle, wide enough for both ends. */
export function centeredDomain(min: number, max: number): { min: number; max: number } {
  const bound = Math.max(Math.abs(min), Math.abs(max));
  const span = bound === 0 ? 1 : bound;
  return { min: -span, max: span };
}

/** Evenly spaced axis values including both ends. */
export function axisTicks(min: number, max: number, count = 5): number[] {
  if (count < 2) return [min];
  if (min === max) return Array.from({ length: count }, () => min);
  return Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1));
}
