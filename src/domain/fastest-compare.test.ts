import { compareToFastest } from "./fastest-compare";

describe("compareToFastest", () => {
  it("puts sectors in columns and This, Fastest, and Delta in rows", () => {
    expect(
      compareToFastest(
        { lapTimeMs: 82_000, sector1Ms: 26_000, sector2Ms: 28_000, sector3Ms: 28_000 },
        { lapTimeMs: 81_000, sector1Ms: 25_000, sector2Ms: 28_000, sector3Ms: 28_000 },
      ),
    ).toEqual([
      { label: "This", lap: "1:22.000", s1: "26.000", s2: "28.000", s3: "28.000" },
      { label: "Fastest", lap: "1:21.000", s1: "25.000", s2: "28.000", s3: "28.000" },
      { label: "Delta", lap: "+1.000", s1: "+1.000", s2: "+0.000", s3: "+0.000" },
    ]);
  });
});
