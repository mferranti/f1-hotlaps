/** Race Result only. Time Trial and practice stay empty. Status ids are Final Classification m_resultStatus. */
export function sessionResultLabel(
  session: { resultStatus: number; position: number },
  race: boolean,
): string {
  if (!race) return "";
  if (session.resultStatus === 3 && session.position > 0) return `P${session.position}`;
  if (session.resultStatus === 4) return "DNF";
  if (session.resultStatus === 5) return "DSC";
  if (session.resultStatus === 6) return "NC";
  if (session.resultStatus === 7) return "RET";
  return "";
}

export function sessionConditionLabel(laps: readonly { condition: "dry" | "wet" }[]): string {
  const dry = laps.some((lap) => lap.condition === "dry");
  const wet = laps.some((lap) => lap.condition === "wet");
  if (dry && wet) return "Dry and Wet";
  if (wet) return "Wet";
  if (dry) return "Dry";
  return "-";
}
