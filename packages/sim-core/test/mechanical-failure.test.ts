import { fixture, validateSimulationContent } from "@site/content";
import { Simulation, auditLedger } from "../src/index";
import { describe, expect, it } from "vitest";

function contentPack(kind: "jam" | "tool-break" = "jam") {
  const content = structuredClone(fixture);
  const reliability = content.machines.find((m) => m.id === "extractor")!.reliability!;
  reliability.integrityLossPerWear = 100;
  reliability.damagedBelow = 9500;
  reliability.failure = {
    kind, integrityAtOrBelow: 9000, minimumStressLoad: 6,
  };
  return validateSimulationContent(content);
}
function setup(c = contentPack()) {
  const sim = new Simulation(c);
  const m = sim.command({
    type: "placeMachine", definitionId: "extractor",
    x: 18, y: 36, direction: 0,
  });
  expect(m.ok, m.message).toBe(true);
  const store = sim.command({
    type: "placeStorage", definitionId: "depot",
    x: 22, y: 36, direction: 0,
  });
  expect(store.ok, store.message).toBe(true);
  return { sim, machineId: m.id!, storageId: store.id! };
}
function supplyParts(c: typeof fixture, sim: Simulation, storageId: string, units = 2) {
  const state = sim.serialize();
  state.deposits["ferrite-field"] -= units;
  state.storages[storageId]!.inventory.ferrite = units;
  expect(sim.load(state).ok).toBe(true);
  expect(auditLedger(c, sim.serialize()).ok).toBe(true);
}

describe("P2b2 deterministic mechanical failure and physical recovery", () => {
  it("triggers on a completed high-load batch, strands nothing, and prevents restart", () => {
    const c = contentPack(), { sim, machineId } = setup(c);
    const before = sim.serialize();
    sim.step(26 * c.tickMs);
    const m = sim.snapshot().machines.find((m) => m.id === machineId)!;
    expect(m).toMatchObject({
      status: "mechanical-failure", enabled: false, job: null,
      mechanicalFailure: { kind: "jam", observedLoad: "strained" },
      output: { raw: 1 },
      integrity: 7700,
    });
    expect(m.mechanicalFailure?.atTick).toBe(sim.serialize().tick);
    expect(sim.serialize().deposits["veined-field"]).toBe(before.deposits["veined-field"] - 1);
    expect(sim.serialize().fuel).toBe(before.fuel - 2);
    const stranded = sim.serialize();
    const enable = { type: "setEnabled", machineId, enabled: true };
    expect(sim.preview(enable).ok).toBe(false);
    expect(sim.command(enable).ok).toBe(false);
    sim.step(100 * c.tickMs);
    expect(sim.serialize().machines[machineId]!.mechanicalFailure).toEqual(stranded.machines[machineId]!.mechanicalFailure);
    expect(sim.serialize().machines[machineId]!.output).toEqual(stranded.machines[machineId]!.output);
    expect(sim.serialize().fuel).toBe(stranded.fuel);
    expect(auditLedger(c, sim.serialize()).ok).toBe(true);
  });

  it("recovers only by physically paid nearby service, clearing lockout after sufficient repair", () => {
    const c = contentPack(), { sim, machineId, storageId } = setup(c);
    sim.step(26 * c.tickMs);
    const blocked = sim.serialize();
    expect(sim.command({ type: "serviceMachine", machineId }).ok).toBe(false);
    expect(sim.serialize()).toEqual(blocked);
    supplyParts(c, sim, storageId);
    const before = sim.serialize();
    const service = { type: "serviceMachine", machineId };
    expect(sim.snapshot().machines.find((m) => m.id === machineId)!.service?.ready).toBe(true);
    expect(sim.preview(service).ok).toBe(true);
    expect(sim.serialize()).toEqual(before);
    expect(sim.command(service).ok).toBe(true);
    const after = sim.serialize();
    expect(after.machines[machineId]).toMatchObject({
      mechanicalFailure: null, enabled: false, integrity: 10000, wear: 0,
      output: { raw: 1 },
    });
    expect(after.storages[storageId]!.inventory.ferrite ?? 0).toBe(0);
    expect(after.flows.consumed.ferrite).toBe((before.flows.consumed.ferrite ?? 0) + 2);
    expect(sim.command({ type: "setEnabled", machineId, enabled: true }).ok).toBe(true);
    expect(auditLedger(c, sim.serialize()).ok).toBe(true);
    const restored = new Simulation(c);
    expect(restored.load(sim.serialize()).ok).toBe(true);
    sim.step(27 * c.tickMs);
    restored.step(27 * c.tickMs);
    expect(restored.serialize()).toEqual(sim.serialize());
    expect(auditLedger(c, restored.serialize()).ok).toBe(true);
  });

  it("keeps fault persisted and rejects forged unlocked, future or mismatched failure saves", () => {
    const c = contentPack("tool-break"), { sim, machineId } = setup(c);
    sim.step(26 * c.tickMs);
    const state = sim.serialize();
    expect(state.machines[machineId]!.mechanicalFailure?.kind).toBe("tool-break");
    const loaded = new Simulation(c);
    expect(loaded.load(state).ok).toBe(true);
    expect(loaded.snapshot()).toEqual(sim.snapshot());
    const cases = [
      (s: typeof state) => { s.machines[machineId]!.enabled = true; },
      (s: typeof state) => { s.machines[machineId]!.integrity = 10000; },
      (s: typeof state) => { s.machines[machineId]!.mechanicalFailure!.atTick = s.tick + 1; },
      (s: typeof state) => { s.machines[machineId]!.mechanicalFailure!.kind = "jam"; },
      (s: typeof state) => {
        delete (s.machines[machineId] as Partial<typeof s.machines[string]>).mechanicalFailure;
      },
    ];
    for (const corrupt of cases) {
      const s = structuredClone(state);
      corrupt(s);
      expect(new Simulation(c).load(s).ok).toBe(false);
    }
    expect(auditLedger(c, state).ok).toBe(true);
    const legacy = structuredClone(state);
    legacy.schemaVersion = 30;
    legacy.machines[machineId]!.enabled = false;
    legacy.machines[machineId]!.integrity = 10000;
    delete (legacy.machines[machineId] as Partial<typeof legacy.machines[string]>).mechanicalFailure;
    const migrated = new Simulation(c);
    expect(migrated.load(legacy).ok).toBe(true);
    expect(migrated.serialize().schemaVersion).toBe(32);
    expect(migrated.serialize().machines[machineId]!.mechanicalFailure).toBeNull();
  });

  it("is data-authored, skips nominal low-load work and does not leak private thresholds", () => {
    const c = contentPack(), { sim } = setup(c);
    const normal = new Simulation(c);
    const placement = normal.command({
      type: "placeMachine", definitionId: "extractor",
      x: 18, y: 26, direction: 0,
    });
    expect(placement.ok).toBe(true);
    // Degrade Ferrite severely, but its load 3 is below authored failure load 6.
    normal.step(21 * c.tickMs);
    expect(normal.serialize().machines[placement.id!]!.mechanicalFailure).toBeNull();
    sim.step(26 * c.tickMs);
    const json = JSON.stringify(sim.snapshot());
    for (const hidden of ["integrityAtOrBelow", "minimumStressLoad", "reliability", "failure"])
      if (hidden !== "failure") expect(json).not.toContain('"' + hidden + '"');
    const invalid = structuredClone(c);
    invalid.machines.find((m) => m.id === "extractor")!.reliability!.failure!.integrityAtOrBelow = 9800;
    expect(() => validateSimulationContent(invalid)).toThrow(/lower threshold/);
  });
});
