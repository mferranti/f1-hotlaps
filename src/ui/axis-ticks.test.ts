import { axisTicks } from "./axis-ticks";

describe("axisTicks", () => {
  it("includes both ends", () => {
    expect(axisTicks(0, 100, 5)).toEqual([0, 25, 50, 75, 100]);
  });

  it("repeats a single value when the span is zero", () => {
    expect(axisTicks(10, 10, 3)).toEqual([10, 10, 10]);
  });
});
