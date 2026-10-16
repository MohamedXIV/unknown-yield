import { fixture } from "@site/content";
import { Simulation, auditLedger } from "../src/index";
import { completedBatchWear, machinePhysicalCondition } from "../src/machine-wear";
import { describe, expect, it } from "vitest";

function place(sim: Simulation, x: number, y: number) {
  const placed = sim.command({ type: "placeMachine", definitionId: "extractor", x, y, direction: 0 });
  expect(placed.ok, placed.message).toBe(true);
  return placed.id!;
}

describe("P2a — persisted material-dependent physical wear", () => {
  it("derives different wear from real material stress and force mode without ID rules", () => {
    const soft = new Simulation(fixture), hard = new Simulation(fixture);
    const s = place(soft, 18, 26), h = place(hard, 18, 36);
    expect(completedBatchWear(fixture, soft.serialize().machines[s]!)).toBe(11);
    expect(completedBatchWear(fixture, hard.serialize().machines[h]!)).toBe(23);
    expect(hard.command({ type: "setOperatingMode", machineId: h, modeId: "force" }).ok)
      .toBe(true);
    expect(completedBatchWear(fixture, hard.serialize().machines[h]!)).toBe(35);
    soft.step(fixture.tickMs);
    hard.step(fixture.tickMs);
    expect(soft.serialize().machines[s]!.wear).toBe(0); // active work has not finished
    expect(hard.serialize().machines[h]!.wear).toBe(0);
    expect(soft.command({ type: "setEnabled", machineId: s, enabled: false }).ok).toBe(true);
    expect(hard.command({ type: "setEnabled", machineId: h, enabled: false }).ok).toBe(true);
    soft.step(20 * fixture.tickMs);
    hard.step(17 * fixture.tickMs);
    expect(soft.serialize().machines[s]!.wear).toBe(11);
    expect(hard.serialize().machines[h]!.wear).toBe(35);
    expect(soft.snapshot().machines.find((m) => m.id === s)!.physicalCondition).toBe("intact");
    expect(auditLedger(fixture, soft.serialize()).ok).toBe(true);
    expect(auditLedger(fixture, hard.serialize()).ok).toBe(true);
  });

  it("keeps hard-blocked equipment unworn, with material and fuel conserved", () => {
    const sim = new Simulation(fixture);
    const id = place(sim, 5, 49); // catalytic outcrop exceeds starter hard limit
    const before = sim.serialize();
    sim.step(5000);
    expect(sim.snapshot().machines.find((m) => m.id === id))
      .toMatchObject({ extractionCompatibility: "impossible", wear: 0, physicalCondition: "intact" });
    expect(sim.serialize().deposits).toEqual(before.deposits);
    expect(sim.serialize().fuel).toBe(before.fuel);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  });

  it("persists wear and physical condition through exact save/load replay", () => {
    const sim = new Simulation(fixture);
    const id = place(sim, 18, 26);
    sim.step(310 * fixture.tickMs); // repeated real extraction batches, no fast-forward reward
    const before = sim.serialize();
    expect(before.machines[id]!.wear).toBeGreaterThanOrEqual(110);
    expect(machinePhysicalCondition(fixture, before.machines[id]!)).toBe("worn");
    expect(sim.snapshot().machines.find((m) => m.id === id))
      .toMatchObject({ physicalCondition: "worn" });
    const restored = new Simulation(fixture);
    expect(restored.load(before).ok).toBe(true);
    sim.step(400);
    restored.step(400);
    expect(restored.serialize()).toEqual(sim.serialize());
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);

    const tampered = structuredClone(before);
    tampered.machines[id]!.wear = 20000;
    expect(new Simulation(fixture).load(tampered).ok).toBe(false);
    const missing = structuredClone(before);
    delete (missing.machines[id] as Partial<typeof missing.machines[string]>).wear;
    expect(new Simulation(fixture).load(missing).ok).toBe(false);
    const legacy = structuredClone(before);
    legacy.schemaVersion = 28;
    delete (legacy.machines[id] as Partial<typeof legacy.machines[string]>).wear;
    const migrated = new Simulation(fixture);
    expect(migrated.load(legacy).ok).toBe(true);
    expect(migrated.serialize().schemaVersion).toBe(29);
    expect(migrated.serialize().machines[id]!.wear).toBe(0);
    expect(auditLedger(fixture, migrated.serialize()).ok).toBe(true);
  });

  it("makes a fourth material's wear change from authored properties alone", () => {
    const content = structuredClone(fixture);
    content.materials.push({
      id: "new-stratum", nameKey: "material.new-stratum.name", color: "#89abce",
      known: true, handlingState: "solid", requiredContainment: [],
      mechanics: { hardness: 5, abrasiveness: 1, brittleness: 1 },
    });
    content.site.deposits.push({
      id: "new-stratum-field", material: "new-stratum",
      x: 28, y: 43, width: 2, height: 2, units: 30,
    });
    const sim = new Simulation(content);
    const placed = sim.command({
      type: "placeMachine", definitionId: "extractor", x: 28, y: 43, direction: 0,
    });
    expect(placed.ok, placed.message).toBe(true);
    expect(completedBatchWear(content, sim.serialize().machines[placed.id!]!)).toBe(41);
    expect(JSON.stringify(sim.snapshot())).not.toContain('"reliability"');
    expect(JSON.stringify(sim.snapshot())).not.toContain('"wearBps"');
  });
});
