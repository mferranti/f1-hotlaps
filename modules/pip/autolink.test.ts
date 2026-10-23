import { execFileSync } from "node:child_process";

function resolve(platform: "ios" | "android"): { packageName: string }[] {
  const raw = execFileSync(
    "pnpm",
    ["exec", "expo-modules-autolinking", "resolve", "--platform", platform, "--json"],
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(raw) as { modules?: { packageName: string }[] };
  return parsed.modules ?? [];
}

describe("pip autolinking", () => {
  it("links the Pip native module on iOS", () => {
    expect(resolve("ios").map((module) => module.packageName)).toContain("pip");
  });

  it("links the Pip native module on Android", () => {
    expect(resolve("android").map((module) => module.packageName)).toContain("pip");
  });
});
