import { deltaByDistance } from "@/domain/delta";
import type { TraceSample } from "@/domain/types";

function sample(distanceM: number, elapsedMs: number): TraceSample {
  return { distanceM, throttle: 1, brake: 0, speedKph: 250, elapsedMs, gear: 5, drs: 0, ers: 0 };
}

const fastest = [sample(0, 0), sample(10, 100), sample(20, 200), sample(30, 300)];

describe("deltaByDistance", () => {
  it("is all zeros for the Fastest against itself", () => {
    expect(deltaByDistance(fastest, fastest)).toEqual([
      { distanceM: 0, deltaMs: 0 },
      { distanceM: 10, deltaMs: 0 },
      { distanceM: 20, deltaMs: 0 },
      { distanceM: 30, deltaMs: 0 },
    ]);
  });

  it("interpolates the Fastest's elapsed time between its samples", () => {
    const lap = [sample(5, 80), sample(14, 120), sample(27, 330)];

    // Fastest at 5 m = 50 ms, 14 m = 140 ms, 27 m = 270 ms
    expect(deltaByDistance(lap, fastest)).toEqual([
      { distanceM: 5, deltaMs: 30 },
      { distanceM: 14, deltaMs: -20 },
      { distanceM: 27, deltaMs: 60 },
    ]);
  });

  it("holds the Fastest's first and last time outside its distance range", () => {
    const lap = [sample(35, 400)];

    expect(deltaByDistance(lap, fastest)).toEqual([{ distanceM: 35, deltaMs: 100 }]);
  });

  it("is empty when the Fastest has no Trace", () => {
    expect(deltaByDistance(fastest, [])).toEqual([]);
  });
});
