import { renderRouter, screen } from "expo-router/testing-library";

describe("app routes", () => {
  it("opens Main with a Laps history button", async () => {
    renderRouter("./app", { initialUrl: "/" });

    expect(await screen.findByText("Laps history")).toBeOnTheScreen();
    expect(screen.getByText("Config")).toBeOnTheScreen();
  });
});
