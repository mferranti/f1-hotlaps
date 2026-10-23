import { landscapeFrame } from "./landscape-frame";

describe("landscapeFrame", () => {
  it("leaves an already landscape window alone", () => {
    expect(landscapeFrame(800, 360)).toEqual({ rotated: false, width: 800, height: 360, left: 0, top: 0 });
  });

  it("rotates a portrait window into landscape", () => {
    expect(landscapeFrame(360, 800)).toEqual({
      rotated: true,
      width: 800,
      height: 360,
      left: (360 - 800) / 2,
      top: (800 - 360) / 2,
    });
  });
});
