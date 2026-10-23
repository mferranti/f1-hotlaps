import { tracedLaps } from "@/domain/trace-retention";

describe("tracedLaps", () => {
  it("has neither Fastest nor Latest for an empty group", () => {
    expect(tracedLaps([])).toEqual({ fastestId: null, latestId: null });
  });

  it("follows the walkthrough as Laps A, B, C, D are committed", () => {
    const a = { id: 1, lapTimeMs: 82_000, finishedAt: 1_000 };
    const b = { id: 2, lapTimeMs: 83_000, finishedAt: 2_000 };
    const c = { id: 3, lapTimeMs: 81_000, finishedAt: 3_000 };
    const d = { id: 4, lapTimeMs: 81_000, finishedAt: 4_000 };

    expect(tracedLaps([a])).toEqual({ fastestId: 1, latestId: null });
    expect(tracedLaps([a, b])).toEqual({ fastestId: 1, latestId: 2 });
    expect(tracedLaps([a, b, c])).toEqual({ fastestId: 3, latestId: 2 });
    expect(tracedLaps([a, b, c, d])).toEqual({ fastestId: 3, latestId: 4 });
  });

  it("keeps the earlier Lap Fastest on a tie regardless of input order", () => {
    const later = { id: 7, lapTimeMs: 90_000, finishedAt: 5_000 };
    const earlier = { id: 8, lapTimeMs: 90_000, finishedAt: 1_000 };

    expect(tracedLaps([later, earlier])).toEqual({ fastestId: 8, latestId: 7 });
  });
});
