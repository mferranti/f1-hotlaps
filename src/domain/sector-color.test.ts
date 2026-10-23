import { colorSector, sectorColors } from "./sector-color";

describe("colorSector", () => {
  it("is purple when this time is the overall fastest", () => {
    expect(colorSector(25_000, 25_000, 25_000)).toBe("purple");
  });

  it("is green when this time is the Session fastest but not overall", () => {
    expect(colorSector(26_000, 26_000, 25_000)).toBe("green");
  });

  it("is yellow when this time is neither", () => {
    expect(colorSector(27_000, 26_000, 25_000)).toBe("yellow");
  });
});

describe("sectorColors", () => {
  it("colours each sector against Session and overall peers", () => {
    const a = { sessionId: 1, sector1Ms: 27_000, sector2Ms: 28_000, sector3Ms: 30_000 };
    const b = { sessionId: 1, sector1Ms: 26_000, sector2Ms: 27_000, sector3Ms: 29_000 };
    const c = { sessionId: 2, sector1Ms: 24_000, sector2Ms: 27_500, sector3Ms: 28_000 };
    expect(sectorColors(b, [a, b, c])).toEqual({
      sector1: "green",
      sector2: "purple",
      sector3: "green",
    });
    expect(sectorColors(c, [a, b, c]).sector1).toBe("purple");
  });
});
