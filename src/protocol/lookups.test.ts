import { gameModeName } from "./game-modes";
import { tyreCompoundName, tyreKind } from "./tyres";
import { isRaceSession, sessionTypeName } from "./session-types";
import { MY_TEAM_ID, recordedTeamId, teamName } from "./teams";
import { trackFlag, trackLabel, trackName } from "./tracks";

describe("tyreCompoundName", () => {
  it("names an F1 compound and keeps an unknown id", () => {
    expect(tyreCompoundName(16)).toBe("C5");
    expect(tyreCompoundName(7)).toBe("Intermediate");
    expect(tyreCompoundName(3)).toBe("Compound 3");
  });

  it("uses the visual type, then the compound", () => {
    expect(tyreKind(16, 20)).toBe("soft");
    expect(tyreKind(17, 16)).toBe("medium");
    expect(tyreKind(18, 16)).toBe("hard");
    expect(tyreKind(7, 16)).toBe("intermediate");
    expect(tyreKind(8, 16)).toBe("wet");
    expect(tyreKind(0, 16)).toBe("soft");
    expect(tyreKind(0, 13)).toBe("medium");
    expect(tyreKind(0, 14)).toBe("hard");
    expect(tyreKind(0, 7)).toBe("intermediate");
    expect(tyreKind(0, 8)).toBe("wet");
    expect(tyreKind(0, 3)).toBeNull();
  });
});

describe("trackName", () => {
  it("names known tracks from the Season 8 appendix", () => {
    expect(trackName(11)).toBe("Monza");
    expect(trackName(42)).toBe("Madrid");
  });

  it("labels an unknown id", () => {
    expect(trackName(99)).toBe("Unknown (id 99)");
  });
});

describe("trackLabel", () => {
  it("prefixes the country flag", () => {
    expect(trackFlag(11)).toBe("🇮🇹");
    expect(trackLabel(11)).toBe("🇮🇹 Monza");
  });
});

describe("recordedTeamId", () => {
  it("stores My F1 Team from m_myTeam or the Custom Team id, not Mercedes", () => {
    expect(recordedTeamId({ teamId: 0, myTeam: true })).toBe(MY_TEAM_ID);
    expect(recordedTeamId({ teamId: 104, myTeam: false })).toBe(MY_TEAM_ID);
    expect(recordedTeamId({ teamId: 221, myTeam: false })).toBe(MY_TEAM_ID);
    expect(recordedTeamId({ teamId: 8, myTeam: false })).toBe(8);
    expect(recordedTeamId({ teamId: 0, myTeam: false })).toBe(0);
  });
});

describe("teamName", () => {
  it("names a works team and a missing team", () => {
    expect(teamName(8)).toBe("McLaren");
    expect(teamName(255)).toBe("No team");
    expect(teamName(65_535)).toBe("No team");
  });

  it("names My F1 Team, Alpine, and Ferrari from the Season 8 appendix", () => {
    expect(teamName(104)).toBe("My F1 Team");
    expect(teamName(5)).toBe("Alpine");
    expect(teamName(1)).toBe("Ferrari");
    expect(teamName(481)).toBe("Alpine");
    expect(teamName(477)).toBe("Ferrari");
    expect(teamName(221)).toBe("My F1 Team");
    expect(teamName(220)).toBe("Mercedes");
  });
});

describe("gameModeName", () => {
  it("names Time Trial and Grand Prix from live Session Packets", () => {
    expect(gameModeName(2)).toBe("Time Trial");
    expect(gameModeName(1)).toBe("Grand Prix");
    expect(gameModeName(5)).toBe("Time Trial");
  });

  it("shows a dash when the appendix has no name", () => {
    expect(gameModeName(99)).toBe("-");
  });
});

describe("sessionTypeName", () => {
  it("names known session types from the Season 8 appendix", () => {
    expect(sessionTypeName(15)).toBe("Race");
    expect(sessionTypeName(18)).toBe("Time Trial");
  });

  it("labels an unknown id", () => {
    expect(sessionTypeName(40)).toBe("Unknown (id 40)");
  });

  it("treats Race ids as Race Sessions", () => {
    expect(isRaceSession(15)).toBe(true);
    expect(isRaceSession(18)).toBe(false);
  });
});
