import { describe, expect, it } from "vitest";
import { siteChoices } from "@site/content/sites";
import { Simulation } from "../src/index";

const site52 = siteChoices().find((c) => c.id === "harmony-terrace")!.bundle!.content;

describe("Site 52 plays as a real site", () => {
  it("starts with its own deposits and stock", () => {
    const s = new Simulation(site52);
    const snap = s.snapshot();
    expect(snap.deposits.map((d) => d.id).sort()).toEqual(
      ["far-veins", "harmony-ferrite", "lower-ferrite", "salt-cap", "white-veins"],
    );
    expect(snap.stock.plates).toBe(site52.site.startStock);
  });
  it("extracts and conveys ferrite from its own field", () => {
    const s = new Simulation(site52);
    const placed = s.command({ type: "placeMachine", definitionId: "extractor", x: 12, y: 22, direction: 0 });
    expect(placed.ok, placed.message).toBe(true);
    const belts = s.command({
      type: "placeBelts",
      points: [{ x: 14, y: 23 }, { x: 15, y: 23 }, { x: 16, y: 23 }],
      direction: 0,
    });
    expect(belts.ok, belts.message).toBe(true);
    s.step(30000);
    expect(s.serialize().deposits["harmony-ferrite"]).toBeLessThan(2400);
  });
  it("round-trips a save of its own world", () => {
    const s = new Simulation(site52);
    s.step(1000);
    const copy = new Simulation(site52);
    expect(copy.load(s.serialize()).ok).toBe(true);
  });
});
