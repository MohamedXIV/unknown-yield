import { fixture, validateSimulationContent } from "@site/content";
import { Simulation, auditLedger } from "../src/index";
import { describe, expect, it } from "vitest";

function wetWorld() {
  const draft = structuredClone(fixture);
  // A test-only material-phase variant: preserve all authored reactions and
  // the Ferrite service part's solid identity.
  draft.materials.find((m) => m.id === "raw")!.handlingState = "liquid";
  for (const definition of draft.machines) {
    definition.inputStates = ["solid", "liquid", "gas"];
    definition.outputStates = ["solid", "liquid", "gas"];
  }
  const profile = draft.machines.find((m) => m.id === "extractor")!.reliability!;
  profile.integrityLossPerWear = 100;
  profile.damagedBelow = 9700;
  profile.failure = { kind: "jam", integrityAtOrBelow: 9000, minimumStressLoad: 6 };
  profile.wreck = { integrityAtOrBelow: 9500, minimumStressLoad: 7 };
  return validateSimulationContent(draft);
}
function rig(withTank = true) {
  const c = wetWorld(), sim = new Simulation(c);
  const machine = sim.command({ type: "placeMachine", definitionId: "extractor",
    x: 18, y: 36, direction: 0 });
  const storage = sim.command({ type: "placeStorage", definitionId: "depot",
    x: 22, y: 36, direction: 0 });
  const tank = withTank ? sim.command({ type: "placeTank",
    x: 22, y: 40, direction: 0, containmentProfileId: "standard" }) : null;
  expect(machine.ok && storage.ok && (!tank || tank.ok)).toBe(true);
  sim.step(26 * c.tickMs);
  expect(sim.snapshot().machines.find(m => m.id === machine.id))
    .toMatchObject({ status: "wrecked", output: { raw: 1 } });
  return { c, sim, machineId: machine.id!, storeId: storage.id!, tankId: tank?.id };
}

describe("P2f — physically compatible liquid and solid salvage destinations", () => {
  it("atomically splits recovered liquid into a local tank and structure into local storage", () => {
    const { c, sim, machineId, storeId, tankId } = rig();
    const observed = sim.snapshot().machines.find(m => m.id === machineId)!;
    expect(observed.salvage).toMatchObject({
      ready: true, cargoUnits: 1, liquidUnits: 1, structuralUnits: 18,
    });
    const prior = sim.serialize(), cmd = { type: "salvageMachine", machineId };
    expect(sim.preview(cmd).ok).toBe(true);
    expect(sim.serialize()).toEqual(prior);
    expect(sim.command(cmd).ok).toBe(true);
    const saved = sim.serialize();
    expect(saved.machines[machineId]).toBeUndefined();
    expect(saved.storages[storeId]!.inventory).toMatchObject({ plates: 18 });
    expect(saved.storages[storeId]!.inventory.raw ?? 0).toBe(0);
    expect(saved.tanks[tankId!]).toMatchObject({ materialId: "raw", quantity: 1 });
    expect(saved.stock).toEqual(prior.stock);
    expect(saved.flows).toEqual(prior.flows);
    expect(auditLedger(c, saved).ok).toBe(true);
    const loaded = new Simulation(c);
    expect(loaded.load(saved).ok).toBe(true);
    loaded.step(2000); sim.step(2000);
    expect(loaded.serialize()).toEqual(sim.serialize());
  });

  it("rejects salvage atomically without a local tank, including remote tanks", () => {
    const { c, sim, machineId } = rig(false);
    const cmd = { type: "salvageMachine", machineId };
    expect(sim.snapshot().machines.find(m => m.id === machineId)!.salvage)
      .toMatchObject({ ready: false, reason: "no-local-tank", liquidUnits: 1 });
    const before = sim.serialize();
    expect(sim.preview(cmd).ok).toBe(false);
    expect(sim.command(cmd).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
    const remote = sim.command({ type: "placeTank",
      x: 32, y: 9, direction: 0 });
    expect(remote.ok).toBe(true);
    expect(sim.command(cmd).ok).toBe(false);
    expect(auditLedger(c, sim.serialize()).ok).toBe(true);
  });

  it("rejects full local tank, even if solid storage can fit all cargo", () => {
    const { c, sim, machineId, tankId } = rig();
    const filled = sim.serialize();
    // Reserve an additional 64 real ore units into the vessel from its
    // existing tracked source (not a magic fixture inventory creation).
    filled.deposits["veined-field"] -= c.liquidLogistics!.tank.capacity;
    filled.tanks[tankId!]!.materialId = "raw";
    filled.tanks[tankId!]!.quantity = c.liquidLogistics!.tank.capacity;
    expect(sim.load(filled).ok).toBe(true);
    const before = sim.serialize(), cmd = { type: "salvageMachine", machineId };
    expect(sim.snapshot().machines.find(m => m.id === machineId)!.salvage)
      .toMatchObject({ ready: false, reason: "liquid-capacity" });
    expect(sim.preview(cmd).ok).toBe(false);
    expect(sim.command(cmd).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
    expect(auditLedger(c, before).ok).toBe(true);
  });

  it("routes gas to pressure-vessel eligibility instead of a liquid tank", () => {
    const { c, sim, machineId } = rig();
    const state = sim.serialize();
    // A real emitted raw unit is still present, but authoring now defines it
    // as a gas in a separate valid content variant.
    const variant = structuredClone(c);
    variant.materials.find(m => m.id === "raw")!.handlingState = "gas";
    const gasWorld = validateSimulationContent(variant);
    const gas = new Simulation(gasWorld);
    expect(gas.load(state).ok).toBe(true);
    const before = gas.serialize();
    expect(gas.snapshot().machines.find(m => m.id === machineId)!.salvage)
      .toMatchObject({ ready: false, reason: "no-local-vessel", gasUnits: 1 });
    expect(gas.command({ type: "salvageMachine", machineId }).ok).toBe(false);
    expect(gas.serialize()).toEqual(before);
  });
});
