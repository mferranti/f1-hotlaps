import { conditionFromWeather } from "@/domain/condition";

describe("conditionFromWeather", () => {
  it.each([0, 1, 2])("treats clear, light cloud and overcast (%i) as Dry", (weather) => {
    expect(conditionFromWeather(weather)).toBe("dry");
  });

  it.each([3, 4, 5])("treats light rain, heavy rain and storm (%i) as Wet", (weather) => {
    expect(conditionFromWeather(weather)).toBe("wet");
  });
});
