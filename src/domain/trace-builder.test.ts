import { TraceBuilder } from "@/domain/trace-builder";

function input(lapDistanceM: number, elapsedMs: number) {
  return { lapDistanceM, throttle: 0.5, brake: 0, speedKph: 200, elapsedMs, gear: 4, drs: 0, ers: 1 };
}

describe("TraceBuilder", () => {
  it("keeps the first reading in each 10 m bucket", () => {
    const builder = new TraceBuilder();
    builder.add(input(0.4, 10));
    builder.add(input(4, 70));
    builder.add(input(10.2, 190));
    builder.add(input(19.9, 360));
    builder.add(input(21, 380));

    expect(builder.samples()).toEqual([
      { distanceM: 0.4, throttle: 0.5, brake: 0, speedKph: 200, elapsedMs: 10, gear: 4, drs: 0, ers: 1 },
      { distanceM: 10.2, throttle: 0.5, brake: 0, speedKph: 200, elapsedMs: 190, gear: 4, drs: 0, ers: 1 },
      { distanceM: 21, throttle: 0.5, brake: 0, speedKph: 200, elapsedMs: 380, gear: 4, drs: 0, ers: 1 },
    ]);
  });

  it("ignores readings before the start line (negative distance)", () => {
    const builder = new TraceBuilder();
    builder.add(input(-35, 0));
    builder.add(input(-2, 5));
    builder.add(input(3, 50));

    expect(builder.samples().map((s) => s.distanceM)).toEqual([3]);
  });

  it("skips buckets the car passed without a reading and never goes back", () => {
    const builder = new TraceBuilder();
    builder.add(input(5, 0));
    builder.add(input(42, 500));
    builder.add(input(30, 520));

    expect(builder.samples().map((s) => s.distanceM)).toEqual([5, 42]);
  });

  it("uses a custom bucket size", () => {
    const builder = new TraceBuilder(50);
    builder.add(input(0, 0));
    builder.add(input(40, 400));
    builder.add(input(55, 550));

    expect(builder.samples().map((s) => s.distanceM)).toEqual([0, 55]);
  });

  it("returns a copy that later readings do not change", () => {
    const builder = new TraceBuilder();
    builder.add(input(0, 0));
    const snapshot = builder.samples();
    builder.add(input(15, 150));

    expect(snapshot).toHaveLength(1);
  });
});
