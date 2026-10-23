import { sessionConditionLabel, sessionResultLabel } from "@/domain/session-result";

describe("sessionResultLabel", () => {
  it("is empty when the Session is not a Race", () => {
    expect(sessionResultLabel({ resultStatus: 3, position: 1 }, false)).toBe("");
  });

  it("names Race results", () => {
    expect(sessionResultLabel({ resultStatus: 3, position: 1 }, true)).toBe("P1");
    expect(sessionResultLabel({ resultStatus: 3, position: 20 }, true)).toBe("P20");
    expect(sessionResultLabel({ resultStatus: 4, position: 12 }, true)).toBe("DNF");
    expect(sessionResultLabel({ resultStatus: 5, position: 0 }, true)).toBe("DSC");
    expect(sessionResultLabel({ resultStatus: 6, position: 0 }, true)).toBe("NC");
    expect(sessionResultLabel({ resultStatus: 7, position: 0 }, true)).toBe("RET");
  });

  it("is empty until a Race has a Result", () => {
    expect(sessionResultLabel({ resultStatus: 2, position: 3 }, true)).toBe("");
    expect(sessionResultLabel({ resultStatus: 3, position: 0 }, true)).toBe("");
  });
});

describe("sessionConditionLabel", () => {
  it("names Dry, Wet, or both", () => {
    expect(sessionConditionLabel([{ condition: "dry" }])).toBe("Dry");
    expect(sessionConditionLabel([{ condition: "wet" }])).toBe("Wet");
    expect(sessionConditionLabel([{ condition: "dry" }, { condition: "wet" }])).toBe("Dry and Wet");
  });
});
