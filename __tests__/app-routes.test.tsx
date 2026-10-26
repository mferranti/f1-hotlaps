import { renderRouter, screen } from "expo-router/testing-library";

describe("app routes", () => {
  it("opens Main with the latest Laps and Sessions", async () => {
    renderRouter("./app", { initialUrl: "/" });

    expect(await screen.findByText("Latest laps")).toBeOnTheScreen();
    expect(screen.getByText("Latest Sessions")).toBeOnTheScreen();
    expect(screen.getAllByText("See all")).toHaveLength(2);
    expect(screen.getByLabelText("Config")).toBeOnTheScreen();
  });
});
