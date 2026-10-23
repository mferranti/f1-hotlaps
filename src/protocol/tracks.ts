const TRACK_FLAGS: Record<number, string> = {
  0: "🇦🇺",
  2: "🇨🇳",
  3: "🇧🇭",
  4: "🇪🇸",
  5: "🇲🇨",
  6: "🇨🇦",
  7: "🇬🇧",
  9: "🇭🇺",
  10: "🇧🇪",
  11: "🇮🇹",
  12: "🇸🇬",
  13: "🇯🇵",
  14: "🇦🇪",
  15: "🇺🇸",
  16: "🇧🇷",
  17: "🇦🇹",
  19: "🇲🇽",
  20: "🇦🇿",
  26: "🇳🇱",
  27: "🇮🇹",
  29: "🇸🇦",
  30: "🇺🇸",
  31: "🇺🇸",
  32: "🇶🇦",
  39: "🇬🇧",
  40: "🇦🇹",
  41: "🇳🇱",
  42: "🇪🇸",
};

const TRACKS: Record<number, string> = {
  0: "Melbourne",
  2: "Shanghai",
  3: "Sakhir",
  4: "Catalunya",
  5: "Monaco",
  6: "Montreal",
  7: "Silverstone",
  9: "Hungaroring",
  10: "Spa",
  11: "Monza",
  12: "Singapore",
  13: "Suzuka",
  14: "Abu Dhabi",
  15: "Texas",
  16: "Brazil",
  17: "Austria",
  19: "Mexico",
  20: "Baku",
  26: "Zandvoort",
  27: "Imola",
  29: "Jeddah",
  30: "Miami",
  31: "Las Vegas",
  32: "Losail",
  39: "Silverstone (Reverse)",
  40: "Austria (Reverse)",
  41: "Zandvoort (Reverse)",
  42: "Madrid",
};

/** Season 8 PDF appendix. An id the tables do not list is shown as Unknown. */
export function trackName(id: number): string {
  return TRACKS[id] ?? `Unknown (id ${id})`;
}

export function knownTrackIds(): number[] {
  return Object.keys(TRACKS).map(Number).sort((a, b) => a - b);
}

/** Regional-indicator flag for the track's country, or empty when the id is unknown. */
export function trackFlag(id: number): string {
  return TRACK_FLAGS[id] ?? "";
}

export function trackLabel(id: number): string {
  const flag = trackFlag(id);
  return flag ? `${flag} ${trackName(id)}` : trackName(id);
}
