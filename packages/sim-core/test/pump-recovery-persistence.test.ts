import { expect, it } from "vitest";
import { fixture } from "@site/content";
import { Simulation, auditLedger, type Save } from "../src/index";
import { historicalFixture } from "./historical-content";
import { recoveryRig } from "./pump-recovery-helpers";
it("round trips incident and rejects tampering atomically", () => {
  const { sim, pumpId } = recoveryRig();
  const before = sim.serialize();
  expect(before.schemaVersion).toBe(25);
  expect(sim.load(before).ok).toBe(true);
  expect(sim.serialize()).toEqual(before);
  const mutations = [
    (s: Save) => (s.schemaVersion = 17),
    (s: Save) =>
      delete (s.pumps[pumpId] as Partial<(typeof s.pumps)[string]>).incident,
    (s: Save) => (s.pumps[pumpId].enabled = true),
    (s: Save) => (s.pumps[pumpId].incident!.quantity = 2),
    (s: Save) => (s.pumps[pumpId].incident!.startedAt = s.tick + 1),
    (s: Save) => (s.pumps[pumpId].incident!.definitionId = "missing"),
    (s: Save) => (s.pumps[pumpId].incident!.materialId = "raw"),
    (s: Save) =>
      ((s.pumps[pumpId].incident as unknown as Record<string, unknown>).extra =
        true),
    (s: Save) => {
      s.pumps[pumpId].containmentProfileId = "lined";
      s.stock.plates -= 4;
    },
    (s: Save) => s.flows.produced["liquid-0"]++,
  ];
  mutations.push(
    (s) => {
      delete (s.pumps[pumpId] as Partial<(typeof s.pumps)[string]>)
        .containmentProfileId;
    },
    (s) => {
      s.pumps[pumpId].incident!.quantity = -1;
    },
    (s) => {
      s.pumps[pumpId].incident!.quantity = 0.5;
    },
    (s) => {
      (
        s.pumps[pumpId].incident as unknown as Record<string, unknown>
      ).drainEnabled = "true";
    },
  );
  for (const mutate of mutations) {
    const s = structuredClone(before);
    mutate(s);
    expect(sim.load(s).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
  }
});
it("restores service and empty upgraded futures independently of reclaimed source", () => {
  for (const stage of ["blocked", "draining", "upgraded"]) {
    const { sim, pumpId, sourceMachineId } = recoveryRig();
    const s = sim.serialize();
    s.machines[sourceMachineId].output = {};
    s.flows.produced["liquid-0"] = 1;
    expect(sim.load(s).ok).toBe(true);
    expect(
      sim.command({
        type: "setEnabled",
        machineId: sourceMachineId,
        enabled: false,
      }).ok,
    ).toBe(true);
    expect(sim.command({ type: "dismantle", id: sourceMachineId }).ok).toBe(
      true,
    );
    if (stage !== "blocked")
      expect(
        sim.command({ type: "setPumpRecoveryDrain", id: pumpId, enabled: true })
          .ok,
      ).toBe(true);
    if (stage === "upgraded") {
      sim.step(300);
      expect(sim.serialize().pumps[pumpId].incident!.quantity).toBe(0);
      expect(
        sim.command({
          type: "setLiquidContainmentProfile",
          id: pumpId,
          containmentProfileId: "lined",
        }).ok,
      ).toBe(true);
    }
    const restored = new Simulation(fixture);
    expect(restored.load(sim.serialize()).ok).toBe(true);
    for (let i = 0; i < 60; i++) {
      sim.step(100);
      restored.step(100);
      expect(restored.serialize()).toEqual(sim.serialize());
      expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
    }
  }
});
it("migrates historical schema 17 with empty pump state only", () => {
  const sim = new Simulation(historicalFixture);
  const id = sim.command({ type: "placePump", x: 10, y: 10, direction: 0 }).id!;
  const s = sim.serialize();
  s.schemaVersion = 17;
  delete (s.pumps[id] as Partial<(typeof s.pumps)[string]>).incident;
  expect(sim.load(s).ok).toBe(true);
  expect(sim.serialize().schemaVersion).toBe(25);
  expect(sim.serialize().pumps[id].incident).toBeNull();
  const bad = sim.serialize();
  bad.schemaVersion = 17;
  bad.pumps[id].incident = {
    definitionId: "pump-corrosion",
    materialId: "liquid-0",
    quantity: 0,
    startedAt: 0,
    drainEnabled: false,
  };
  expect(sim.load(bad).ok).toBe(false);
});
