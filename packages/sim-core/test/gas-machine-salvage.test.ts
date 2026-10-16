import { fixture, validateSimulationContent } from "@site/content";
import { Simulation, auditLedger } from "../src/index";
import { describe, expect, it } from "vitest";

function gasWorld() {
  const draft = structuredClone(fixture);
  // Test-only gas-phase extracted ore. Service Ferrite remains physically solid.
  draft.materials.find((m) => m.id === "raw")!.handlingState = "gas";
  for (const def of draft.machines) {
    def.inputStates = ["solid", "liquid", "gas"];
    def.outputStates = ["solid", "liquid", "gas"];
  }
  const profile = draft.machines.find((m) => m.id === "extractor")!.reliability!;
  profile.integrityLossPerWear = 100;
  profile.damagedBelow = 9700;
  profile.failure = { kind: "jam", integrityAtOrBelow: 9000, minimumStressLoad: 6 };
  profile.wreck = { integrityAtOrBelow: 9500, minimumStressLoad: 7 };
  return validateSimulationContent(draft);
}
function rig(withVessel = true) {
  const c = gasWorld(), sim = new Simulation(c);
  const machine = sim.command({ type: "placeMachine", definitionId: "extractor",
    x: 18, y: 36, direction: 0 });
  const storage = sim.command({ type: "placeStorage", definitionId: "depot",
    x: 22, y: 36, direction: 0 });
  const vessel = withVessel ? sim.command({
    type: "placePressureVessel", x: 22, y: 40, direction: 0,
  }) : null;
  expect(machine.ok && storage.ok && (!vessel || vessel.ok)).toBe(true);
  sim.step(26 * c.tickMs);
  expect(sim.snapshot().machines.find((m) => m.id === machine.id))
    .toMatchObject({ status: "wrecked", output: { raw: 1 } });
  return { c, sim, machineId: machine.id!, storeId: storage.id!, vesselId: vessel?.id };
}

describe("P2g — local, actual pressure-vessel gas salvage", () => {
  it("atomically splits gas and structure into their correct real physical containers", () => {
    const { c, sim, machineId, storeId, vesselId } = rig();
    const view = sim.snapshot().machines.find(m => m.id === machineId)!.salvage;
    expect(view).toMatchObject({ ready: true, gasUnits: 1, liquidUnits: 0,
      cargoUnits: 1, structuralUnits: 18 });
    const prior = sim.serialize(), cmd = { type: "salvageMachine", machineId };
    expect(sim.preview(cmd).ok).toBe(true);
    expect(sim.serialize()).toEqual(prior);
    expect(sim.command(cmd).ok).toBe(true);
    const done = sim.serialize();
    expect(done.machines[machineId]).toBeUndefined();
    expect(done.storages[storeId]!.inventory).toMatchObject({ plates: 18 });
    expect(done.storages[storeId]!.inventory.raw ?? 0).toBe(0);
    expect(done.pressureVessels[vesselId!]).toMatchObject({
      materialId: "raw", quantity: 1,
    });
    expect(done.stock).toEqual(prior.stock);
    expect(done.flows).toEqual(prior.flows);
    expect(auditLedger(c, done).ok).toBe(true);
    const replay = new Simulation(c);
    expect(replay.load(done).ok).toBe(true);
    sim.step(1100); replay.step(1100);
    expect(replay.serialize()).toEqual(sim.serialize());
  });

  it("refuses without a nearby vessel, even if the solid store is adequate", () => {
    const { c, sim, machineId } = rig(false);
    const cmd = { type: "salvageMachine", machineId };
    expect(sim.snapshot().machines.find(m => m.id === machineId)!.salvage)
      .toMatchObject({ ready: false, reason: "no-local-vessel", gasUnits: 1 });
    const before = sim.serialize();
    expect(sim.preview(cmd).ok).toBe(false);
    expect(sim.command(cmd).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
    const remote = sim.command({
      type: "placePressureVessel", x: 32, y: 9, direction: 0,
    });
    expect(remote.ok).toBe(true);
    expect(sim.command(cmd).ok).toBe(false);
    expect(auditLedger(c, sim.serialize()).ok).toBe(true);
  });

  it("rejects a physically full local vessel atomically", () => {
    const { c, sim, machineId, vesselId } = rig();
    const filled = sim.serialize();
    const amount = c.gasLogistics!.vessel.capacity;
    // Move real ore from the actual deposit into the vessel.
    filled.deposits["veined-field"] -= amount;
    filled.pressureVessels[vesselId!]!.materialId = "raw";
    filled.pressureVessels[vesselId!]!.quantity = amount;
    expect(sim.load(filled).ok).toBe(true);
    const before = sim.serialize(), cmd = { type: "salvageMachine", machineId };
    expect(sim.snapshot().machines.find(m => m.id === machineId)!.salvage)
      .toMatchObject({ ready: false, reason: "gas-capacity" });
    expect(sim.preview(cmd).ok).toBe(false);
    expect(sim.command(cmd).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
    expect(auditLedger(c, before).ok).toBe(true);
  });

  it("does not leak material-specific gas containment requirements to public readiness", () => {
    const c = gasWorld(), sim = new Simulation(c);
    expect(JSON.stringify(sim.snapshot())).not.toContain('"reliability"');
    expect(JSON.stringify(sim.snapshot())).not.toContain('"minimumStressLoad"');
  });
});
