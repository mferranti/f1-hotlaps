import { setupGroups } from "./setup-labels";

describe("setupGroups", () => {
  it("keeps the car menus and skips a group with nothing stored", () => {
    const groups = setupGroups({
      frontWing: 8,
      rearWing: 10,
      brakePressure: 80,
      ballast: 4,
      fuelLoad: 10.5,
    });

    expect(groups.map((group) => group.title)).toEqual(["Aerodynamics", "Brakes", "Fuel"]);
    expect(groups[0]?.rows.map((row) => row.label)).toEqual(["Front wing", "Rear wing"]);
    expect(groups[2]?.rows.map((row) => [row.label, row.value])).toEqual([
      ["Ballast", "4"],
      ["Fuel load", "10.50"],
    ]);
  });

  it("fills the bar from the setting's minimum to its maximum", () => {
    const frontWing = setupGroups({ frontWing: 25 })[0]?.rows[0];
    const camber = setupGroups({ frontCamber: -3 })[0]?.rows[0];
    const fuel = setupGroups({ fuelLoad: 5 })[0]?.rows[0];
    const ballast = setupGroups({ ballast: 10 })[0]?.rows[0];

    expect(frontWing?.fill).toBe(0.5);
    expect(frontWing?.min).toBe("0");
    expect(frontWing?.max).toBe("50");
    expect(camber).toMatchObject({ fill: 0.5, min: "-3.5°", max: "-2.5°" });
    expect(fuel).toMatchObject({ fill: 0, min: "5kg", max: "110kg" });
    expect(setupGroups({ onThrottle: 55 })[0]?.rows[0]).toMatchObject({ min: "10%", max: "100%" });
    expect(setupGroups({ fuelLoad: 110 })[0]?.rows[0]?.fill).toBe(1);
    expect(setupGroups({ frontWing: 80 })[0]?.rows[0]?.fill).toBe(1);
    expect(ballast).toMatchObject({ fill: null, min: null, max: null });
  });
});
