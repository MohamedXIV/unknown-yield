import { fixture, validateSimulationContent } from "@site/content";
import { Simulation, auditLedger } from "../src/index";
import { describe, expect, it } from "vitest";

function wreckContent() {
  const draft = structuredClone(fixture);
  const profile = draft.machines.find((m) => m.id === "extractor")!.reliability!;
  profile.integrityLossPerWear = 100;
  profile.damagedBelow = 9700;
  profile.failure = { kind: "jam", integrityAtOrBelow: 9000, minimumStressLoad: 6 };
  profile.wreck = { integrityAtOrBelow: 9500, minimumStressLoad: 7 };
  return validateSimulationContent(draft);
}

function placed(c = wreckContent()) {
  const sim = new Simulation(c);
  const m = sim.command({
    type: "placeMachine", definitionId: "extractor",
    x: 18, y: 36, direction: 0,
  });
  expect(m.ok, m.message).toBe(true);
  const storage = sim.command({
    type: "placeStorage", definitionId: "depot",
    x: 22, y: 36, direction: 0,
  });
  expect(storage.ok, storage.message).toBe(true);
  return { c, sim, machineId: m.id!, storageId: storage.id! };
}

describe("P2d — deterministic, physically conserved machine wreck", () => {
  it("causes a distinct irreparable wreck after an actual high-load batch without losing cargo", () => {
    const { c, sim, machineId, storageId } = placed();
    const before = sim.serialize();
    sim.step(26 * c.tickMs);
    const state = sim.serialize(), machine = sim.snapshot().machines.find(m => m.id === machineId)!;
    expect(machine).toMatchObject({
      status: "wrecked", physicalCondition: "wrecked",
      enabled: false, job: null, output: { raw: 1 },
      mechanicalFailure: { kind: "wreck", observedLoad: "strained" },
      service: { ready: false, reason: "wrecked" },
      salvage: { ready: true, cargoUnits: 1, structuralUnits: 18 },
    });
    expect(state.deposits["veined-field"]).toBe(before.deposits["veined-field"] - 1);
    expect(state.fuel).toBe(before.fuel - 2);
    expect(machine.mechanicalFailure!.atTick).toBe(state.tick);
    const unchanged = sim.serialize();
    for (const cmd of [
      { type: "serviceMachine", machineId },
      { type: "setEnabled", machineId, enabled: true },
      { type: "dismantle", id: machineId },
    ]) {
      expect(sim.preview(cmd).ok).toBe(false);
      expect(sim.command(cmd).ok).toBe(false);
      expect(sim.serialize()).toEqual(unchanged);
    }
    sim.step(100 * c.tickMs);
    expect(sim.serialize().machines[machineId]!.output.raw).toBe(1);
    expect(auditLedger(c, sim.serialize()).ok).toBe(true);
    const saved = sim.serialize();
    const restored = new Simulation(c);
    expect(restored.load(saved).ok).toBe(true);
    expect(restored.snapshot()).toEqual(sim.snapshot());

    const cmd = { type: "salvageMachine", machineId };
    expect(sim.preview(cmd).ok).toBe(true);
    expect(sim.serialize()).toEqual(saved);
    expect(sim.command(cmd).ok).toBe(true);
    const after = sim.serialize();
    expect(after.machines[machineId]).toBeUndefined();
    expect(after.storages[storageId]!.inventory).toMatchObject({ raw: 1, plates: 18 });
    expect(after.stock).toEqual(saved.stock);
    expect(after.flows).toEqual(saved.flows);
    expect(auditLedger(c, after).ok).toBe(true);
    expect(restored.command(cmd).ok).toBe(true);
    sim.step(1200);
    restored.step(1200);
    expect(restored.serialize()).toEqual(sim.serialize());
  });

  it("separates extreme-load wreck from nominal operation and retains ordinary jams", () => {
    const c = wreckContent(), nominal = new Simulation(c);
    const n = nominal.command({
      type: "placeMachine", definitionId: "extractor",
      x: 18, y: 26, direction: 0,
    });
    expect(n.ok).toBe(true);
    nominal.step(21 * c.tickMs);
    expect(nominal.serialize().machines[n.id!]!.mechanicalFailure).toBeNull();
    const jam = structuredClone(c);
    jam.machines.find((m) => m.id === "extractor")!.reliability!.wreck = undefined;
    const j = new Simulation(jam);
    const placed = j.command({ type: "placeMachine", definitionId: "extractor",
      x: 18, y: 36, direction: 0 });
    expect(placed.ok).toBe(true);
    j.step(26 * c.tickMs);
    expect(j.serialize().machines[placed.id!]!.mechanicalFailure?.kind).toBe("jam");
  });

  it("rejects forged wreck save and migrates v31 fault-free", () => {
    const { c, sim, machineId } = placed();
    sim.step(26 * c.tickMs);
    const seed = sim.serialize();
    for (const change of [
      (s: typeof seed) => { s.machines[machineId]!.enabled = true; },
      (s: typeof seed) => { s.machines[machineId]!.integrity = 10000; },
      (s: typeof seed) => { s.machines[machineId]!.mechanicalFailure!.atTick = s.tick + 1; },
      (s: typeof seed) => { s.machines[machineId]!.mechanicalFailure!.kind = "tool-break"; },
      (s: typeof seed) => {
        delete (s.machines[machineId] as Partial<typeof s.machines[string]>).mechanicalFailure;
      },
    ]) {
      const forged = structuredClone(seed);
      change(forged);
      expect(new Simulation(c).load(forged).ok).toBe(false);
    }
    const legacy = structuredClone(seed);
    legacy.schemaVersion = 31;
    legacy.machines[machineId]!.integrity = 10000;
    // v31 already required the nullable fault field. Only kind "wreck" is new.
    legacy.machines[machineId]!.mechanicalFailure = null;
    const migrated = new Simulation(c);
    expect(migrated.load(legacy).ok).toBe(true);
    expect(migrated.serialize().schemaVersion).toBe(32);
    expect(migrated.serialize().machines[machineId]!.mechanicalFailure).toBeNull();
    expect(auditLedger(c, migrated.serialize()).ok).toBe(true);
  });

  it("validates authored wreck thresholds without revealing private numbers", () => {
    const c = wreckContent();
    const invalid = structuredClone(c);
    invalid.machines.find(m => m.id === "extractor")!.reliability!.wreck!.minimumStressLoad = 5;
    expect(() => validateSimulationContent(invalid)).toThrow(/higher stress/);
    const invalid2 = structuredClone(c);
    invalid2.machines.find(m => m.id === "extractor")!.reliability!.wreck!.integrityAtOrBelow = 8000;
    expect(() => validateSimulationContent(invalid2)).toThrow(/earlier integrity/);
    const sim = new Simulation(c);
    const json = JSON.stringify(sim.snapshot());
    for (const prop of ["minimumStressLoad", "integrityAtOrBelow", "reliability"])
      expect(json).not.toContain('"' + prop + '"');
  });
});
