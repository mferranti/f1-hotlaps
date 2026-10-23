import { renderRouter, screen } from "expo-router/testing-library";

describe("app routes", () => {
  it("opens Main with a Laps history button", async () => {
    renderRouter("./app", { initialUrl: "/" });

    expect(await screen.findByText("Laps history")).toBeOnTheScreen();
    expect(await screen.findByText("Sessions history")).toBeOnTheScreen();
    expect(screen.getByLabelText("Config")).toBeOnTheScreen();
  });
});
