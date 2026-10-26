import { axisTicks, centeredDomain } from "./axis-ticks";

describe("centeredDomain", () => {
  it("puts 0 in the middle and keeps the larger end", () => {
    expect(centeredDomain(-20, 80)).toEqual({ min: -80, max: 80 });
    expect(centeredDomain(0, 0)).toEqual({ min: -1, max: 1 });
  });
});

describe("axisTicks", () => {
  it("includes both ends", () => {
    expect(axisTicks(0, 100, 5)).toEqual([0, 25, 50, 75, 100]);
  });

  it("repeats a single value when the span is zero", () => {
    expect(axisTicks(10, 10, 3)).toEqual([10, 10, 10]);
  });
});
