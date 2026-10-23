import { DEFAULT_PORT, SettingsRepository, validatePort } from "./settings-repository";

class MemoryKv {
  private readonly data = new Map<string, string>();
  async getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe("validatePort", () => {
  it.each([1024, 20777, 65535])("accepts %i", (port) => {
    expect(validatePort(port)).toBe(true);
  });

  it.each([0, 80, 1023, 65536, 20777.5, NaN])("rejects %s", (port) => {
    expect(validatePort(port)).toBe(false);
  });
});

describe("SettingsRepository", () => {
  it("defaults to port 20777, km/h, and °C", async () => {
    expect(await new SettingsRepository(new MemoryKv()).get()).toEqual({
      port: DEFAULT_PORT,
      speedUnit: "kph",
      temperatureUnit: "c",
      traceRetention: "all",
    });
  });

  it("persists a valid port and units", async () => {
    const repo = new SettingsRepository(new MemoryKv());
    await repo.setPort(30000);
    await repo.setSpeedUnit("mph");
    await repo.setTemperatureUnit("f");
    await repo.setTraceRetention("all");
    expect(await repo.get()).toEqual({
      port: 30000,
      speedUnit: "mph",
      temperatureUnit: "f",
      traceRetention: "all",
    });
  });

  it("does not save an invalid port", async () => {
    const repo = new SettingsRepository(new MemoryKv());
    await expect(repo.setPort(80)).rejects.toThrow(RangeError);
    expect((await repo.get()).port).toBe(DEFAULT_PORT);
  });
});
