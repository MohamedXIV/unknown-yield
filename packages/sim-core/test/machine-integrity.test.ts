import { fixture, validateSimulationContent } from "@site/content";
import { Simulation, auditLedger } from "../src/index";
import { assessMachineOperation, machinePhysicalCondition } from "../src/machine-wear";
import { describe, expect, it } from "vitest";

function place(sim: Simulation, x: number, y: number) {
  const result = sim.command({
    type: "placeMachine", definitionId: "extractor", x, y, direction: 0,
  });
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

describe("P2b1 — independent physical integrity and actual damage", () => {
  it("slows real production after damage, without changing reserved ore or fuel accounting", () => {
    const authored = structuredClone(fixture);
    const profile = authored.machines.find((d) => d.id === "extractor")!.reliability!;
    // Accelerated profile is a test content pack, not a machine-ID special case.
    profile.integrityLossPerWear = 100;
    profile.damagedBelow = 9000;
    profile.damagedDurationBps = 15000;
    const c = validateSimulationContent(authored);
    const sim = new Simulation(c), id = place(sim, 18, 26);
    expect(sim.snapshot().machines.find((m) => m.id === id)).toMatchObject({
      wear: 0, integrity: 10000, physicalCondition: "intact",
      durationTicks: 20, fuelCost: 1,
    });
    sim.step(c.tickMs);
    const first = sim.serialize();
    expect(first.machines[id]!.integrity).toBe(10000);
    sim.step(20 * c.tickMs);
    const current = sim.snapshot().machines.find((m) => m.id === id)!;
    expect(current).toMatchObject({
      wear: 11, integrity: 8900, physicalCondition: "damaged",
      durationTicks: 30, fuelCost: 1, job: { remaining: 30 },
    });
    expect(sim.serialize().deposits["ferrite-field"]).toBe(
      first.deposits["ferrite-field"] - 1,
    );
    sim.step(29 * c.tickMs);
    expect(sim.serialize().machines[id]!.output.ferrite).toBe(1);
    sim.step(c.tickMs);
    expect(sim.serialize().machines[id]!.output.ferrite).toBe(2);
    expect(auditLedger(c, sim.serialize()).ok).toBe(true);
  });

  it("does not decay when disabled or mechanically impossible; force load costs more integrity", () => {
    const blocked = new Simulation(fixture), id = place(blocked, 5, 49);
    const before = blocked.serialize();
    blocked.step(5000);
    expect(blocked.serialize().machines[id]).toMatchObject({ wear: 0, integrity: 10000 });
    expect(blocked.serialize().deposits).toEqual(before.deposits);
    expect(blocked.serialize().fuel).toBe(before.fuel);

    const sim = new Simulation(fixture), forceId = place(sim, 18, 36);
    expect(sim.command({ type: "setOperatingMode", machineId: forceId, modeId: "force" }).ok)
      .toBe(true);
    sim.step(fixture.tickMs);
    expect(sim.command({ type: "setEnabled", machineId: forceId, enabled: false }).ok)
      .toBe(true);
    sim.step(17 * fixture.tickMs);
    expect(sim.serialize().machines[forceId]).toMatchObject({
      wear: 35, integrity: 9930, enabled: false,
    });
    sim.step(2000);
    expect(sim.serialize().machines[forceId]!.integrity).toBe(9930);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  });

  it("saves damaged in-progress work byte-identically and validates the current integrity field", () => {
    const authored = structuredClone(fixture);
    const profile = authored.machines.find((m) => m.id === "extractor")!.reliability!;
    profile.integrityLossPerWear = 100;
    profile.damagedBelow = 9000;
    const sim = new Simulation(authored), id = place(sim, 18, 26);
    sim.step(21 * fixture.tickMs);
    const saved = sim.serialize();
    expect(machinePhysicalCondition(authored, saved.machines[id]!)).toBe("damaged");
    const loaded = new Simulation(authored);
    expect(loaded.load(saved).ok).toBe(true);
    expect(loaded.snapshot()).toEqual(sim.snapshot());
    sim.step(1200);
    loaded.step(1200);
    expect(loaded.serialize()).toEqual(sim.serialize());
    expect(auditLedger(authored, loaded.serialize()).ok).toBe(true);
    const missing = structuredClone(saved);
    delete (missing.machines[id] as Partial<typeof missing.machines[string]>).integrity;
    expect(new Simulation(authored).load(missing).ok).toBe(false);
    const bad = structuredClone(saved);
    bad.machines[id]!.integrity = 20000;
    expect(new Simulation(authored).load(bad).ok).toBe(false);
  });

  it("migrates schema 29 independently from wear and keeps private reliability rules private", () => {
    const sim = new Simulation(fixture), id = place(sim, 18, 26);
    const legacy = sim.serialize();
    legacy.schemaVersion = 29;
    delete (legacy.machines[id] as Partial<typeof legacy.machines[string]>).integrity;
    const restored = new Simulation(fixture);
    expect(restored.load(legacy).ok).toBe(true);
    expect(restored.serialize().schemaVersion).toBe(31);
    expect(restored.serialize().machines[id]).toMatchObject({
      wear: 0, integrity: 10000,
    });
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);

    const custom = structuredClone(fixture);
    const reliability = custom.machines.find((m) => m.id === "extractor")!.reliability!;
    reliability.integrityLossPerWear = 100;
    reliability.damagedBelow = 9999;
    reliability.damagedDurationBps = 20000;
    const c = validateSimulationContent(custom);
    const run = new Simulation(c), customId = place(run, 18, 26);
    run.step(21 * c.tickMs);
    expect(assessMachineOperation(c, run.serialize().machines[customId]!).durationTicks)
      .toBe(40);
    const snapshot = JSON.stringify(run.snapshot());
    for (const field of ["reliability", "integrityLossPerWear", "damagedDurationBps"])
      expect(snapshot).not.toContain('"' + field + '"');
  });
});
