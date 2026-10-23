const GAME_MODES: Record<number, string> = {
  0: "Event Mode",
  1: "Grand Prix",
  2: "Time Trial",
  3: "Grand Prix",
  4: "Grand Prix '23",
  5: "Time Trial",
  6: "Splitscreen",
  7: "Online Custom",
  8: "Online League",
  9: "Career Invitational",
  10: "Championship Invitational",
  11: "Championship",
  12: "Online Championship",
  13: "Online Weekly Event",
  15: "Career '22",
  19: "Career '22 Online",
  20: "Career '23",
  21: "Career '23 Online",
  25: "Career '24",
  26: "Career '24 Online",
  27: "My Team Career '24",
  28: "My Team Career '24 Online",
  29: "Story",
};

/** Session Packet m_gameMode. Ids 1 and 2 come from live F1 25/26 Packets; the published appendix omits them. An id the table does not list is shown as "-". */
export function gameModeName(id: number): string {
  return GAME_MODES[id] ?? "-";
}
