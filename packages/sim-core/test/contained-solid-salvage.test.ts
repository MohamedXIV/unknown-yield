import { fixture, validateSimulationContent } from "@site/content";
import { Simulation, auditLedger } from "../src/index";
import { describe, expect, it } from "vitest";

function containedWorld(protectedStore: boolean) {
  const draft = structuredClone(fixture);
  const raw = draft.materials.find((m) => m.id === "raw")!;
  raw.requiredContainment = ["hazard-isolated"];
  // The test machine is explicitly rated to keep this physical ore in its buffer.
  draft.machines.find((m) => m.id === "extractor")!.outputContainment = ["hazard-isolated"];
  draft.storages.find((s) => s.id === "depot")!.containmentCapabilities =
    protectedStore ? ["hazard-isolated"] : [];
  const profile = draft.machines.find((m) => m.id === "extractor")!.reliability!;
  profile.integrityLossPerWear = 100;
  profile.damagedBelow = 9700;
  profile.failure = { kind: "jam", integrityAtOrBelow: 9000, minimumStressLoad: 6 };
  profile.wreck = { integrityAtOrBelow: 9500, minimumStressLoad: 7 };
  return validateSimulationContent(draft);
}
function prepared(protectedStore: boolean) {
  const c = containedWorld(protectedStore), sim = new Simulation(c);
  const m = sim.command({ type: "placeMachine", definitionId: "extractor",
    x: 18, y: 36, direction: 0 });
  expect(m.ok, m.message).toBe(true);
  const s = sim.command({ type: "placeStorage", definitionId: "depot",
    x: 22, y: 36, direction: 0 });
  expect(s.ok, s.message).toBe(true);
  sim.step(26 * c.tickMs);
  expect(sim.snapshot().machines.find(row => row.id === m.id)).toMatchObject({
    status: "wrecked", output: { raw: 1 },
  });
  return { c, sim, machineId: m.id!, storageId: s.id! };
}

describe("P2e: contained solid salvage honors actual local storage capabilities", () => {
  it("rejects ordinary nearby storage without exposing exact containment requirements", () => {
    const { c, sim, machineId } = prepared(false);
    const eligibility = sim.snapshot().machines.find(m => m.id === machineId)!.salvage;
    expect(eligibility).toMatchObject({ ready: false, reason: "missing-containment" });
    const cmd = { type: "salvageMachine", machineId };
    const before = sim.serialize();
    expect(sim.preview(cmd).ok).toBe(false);
    expect(sim.command(cmd).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
    expect(JSON.stringify(eligibility)).not.toContain("hazard-isolated");
    expect(auditLedger(c, sim.serialize()).ok).toBe(true);
  });

  it("moves protected ore and embodied structure intact into rated nearby storage", () => {
    const { c, sim, machineId, storageId } = prepared(true);
    expect(sim.snapshot().machines.find(m => m.id === machineId)!.salvage)
      .toMatchObject({ ready: true, reason: null, cargoUnits: 1, structuralUnits: 18 });
    const before = sim.serialize(), cmd = { type: "salvageMachine", machineId };
    expect(sim.preview(cmd).ok).toBe(true);
    expect(sim.serialize()).toEqual(before);
    expect(sim.command(cmd).ok).toBe(true);
    const after = sim.serialize();
    expect(after.machines[machineId]).toBeUndefined();
    expect(after.storages[storageId]!.inventory).toMatchObject({ raw: 1, plates: 18 });
    expect(after.stock).toEqual(before.stock);
    expect(after.flows).toEqual(before.flows);
    expect(auditLedger(c, after).ok).toBe(true);
    const loaded = new Simulation(c);
    expect(loaded.load(after).ok).toBe(true);
    sim.step(1000);
    loaded.step(1000);
    expect(loaded.serialize()).toEqual(sim.serialize());
  });

  it("chooses a rated local store over an earlier unprotected store", () => {
    const content = structuredClone(containedWorld(false));
    content.storages.push({
      ...content.storages[0]!,
      id: "sealed-depot", nameKey: "storage.sealed-depot.name",
      containmentCapabilities: ["hazard-isolated"],
    });
    const c = validateSimulationContent(content), sim = new Simulation(c);
    const m = sim.command({ type: "placeMachine", definitionId: "extractor",
      x: 18, y: 36, direction: 0 });
    const unprotected = sim.command({ type: "placeStorage", definitionId: "depot",
      x: 22, y: 36, direction: 0 });
    const protectedStorage = sim.command({ type: "placeStorage",
      definitionId: "sealed-depot", x: 22, y: 40, direction: 0 });
    expect(m.ok && unprotected.ok && protectedStorage.ok).toBe(true);
    sim.step(26 * c.tickMs);
    expect(sim.command({ type: "salvageMachine", machineId: m.id! }).ok).toBe(true);
    expect(sim.serialize().storages[unprotected.id!]!.inventory).toEqual({});
    expect(sim.serialize().storages[protectedStorage.id!]!.inventory)
      .toMatchObject({ raw: 1, plates: 18 });
    expect(auditLedger(c, sim.serialize()).ok).toBe(true);
  });
});
