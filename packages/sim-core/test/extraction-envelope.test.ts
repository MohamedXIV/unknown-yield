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


describe("P1b authored operating modes — command, save and physics parity", () => {
  it("starts steady; force mode is a real fuel/throughput tradeoff", () => {
    const { sim, id, machine } = setup("raw");
    expect(machine().operatingModeId).toBe("steady");
    expect(machine()).toMatchObject({ durationTicks: 25, fuelCost: 2 });
    const before = structuredClone(sim.serialize());
    const set = { type: "setOperatingMode", machineId: id, modeId: "force" };
    expect(sim.preview(set).ok).toBe(true);
    expect(sim.serialize()).toEqual(before);
    expect(sim.command(set).ok).toBe(true);
    expect(machine()).toMatchObject({
      operatingModeId: "force", extractionCompatibility: "nominal",
      durationTicks: 17, fuelCost: 3,
    });
    const fuel = sim.serialize().fuel;
    sim.step(fixture.tickMs);
    expect(sim.serialize().fuel).toBe(fuel - 3);
    expect(machine().job?.remaining).toBe(17);
    expect(sim.preview({ type: "setOperatingMode", machineId: id, modeId: "steady" }).ok)
      .toBe(false);
    const started = structuredClone(sim.serialize());
    expect(sim.command({ type: "setOperatingMode", machineId: id, modeId: "steady" }).ok)
      .toBe(false);
    expect(sim.serialize()).toEqual(started);
    const restored = new Simulation(fixture);
    expect(restored.load(sim.serialize()).ok).toBe(true);
    sim.step(400);
    restored.step(400);
    expect(restored.serialize()).toEqual(sim.serialize());
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
    expect(sim.command({ type: "setOperatingMode", machineId: id, modeId: "imaginary" }).ok)
      .toBe(false);
  });

  it("force mode raises physical hard limit without bypassing greater impossibility", () => {
    const c = structuredClone(fixture);
    c.materials.find((m) => m.id === "raw")!.mechanics = {
      hardness: 5, abrasiveness: 2, brittleness: 1,
    }; // load 11: steady max 10, force max 12
    const { sim, id, machine } = setup("raw", validateSimulationContent(c));
    expect(machine().status).toBe("material-too-hard");
    const untouched = sim.serialize();
    sim.step(1000);
    expect(sim.serialize().deposits).toEqual(untouched.deposits);
    expect(sim.serialize().fuel).toBe(untouched.fuel);
    expect(sim.command({ type: "setOperatingMode", machineId: id, modeId: "force" }).ok)
      .toBe(true);
    expect(machine()).toMatchObject({
      status: "ready", extractionCompatibility: "strained",
      durationTicks: 30, fuelCost: 6,
    });
    sim.step(c.tickMs);
    expect(sim.serialize().fuel).toBe(untouched.fuel - 6);
    expect(auditLedger(c, sim.serialize()).ok).toBe(true);
    const tougher = structuredClone(c);
    tougher.materials.find((m) => m.id === "raw")!.mechanics = {
      hardness: 9, abrasiveness: 3, brittleness: 0,
    };
    expect(assessMineralExtraction(tougher, {
      definitionId: "extractor", depositId: "veined-field", operatingModeId: "force",
    }).compatibility).toBe("impossible");
  });

  it("validates persisted mode identity and migrates schema 27 to the default mode", () => {
    const { sim, id } = setup("raw");
    const saved = sim.serialize();
    expect(saved.schemaVersion).toBe(32);
    const tampered = structuredClone(saved);
    tampered.machines[id]!.operatingModeId = "not-a-mode";
    expect(new Simulation(fixture).load(tampered).ok).toBe(false);
    const missing = structuredClone(saved);
    delete (missing.machines[id] as Partial<typeof missing.machines[string]>).operatingModeId;
    expect(new Simulation(fixture).load(missing).ok).toBe(false);
    const legacy = structuredClone(saved);
    legacy.schemaVersion = 27;
    delete (legacy.machines[id] as Partial<typeof legacy.machines[string]>).operatingModeId;
    const loaded = new Simulation(fixture);
    expect(loaded.load(legacy).ok).toBe(true);
    expect(loaded.serialize().schemaVersion).toBe(32);
    expect(loaded.snapshot().machines.find((m) => m.id === id)!.operatingModeId).toBe("steady");
    expect(auditLedger(fixture, loaded.serialize()).ok).toBe(true);
  });
});
