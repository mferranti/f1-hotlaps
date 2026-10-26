const COMPOUND_NAMES: Record<number, string> = {
  7: "Intermediate",
  8: "Wet",
  9: "Dry",
  10: "Wet",
  11: "Super soft",
  12: "Soft",
  13: "Medium",
  14: "Hard",
  15: "Wet",
  16: "C5",
  17: "C4",
  18: "C3",
  19: "C2",
  20: "C1",
  21: "C0",
  22: "C6",
};

/** Actual tyre compound from Car Status. Unknown ids keep their number. */
export function tyreCompoundName(compound: number): string {
  return COMPOUND_NAMES[compound] ?? `Compound ${compound}`;
}

export type TyreKind = "soft" | "medium" | "hard" | "intermediate" | "wet";

/** Visual compound: the type the Game paints on the tyre. */
const VISUAL_KIND: Record<number, TyreKind> = {
  16: "soft",
  17: "medium",
  18: "hard",
  7: "intermediate",
  8: "wet",
  19: "soft",
  20: "soft",
  21: "medium",
  22: "hard",
  15: "wet",
};

/** Actual compound when a Lap was stored before the visual type. */
const ACTUAL_KIND: Record<number, TyreKind> = {
  7: "intermediate",
  8: "wet",
  9: "hard",
  10: "wet",
  11: "soft",
  12: "soft",
  13: "medium",
  14: "hard",
  15: "wet",
  16: "soft",
  17: "soft",
  18: "medium",
  19: "hard",
  20: "hard",
  21: "hard",
  22: "soft",
};

/** Soft, medium, hard, intermediate, or wet. The visual type wins over the compound id. */
export function tyreKind(visualCompound: number, actualCompound: number): TyreKind | null {
  if (visualCompound > 0 && VISUAL_KIND[visualCompound]) return VISUAL_KIND[visualCompound];
  return ACTUAL_KIND[actualCompound] ?? null;
}

/** A Lap stays when its painted tyre is checked. A Lap with no painted tyre always stays. */
export function tyreFilterMatches(
  visualTyreCompound: number,
  tyreCompound: number,
  selected: ReadonlySet<TyreKind>,
): boolean {
  const kind = tyreKind(visualTyreCompound, tyreCompound);
  return kind === null || selected.has(kind);
}
