import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import { Simulation } from "@site/sim-core";
import { COLD_TWILIGHT_SITE } from "../game/environment-profile";
import { MAX_LIGHTS, lightPlan } from "../game/lighting";

describe("light plan", () => {
  it("always lights the terminal and nothing else on an empty site", () => {
    const plan = lightPlan(new Simulation(fixture).snapshot(), COLD_TWILIGHT_SITE);
    expect(plan.map((l) => l.kind)).toEqual(["terminal"]);
  });

  it("is derived from state only and is deterministic", () => {
    const s = new Simulation(fixture);
    s.command({ type: "placeMachine", definitionId: "extractor", x: 18, y: 26, direction: 0 });
    const a = lightPlan(s.snapshot(), COLD_TWILIGHT_SITE);
    expect(lightPlan(s.snapshot(), COLD_TWILIGHT_SITE)).toEqual(a);
    // An extractor is not a heat source, so it adds no light.
    expect(a.every((l) => l.kind !== "furnace")).toBe(true);
  });

  it("stays bounded", () => {
    expect(lightPlan(new Simulation(fixture).snapshot(), COLD_TWILIGHT_SITE).length).toBeLessThanOrEqual(MAX_LIGHTS);
  });
});
