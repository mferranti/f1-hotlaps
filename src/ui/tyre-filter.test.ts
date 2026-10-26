import { TYRE_KINDS, tyreFilterMatches } from "./tyre-filter";

const all = new Set(TYRE_KINDS);

describe("tyreFilterMatches", () => {
  it("keeps every painted tyre when all are selected", () => {
    expect(tyreFilterMatches(16, 20, all)).toBe(true);
    expect(tyreFilterMatches(17, 18, all)).toBe(true);
    expect(tyreFilterMatches(18, 19, all)).toBe(true);
    expect(tyreFilterMatches(7, 7, all)).toBe(true);
    expect(tyreFilterMatches(8, 8, all)).toBe(true);
    expect(tyreFilterMatches(0, 18, all)).toBe(true);
  });

  it("hides a painted tyre that is unchecked and keeps a Lap with no tyre", () => {
    const softOff = new Set(TYRE_KINDS.filter((kind) => kind !== "soft"));
    expect(tyreFilterMatches(16, 20, softOff)).toBe(false);
    expect(tyreFilterMatches(0, 16, softOff)).toBe(false);
    expect(tyreFilterMatches(17, 18, softOff)).toBe(true);
    expect(tyreFilterMatches(0, 0, softOff)).toBe(true);
    expect(tyreFilterMatches(0, 3, new Set())).toBe(true);
  });
});
