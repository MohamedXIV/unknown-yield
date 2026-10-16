import { fixture, validateSimulationContent } from "@site/content";
import { Simulation, auditLedger } from "../src/index";
import { describe, expect, it } from "vitest";

function site() {
  const sim = new Simulation(fixture);
  const machine = sim.command({
    type: "placeMachine", definitionId: "extractor",
    x: 18, y: 26, direction: 0,
  });
  expect(machine.ok, machine.message).toBe(true);
  const depot = sim.command({
    type: "placeStorage", definitionId: "depot",
    x: 22, y: 26, direction: 0,
  });
  expect(depot.ok, depot.message).toBe(true);
  return { sim, machineId: machine.id!, depotId: depot.id! };
}

function localParts(sim: Simulation, depotId: string, units: number) {
  const pre = sim.serialize();
  // Test precondition: a real physical cache was delivered from this deposit.
  // This deliberately moves material between tracked locations, not a free grant.
  pre.deposits["ferrite-field"] -= units;
  pre.storages[depotId]!.inventory.ferrite = units;
  expect(sim.load(pre).ok).toBe(true);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
}

describe("P2c1 — conservation-safe, nearby machine service", () => {
  it("consumes local stored parts only and restores wear/integrity with exact ledger provenance", () => {
    const { sim, machineId, depotId } = site();
    localParts(sim, depotId, 2);
    const disabled = sim.command({
      type: "setEnabled", machineId, enabled: false,
    });
    expect(disabled.ok).toBe(true);
    const damaged = sim.serialize();
    damaged.machines[machineId]!.integrity = 7000;
    damaged.machines[machineId]!.wear = 200;
    expect(sim.load(damaged).ok).toBe(true);
    const view = sim.snapshot().machines.find((m) => m.id === machineId)!;
    expect(view.service).toMatchObject({
      materialId: "ferrite", units: 2, availableUnits: 2,
      ready: true, reason: null,
    });
    const command = { type: "serviceMachine", machineId };
    const before = sim.serialize();
    expect(sim.preview(command).ok).toBe(true);
    expect(sim.serialize()).toEqual(before);
    expect(sim.command(command).ok).toBe(true);
    const after = sim.serialize();
    expect(after.storages[depotId]!.inventory.ferrite).toBe(0);
    expect(after.flows.consumed.ferrite).toBe((before.flows.consumed.ferrite ?? 0) + 2);
    expect(after.machines[machineId]).toMatchObject({
      enabled: false, integrity: 10000, wear: 50,
    });
    expect(sim.snapshot().machines.find((m) => m.id === machineId))
      .toMatchObject({ physicalCondition: "intact" });
    expect(auditLedger(fixture, after).ok).toBe(true);
    const restored = new Simulation(fixture);
    expect(restored.load(after).ok).toBe(true);
    sim.step(1100);
    restored.step(1100);
    expect(restored.serialize()).toEqual(sim.serialize());
  });

  it("refuses service with no parts, while still enabled, or during an active batch", () => {
    const { sim, machineId, depotId } = site();
    localParts(sim, depotId, 2);
    const action = { type: "serviceMachine", machineId };
    const untouched = sim.serialize();
    expect(sim.command(action).ok).toBe(false);
    expect(sim.serialize()).toEqual(untouched);
    sim.step(fixture.tickMs);
    expect(sim.serialize().machines[machineId]!.job).not.toBeNull();
    expect(sim.command({ type: "setEnabled", machineId, enabled: false }).ok).toBe(true);
    expect(sim.command(action).ok).toBe(false);
    sim.step(20 * fixture.tickMs);
    // Still missing a serviceable injury at this point is fine: no free repair.
    const finished = sim.serialize();
    expect(finished.machines[machineId]!.job).toBeNull();
    expect(sim.command(action).ok).toBe(true); // P2a wear > 0, stop and replace cutter
    expect(sim.serialize().storages[depotId]!.inventory.ferrite).toBe(0);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  });

  it("rejects remote storage and refuses to teleport parts from terminal stock", () => {
    const sim = new Simulation(fixture);
    const placed = sim.command({
      type: "placeMachine", definitionId: "extractor",
      x: 18, y: 26, direction: 0,
    });
    const depot = sim.command({
      type: "placeStorage", definitionId: "depot",
      x: 28, y: 8, direction: 0,
    });
    expect(placed.ok).toBe(true);
    expect(depot.ok).toBe(true);
    const state = sim.serialize();
    state.deposits["ferrite-field"] -= 3;
    state.storages[depot.id!]!.inventory.ferrite = 3;
    state.machines[placed.id!]!.enabled = false;
    state.machines[placed.id!]!.integrity = 7000;
    expect(sim.load(state).ok).toBe(true);
    const before = sim.serialize();
    expect(sim.snapshot().machines.find((m) => m.id === placed.id)!.service)
      .toMatchObject({ ready: false, availableUnits: 0, reason: "no-local-parts" });
    expect(sim.command({ type: "serviceMachine", machineId: placed.id! }).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  });

  it("validates solid-only service materials and never publishes authored repair coefficients", () => {
    const invalid = structuredClone(fixture);
    invalid.machines.find((m) => m.id === "extractor")!.reliability!.service!.materialId =
      "gas-0";
    expect(() => validateSimulationContent(invalid)).toThrow();
    const normal = new Simulation(fixture).snapshot();
    const exposed = JSON.stringify(normal);
    expect(exposed).not.toContain('"reliability"');
    expect(exposed).not.toContain('"restoreIntegrity"');
    expect(exposed).not.toContain('"reduceWear"');
  });
});
