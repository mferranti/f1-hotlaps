import { sectorEndDistances } from "./sector-distance";

const lap = [
  { distanceM: 0, elapsedMs: 0 },
  { distanceM: 100, elapsedMs: 1_000 },
  { distanceM: 2_000, elapsedMs: 25_000 },
  { distanceM: 4_500, elapsedMs: 52_000 },
  { distanceM: 7_000, elapsedMs: 81_000 },
];

describe("sectorEndDistances", () => {
  it("places each sector end at the distance for that elapsed time", () => {
    expect(sectorEndDistances(lap, 25_000, 27_000)).toEqual({ sector1M: 2_000, sector2M: 4_500 });
  });

  it("interpolates between samples", () => {
    expect(sectorEndDistances(lap, 500, 500)).toEqual({ sector1M: 50, sector2M: 100 });
  });

  it("skips a sector the Trace does not reach", () => {
    expect(sectorEndDistances(lap, 25_000, 90_000)).toEqual({ sector1M: 2_000, sector2M: null });
    expect(sectorEndDistances(lap, 0, 25_000)).toEqual({ sector1M: null, sector2M: 2_000 });
  });
});
