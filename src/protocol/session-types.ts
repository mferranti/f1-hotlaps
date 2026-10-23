const SESSION_TYPES: Record<number, string> = {
  0: "Unknown",
  1: "Practice 1",
  2: "Practice 2",
  3: "Practice 3",
  4: "Short Practice",
  5: "Qualifying 1",
  6: "Qualifying 2",
  7: "Qualifying 3",
  8: "Short Qualifying",
  9: "One-Shot Qualifying",
  10: "Sprint Shootout 1",
  11: "Sprint Shootout 2",
  12: "Sprint Shootout 3",
  13: "Short Sprint Shootout",
  14: "One-Shot Sprint Shootout",
  15: "Race",
  16: "Race 2",
  17: "Race 3",
  18: "Time Trial",
};

/** Season 8 PDF appendix. An id the tables do not list is shown as Unknown. */
export function sessionTypeName(id: number): string {
  return SESSION_TYPES[id] ?? `Unknown (id ${id})`;
}

/** Race, Race 2, and Race 3 from the Season 8 appendix. */
export function isRaceSession(sessionType: number): boolean {
  return sessionType === 15 || sessionType === 16 || sessionType === 17;
}
