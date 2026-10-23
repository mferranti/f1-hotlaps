import { formatDelta, formatGame, formatLapTime, formatMegabytes, formatSectorTime } from "@/domain/format";

describe("formatGame", () => {
  it("names F1 25 and F1 26", () => {
    expect(formatGame("f1-25")).toBe("F1 25");
    expect(formatGame("f1-26")).toBe("F1 26");
  });
});

describe("formatLapTime", () => {
  it.each([
    [81_034, "1:21.034"],
    [28_500, "0:28.500"],
    [125_007, "2:05.007"],
    [0, "0:00.000"],
  ])("formats %i ms as %s", (ms, expected) => {
    expect(formatLapTime(ms)).toBe(expected);
  });

  it("rounds fractional milliseconds", () => {
    expect(formatLapTime(59_999.6)).toBe("1:00.000");
  });
});

describe("formatSectorTime", () => {
  it("drops the 0: prefix under a minute", () => {
    expect(formatSectorTime(23_456)).toBe("23.456");
  });

  it("keeps minutes when the sector is a minute or more", () => {
    expect(formatSectorTime(61_000)).toBe("1:01.000");
  });
});

describe("formatMegabytes", () => {
  it("shows stored size in MB", () => {
    expect(formatMegabytes(0)).toBe("0.0 MB");
    expect(formatMegabytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});

describe("formatDelta", () => {
  it.each([
    [123, "+0.123"],
    [-1_450, "-1.450"],
    [0, "+0.000"],
    [-0.2, "+0.000"],
  ])("formats %d ms against the Fastest as %s", (ms, expected) => {
    expect(formatDelta(ms)).toBe(expected);
  });
});
