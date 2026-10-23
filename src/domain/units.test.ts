import { formatSpeed, formatTemperature } from "@/domain/units";

describe("formatSpeed", () => {
  it("shows stored km/h as km/h", () => {
    expect(formatSpeed(312.4, "kph")).toBe("312 km/h");
  });

  it("converts km/h to mph", () => {
    // 100 km/h = 62.137 mph
    expect(formatSpeed(100, "mph")).toBe("62 mph");
    expect(formatSpeed(320, "mph")).toBe("199 mph");
  });
});

describe("formatTemperature", () => {
  it("shows stored °C as °C", () => {
    expect(formatTemperature(31.6, "c")).toBe("32 °C");
  });

  it("converts °C to °F", () => {
    expect(formatTemperature(0, "f")).toBe("32 °F");
    expect(formatTemperature(30, "f")).toBe("86 °F");
    expect(formatTemperature(-5, "f")).toBe("23 °F");
  });
});
