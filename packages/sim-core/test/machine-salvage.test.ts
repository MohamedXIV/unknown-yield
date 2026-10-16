import { fixture, validateSimulationContent } from "@site/content";
import { Simulation, auditLedger } from "../src/index";
import { describe, expect, it } from "vitest";

function setup(withStorage = true) {
  const draft = structuredClone(fixture);
  const reliability = draft.machines.find((m) => m.id === "extractor")!.reliability!;
  reliability.integrityLossPerWear = 100;
  reliability.damagedBelow = 9500;
  reliability.failure = { kind: "jam", integrityAtOrBelow: 9000, minimumStressLoad: 6 };
  const content = validateSimulationContent(draft), sim = new Simulation(content);
  const machine = sim.command({
    type: "placeMachine", definitionId: "extractor", x: 18, y: 36, direction: 0,
  });
  expect(machine.ok, machine.message).toBe(true);
  const storage = withStorage ? sim.command({
    type: "placeStorage", definitionId: "depot", x: 22, y: 36, direction: 0,
  }) : null;
  if (storage) expect(storage.ok, storage.message).toBe(true);
  sim.step(26 * content.tickMs);
  expect(sim.snapshot().machines.find((m) => m.id === machine.id))
    .toMatchObject({ status: "mechanical-failure", output: { raw: 1 } });
  return { content, sim, machineId: machine.id!, storageId: storage?.id };
}

describe("P2c2 — physically conserved machine salvage", () => {
  it("moves all buffered output and embodied structure into nearby local storage, not global stock", () => {
    const { sim, content, machineId, storageId } = setup();
    const m = sim.snapshot().machines.find((m) => m.id === machineId)!;
    expect(m.salvage).toMatchObject({
      ready: true, reason: null, cargoUnits: 1, structuralUnits: 18,
    });
    const cmd = { type: "salvageMachine", machineId };
    const before = sim.serialize();
    expect(sim.preview(cmd).ok).toBe(true);
    expect(sim.serialize()).toEqual(before);
    expect(sim.command({ type: "dismantle", id: machineId }).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
    expect(sim.command(cmd).ok).toBe(true);
    const after = sim.serialize();
    expect(after.machines[machineId]).toBeUndefined();
    expect(after.storages[storageId!]!.inventory).toMatchObject({
      raw: 1, plates: 18,
    });
    expect(after.stock).toEqual(before.stock); // no magical global refund
    expect(after.flows).toEqual(before.flows); // mere physical relocation
    expect(auditLedger(content, after).ok).toBe(true);
    const restored = new Simulation(content);
    expect(restored.load(after).ok).toBe(true);
    sim.step(2000);
    restored.step(2000);
    expect(restored.serialize()).toEqual(sim.serialize());
  });

  it("refuses a remote or absent storage; no command preview or failure consumes cargo", () => {
    const { sim, content, machineId } = setup(false);
    const before = sim.serialize();
    const cmd = { type: "salvageMachine", machineId };
    expect(sim.snapshot().machines.find((m) => m.id === machineId)!.salvage)
      .toMatchObject({ ready: false, reason: "no-local-storage" });
    expect(sim.preview(cmd).ok).toBe(false);
    expect(sim.command(cmd).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
    const remote = sim.command({ type: "placeStorage", definitionId: "depot",
      x: 32, y: 9, direction: 0 });
    expect(remote.ok, remote.message).toBe(true);
    expect(sim.command(cmd).ok).toBe(false);
    expect(auditLedger(content, sim.serialize()).ok).toBe(true);
  });

  it("checks one storage's full real capacity atomically and never pools distant or split stock", () => {
    const { sim, content, machineId, storageId } = setup();
    const saved = sim.serialize();
    saved.deposits["ferrite-field"] -= 25;
    saved.storages[storageId!]!.inventory.ferrite = 25;
    expect(sim.load(saved).ok).toBe(true);
    const before = sim.serialize();
    expect(sim.snapshot().machines.find((m) => m.id === machineId)!.salvage)
      .toMatchObject({ ready: false, reason: "insufficient-capacity" });
    expect(sim.preview({ type: "salvageMachine", machineId }).ok).toBe(false);
    expect(sim.command({ type: "salvageMachine", machineId }).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
    expect(auditLedger(content, sim.serialize()).ok).toBe(true);
  });

  it("chooses a deterministic nearby storage and cannot salvage a healthy working machine", () => {
    const { sim, content, machineId, storageId } = setup();
    const second = sim.command({ type: "placeStorage", definitionId: "depot",
      x: 22, y: 40, direction: 0 });
    expect(second.ok, second.message).toBe(true);
    expect(sim.command({ type: "salvageMachine", machineId }).ok).toBe(true);
    expect(sim.serialize().storages[storageId!]!.inventory.plates).toBe(18);
    expect(sim.serialize().storages[second.id!]!.inventory.plates ?? 0).toBe(0);
    expect(auditLedger(content, sim.serialize()).ok).toBe(true);
    const healthy = new Simulation(content);
    const m = healthy.command({ type: "placeMachine", definitionId: "extractor",
      x: 18, y: 26, direction: 0 });
    expect(m.ok).toBe(true);
    expect(healthy.snapshot().machines.find((row) => row.id === m.id)!.salvage).toBeNull();
    expect(healthy.command({ type: "salvageMachine", machineId: m.id! }).ok).toBe(false);
  });
});
