import Storage from "expo-sqlite/kv-store";
import { cleanup, renderRouter, screen, testRouter } from "expo-router/testing-library";

import { setLapRepository } from "@/capture/runtime";
import type { CompletedLap, SessionInfo } from "@/domain/types";
import { MemoryLapRepository } from "@/storage/memory-lap-repository";
import { SettingsRepository } from "@/storage/settings-repository";

jest.mock("expo-sqlite/kv-store", () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: (key: string) => Promise.resolve(store.get(key) ?? null),
      setItem: (key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve();
      },
    },
  };
});

jest.mock("@/capture/runtime", () => {
  const actual = jest.requireActual<typeof import("@/capture/runtime")>("@/capture/runtime");
  return {
    ...actual,
    startRuntime: () => Promise.resolve(),
  };
});

const oct26 = new Date(2026, 9, 26, 15, 4).getTime();

describe("metric system on the Lap screen", () => {
  let lapId = 0;

  beforeEach(async () => {
    const repo = new MemoryLapRepository();
    lapId = await repo.commitLap(lap({ finishedAt: oct26 }));
    setLapRepository(repo);
    const settings = new SettingsRepository(Storage);
    await settings.setSpeedUnit("kph");
    await settings.setTemperatureUnit("c");
  });

  afterEach(() => {
    cleanup();
  });

  it("shows km/h and °C until Config switches to mph and °F", async () => {
    renderRouter("./app", { initialUrl: `/laps/${lapId}` });

    expect(await screen.findByText("Track 30 °C · air 0 °C")).toBeOnTheScreen();
    expect(screen.getByText("Speed (km/h)")).toBeOnTheScreen();

    const settings = new SettingsRepository(Storage);
    await settings.setSpeedUnit("mph");
    await settings.setTemperatureUnit("f");
    testRouter.push("/config");
    testRouter.back(`/laps/${lapId}`);

    expect(await screen.findByText("Track 86 °F · air 32 °F")).toBeOnTheScreen();
    expect(screen.getByText("Speed (mph)")).toBeOnTheScreen();
  });

  it("shows lap dates as mm/dd/yy when speed is mph and temperature is °F", async () => {
    const settings = new SettingsRepository(Storage);
    await settings.setSpeedUnit("mph");
    await settings.setTemperatureUnit("f");

    renderRouter("./app", { initialUrl: "/laps" });

    expect(await screen.findByText("10/26/26")).toBeOnTheScreen();
  });

  it("shows lap dates as dd/mm/yy on the metric system", async () => {
    renderRouter("./app", { initialUrl: "/laps" });

    expect(await screen.findByText("26/10/26")).toBeOnTheScreen();
  });
});

function lap(overrides: Partial<CompletedLap> = {}): CompletedLap {
  return {
    session: info(),
    lapNumber: 1,
    lapTimeMs: 90_000,
    sector1Ms: 25_000,
    sector2Ms: 27_000,
    sector3Ms: 29_000,
    valid: true,
    invalidReason: null,
    condition: "dry",
    teamId: 8,
    tyreCompound: 16,
    visualTyreCompound: 0,
    tyreAgeLaps: 0,
    trackTempC: 30,
    airTempC: 0,
    setup: {},
    finishedAt: oct26,
    trace: [
      { distanceM: 0, throttle: 1, brake: 0, speedKph: 100, elapsedMs: 0, gear: 4, drs: 0, ers: 0 },
      { distanceM: 10, throttle: 1, brake: 0, speedKph: 200, elapsedMs: 1_000, gear: 5, drs: 0, ers: 0 },
    ],
    ...overrides,
  };
}

function info(): SessionInfo {
  return {
    game: "f1-26",
    sessionUid: "1",
    trackId: 11,
    sessionType: 18,
    gameMode: 5,
    aiDifficulty: -1,
    gridPosition: 0,
    pitStops: 0,
  };
}
