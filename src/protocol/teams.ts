const MERCEDES = "Mercedes";
const FERRARI = "Ferrari";
const RED_BULL = "Red Bull Racing";
const WILLIAMS = "Williams";
const ASTON_MARTIN = "Aston Martin";
const ALPINE = "Alpine";
const RACING_BULLS = "Racing Bulls";
const HAAS = "Haas";
const MCLAREN = "McLaren";
const KICK_SAUBER = "Kick Sauber";

/** Season 8 appendix: F1 Custom Team (My Team / My F1 Team). */
export const MY_TEAM_ID = 104;
/** F1 26 with packet format 2025 uses 220–232 for 2026-spec cars; 221 is Custom Team. */
export const F1_26_FORMAT_2025_MY_TEAM_ID = 221;

const TEAMS: Record<number, string> = {
  0: MERCEDES,
  1: FERRARI,
  2: RED_BULL,
  3: WILLIAMS,
  4: ASTON_MARTIN,
  5: ALPINE,
  6: RACING_BULLS,
  7: HAAS,
  8: MCLAREN,
  9: KICK_SAUBER,
  41: "F1 Generic",
  [MY_TEAM_ID]: "My F1 Team",
  220: MERCEDES,
  [F1_26_FORMAT_2025_MY_TEAM_ID]: "My F1 Team",
  222: FERRARI,
  223: RED_BULL,
  224: WILLIAMS,
  225: ASTON_MARTIN,
  226: ALPINE,
  227: RACING_BULLS,
  228: HAAS,
  229: MCLAREN,
  230: "Audi",
  232: "Cadillac",
  129: "Konnersport",
  142: "APXGP '24",
  154: "APXGP '25",
  155: "Konnersport '24",
  158: "ART GP '24",
  159: "Campos '24",
  160: "Rodin '24",
  161: "AIX Racing '24",
  162: "DAMS '24",
  163: "Hitech '24",
  164: "MP '24",
  165: "Prema '24",
  166: "Trident '24",
  167: "Van Amersfoort '24",
  168: "Invicta '24",
  185: MERCEDES,
  186: FERRARI,
  187: RED_BULL,
  188: WILLIAMS,
  189: ASTON_MARTIN,
  190: ALPINE,
  191: RACING_BULLS,
  192: HAAS,
  193: MCLAREN,
  194: KICK_SAUBER,
  465: "ART GP '25",
  466: "Campos '25",
  467: "Rodin '25",
  468: "AIX Racing '25",
  469: "DAMS '25",
  470: "Hitech '25",
  471: "MP '25",
  472: "Prema '25",
  473: "Trident '25",
  474: "Van Amersfoort '25",
  475: "Invicta '25",
  476: MERCEDES,
  477: FERRARI,
  478: RED_BULL,
  479: WILLIAMS,
  480: ASTON_MARTIN,
  481: ALPINE,
  482: RACING_BULLS,
  483: HAAS,
  484: MCLAREN,
  485: "Audi",
  486: "Cadillac",
  489: "ART GP '26",
  490: "Campos '26",
  491: "Rodin '26",
  492: "AIX Racing '26",
  493: "DAMS '26",
  494: "Hitech '26",
  495: "MP '26",
  496: "Prema '26",
  497: "Trident '26",
  498: "Van Amersfoort '26",
  499: "Invicta '26",
};

/** UDP appendix team id. Lobby 255 (F1 25) and 65535 (F1 26) mean no team. */
export function teamName(id: number): string {
  if (id === 255 || id === 65_535) return "No team";
  return TEAMS[id] ?? `Unknown (id ${id})`;
}

/**
 * Live Packets set m_teamId to the Custom Team id and leave m_myTeam at 0.
 * m_myTeam == 1 is still My F1 Team when the Game does set it.
 */
export function recordedTeamId(participant: { teamId: number; myTeam: boolean }): number {
  if (
    participant.myTeam ||
    participant.teamId === MY_TEAM_ID ||
    participant.teamId === F1_26_FORMAT_2025_MY_TEAM_ID
  ) {
    return MY_TEAM_ID;
  }
  return participant.teamId;
}
