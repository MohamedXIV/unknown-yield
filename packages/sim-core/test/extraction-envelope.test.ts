import { fixture, validateSimulationContent } from "@site/content";
import { Simulation, assessMineralExtraction, auditLedger } from "../src/index";
import { describe, expect, it } from "vitest";

function setup(material: "ferrite" | "raw", content = fixture) {
  const sim = new Simulation(content);
  const placement = sim.command({
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: material === "raw" ? 36 : 26,
    direction: 0,
  });
  expect(placement.ok, placement.message).toBe(true);
  const id = placement.id!;
  return { sim, id, machine: () => sim.snapshot().machines.find((m) => m.id === id)! };
}

describe("P1a mechanical envelope — real material-dependent mineral extraction", () => {
  it("keeps ferrite nominal and runs raw under strain with real fuel and slower batches", () => {
    const soft = setup("ferrite");
    const hard = setup("raw");
    expect(soft.machine()).toMatchObject({
      extractionCompatibility: "nominal", durationTicks: 20, fuelCost: 1,
    });
    expect(hard.machine()).toMatchObject({
      extractionCompatibility: "strained", durationTicks: 25, fuelCost: 2,
    });
    const softFuel = soft.sim.serialize().fuel;
    const hardFuel = hard.sim.serialize().fuel;
    soft.sim.step(fixture.tickMs);
    hard.sim.step(fixture.tickMs);
    expect(soft.sim.serialize().fuel).toBe(softFuel - 1);
    expect(hard.sim.serialize().fuel).toBe(hardFuel - 2);
    expect(soft.machine().job?.remaining).toBe(20);
    expect(hard.machine().job?.remaining).toBe(25);
    hard.sim.step(20 * fixture.tickMs);
    expect(hard.machine().job?.remaining).toBe(5);
    expect(hard.machine().progress).toBeCloseTo(0.8);
    const saved = hard.sim.serialize();
    const restored = new Simulation(fixture);
    expect(restored.load(saved)).toMatchObject({ ok: true });
    hard.sim.step(800);
    restored.step(800);
    expect(restored.serialize()).toEqual(hard.sim.serialize());
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
  });

  it("blocks impossible load without extracting a deposit unit or consuming fuel", () => {
    const alternate = structuredClone(fixture);
    alternate.materials.find((m) => m.id === "raw")!.mechanics = {
      hardness: 10, abrasiveness: 9, brittleness: 0,
    };
    const { sim, machine } = setup("raw", validateSimulationContent(alternate));
    const original = structuredClone(sim.serialize());
    expect(machine()).toMatchObject({
      extractionCompatibility: "impossible",
      status: "material-too-hard",
    });
    sim.step(3000);
    const state = sim.serialize();
    expect(state.deposits).toEqual(original.deposits);
    expect(state.fuel).toBe(original.fuel);
    expect(machine().job).toBeNull();
    expect(machine().output).toEqual({});
  });

  it("changes compatibility from physical traits without material-ID switches", () => {
    const base = structuredClone(fixture);
    const machine = { definitionId: "extractor", depositId: "veined-field" };
    expect(assessMineralExtraction(base, machine).compatibility).toBe("strained");
    base.materials.find((m) => m.id === "raw")!.mechanics = {
      hardness: 3, abrasiveness: 0, brittleness: 2,
    };
    expect(assessMineralExtraction(base, machine).compatibility).toBe("nominal");
    base.materials.find((m) => m.id === "raw")!.mechanics = {
      hardness: 3, abrasiveness: 7, brittleness: 0,
    };
    expect(assessMineralExtraction(base, machine).compatibility).toBe("impossible");
    // New authored material + deposit, same machine resolver; no code switch.
    base.materials.push({
      id: "ore-four", nameKey: "material.ore-four.name",
      color: "#67889a", known: true,
      handlingState: "solid", requiredContainment: [],
      mechanics: { hardness: 5, abrasiveness: 1, brittleness: 2 },
    });
    base.site.deposits.push({
      id: "ore-four-field", material: "ore-four",
      x: 28, y: 43, width: 2, height: 2, units: 30,
    });
    const next = validateSimulationContent(base);
    expect(assessMineralExtraction(next, {
      ...machine, depositId: "ore-four-field",
    }).compatibility).toBe("strained");
    const added = new Simulation(next);
    const result = added.command({
      type: "placeMachine", definitionId: "extractor",
      x: 28, y: 43, direction: 0,
    });
    expect(result.ok, result.message).toBe(true);
    expect(added.snapshot().machines.find((m) => m.id === result.id))
      .toMatchObject({ extractionCompatibility: "strained", durationTicks: 35 });
    added.step(next.tickMs);
    expect(added.serialize().deposits["ore-four-field"]).toBe(29);
    expect(auditLedger(next, added.serialize()).ok).toBe(true);
  });

  it("legacy/unprofiled machines and materials retain the original extraction time and cost", () => {
    const old = structuredClone(fixture);
    delete old.machines.find((m) => m.id === "extractor")!.extractionEnvelope;
    const assessment = assessMineralExtraction(old, {
      definitionId: "extractor", depositId: "veined-field",
    });
    expect(assessment).toMatchObject({
      compatibility: "nominal", durationTicks: 20, fuelCost: 1,
    });
  });
});
