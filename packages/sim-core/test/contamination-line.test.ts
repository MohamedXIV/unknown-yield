import { expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  experimentEvidenceKey,
  initializeKnownMarkets,
  type GameCommand,
} from "../src/index";

function build(sim: Simulation, command: GameCommand): string {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

/**
 * Start at a legitimate certified research checkpoint, not a fabricated
 * inventory/incident: the only save edits are confirmed *knowledge* used to
 * unlock a real deep extractor and imported advanced propellant.
 */
function certifiedResearchRun(): Simulation {
  const sim = new Simulation(fixture);
  const save = sim.serialize();
  for (const id of ["heat-raw-sealed", "vaporize-liquid-0"]) {
    const reaction = fixture.reactions.find(r => r.id === id)!;
    save.knowledge.push(reaction.id);
    save.evidence[experimentEvidenceKey(
      reaction.operation, reaction.input,
      reaction.processConditionId ?? null,
    )] = {
      operationId: reaction.operation,
      inputId: reaction.input,
      processConditionId: reaction.processConditionId ?? null,
      state: "confirmed",
    };
  }
  initializeKnownMarkets(fixture, save);
  expect(sim.load(save).ok).toBe(true);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  return sim;
}

it("runs a real catalyst outcrop -> deep extractor -> belts -> contaminated chamber -> rated local recovery", () => {
  const sim = certifiedResearchRun();
  const initialDeposit = sim.serialize().deposits["catalyst-outcrop"];
  expect(sim.snapshot().milestones.find(m => m.id === "gas-study-certified"))
    .toMatchObject({ completed: true });

  expect(sim.command({ type: "installTerminalModule", definitionId: "gas-dock" }))
    .toMatchObject({ ok: true });
  const factoryId = build(sim, {
    type: "placeFactory", x: 14, y: 46, width: 10, height: 11,
  });
  build(sim, {
    type: "placePort", factoryId, x: 14, y: 51, direction: 0,
  });
  const extractorId = build(sim, {
    type: "placeMachine", definitionId: "deep-extractor", x: 6, y: 50, direction: 0,
  });
  const processorId = build(sim, {
    type: "placeMachine", definitionId: "oversealed-furnace",
    x: 17, y: 50, direction: 0,
  });
  build(sim, {
    type: "placeBelts", points: Array.from({ length: 9 }, (_, i) => ({
      x: 8 + i, y: 51,
    })), direction: 0,
  });
  const plainId = build(sim, {
    type: "placeStorage", definitionId: "depot", x: 25, y: 49, direction: 0,
  });
  expect(sim.snapshot().machines.find(m => m.id === extractorId)?.status)
    .toBe("needs-special-fuel");
  expect(sim.serialize().deposits["catalyst-outcrop"]).toBe(initialDeposit);
  expect(sim.command({
    type: "requestImport", supplyId: "orbital-propellant-cylinder",
  })).toMatchObject({ ok: true });
  expect(sim.serialize().terminalModules["gas-dock"]).toEqual({
    materialId: "orbital-propellant", quantity: 4,
  });
  expect(sim.snapshot().machines.find(m => m.id === extractorId))
    .toMatchObject({ status: "ready", extractionCompatibility: "strained" });
  expect(JSON.stringify(sim.snapshot())).not.toContain("catalyst-contamination");

  // Identical authoritative runs must extract and transport without ever
  // injecting catalyst into processor.input or changing material ledger rows.
  const replay = new Simulation(fixture);
  expect(replay.load(structuredClone(sim.serialize())).ok).toBe(true);
  let sawRealBeltCargo = false;
  let sawProcessorInput = false;
  for (let i = 0; i < 500; i++) {
    sim.step(fixture.tickMs);
    replay.step(fixture.tickMs);
    const current = sim.serialize();
    expect(replay.serialize()).toEqual(current);
    expect(auditLedger(fixture, current).ok).toBe(true);
    sawRealBeltCargo ||= Object.values(current.belts)
      .some(b => b.cargo === "catalyst");
    sawProcessorInput ||= (current.machines[processorId]!.input.catalyst ?? 0) > 0;
    if (current.machines[processorId]!.incident) break;
  }
  const trapped = sim.serialize();
  expect(sawRealBeltCargo).toBe(true);
  expect(sawProcessorInput).toBe(true);
  expect(initialDeposit - trapped.deposits["catalyst-outcrop"])
    .toBeGreaterThanOrEqual(2);
  expect(trapped.flows.consumed.catalyst).toBe(2);
  expect(trapped.flows.produced["tainted-residue"]).toBe(1);
  expect(trapped.flows.consumed["orbital-propellant"]).toBeGreaterThanOrEqual(2);
  expect(trapped.machines[processorId]).toMatchObject({
    enabled: false, incident: "catalyst-contamination",
    incidentInventory: { "tainted-residue": 1 }, output: {},
  });
  expect(trapped.storages[plainId]!.inventory).toEqual({});
  expect(trapped.staging["tainted-residue"] ?? 0).toBe(0);
  expect(auditLedger(fixture, trapped).ok).toBe(true);

  const reclaim = { type: "recoverMachineIncident", machineId: processorId };
  const transfer = { type: "recoverIncidentToReceiver", machineId: processorId };
  for (const command of [reclaim, transfer]) {
    expect(sim.preview(command).ok).toBe(false);
    expect(sim.command(command).ok).toBe(false);
    expect(sim.serialize()).toEqual(trapped);
  }
  expect(sim.snapshot().machines.find(m => m.id === processorId)?.incidentRecovery)
    .toMatchObject({ ready: false, reason: "missing-containment", units: 1 });

  const isolationId = build(sim, {
    type: "placeStorage", definitionId: "isolation-depot",
    x: 25, y: 53, direction: 0,
  });
  build(replay, {
    type: "placeStorage", definitionId: "isolation-depot",
    x: 25, y: 53, direction: 0,
  });
  expect(sim.serialize()).toEqual(replay.serialize());
  expect(sim.snapshot().machines.find(m => m.id === processorId)?.incidentRecovery)
    .toMatchObject({ ready: true, units: 1, handlingState: "solid" });
  const ready = sim.serialize();
  expect(sim.preview(transfer).ok).toBe(true);
  expect(sim.serialize()).toEqual(ready);
  expect(sim.command(transfer)).toMatchObject({ ok: true });
  expect(replay.command(transfer)).toMatchObject({ ok: true });
  const finished = sim.serialize();
  expect(replay.serialize()).toEqual(finished);
  expect(finished.machines[processorId]).toMatchObject({
    enabled: false, incident: null, incidentInventory: {}, output: {},
  });
  expect(finished.storages[isolationId]!.inventory).toEqual({ "tainted-residue": 1 });
  expect(finished.storages[plainId]!.inventory).toEqual({});
  expect(finished.flows).toEqual(ready.flows);
  expect(finished.stock).toEqual(ready.stock);
  expect(auditLedger(fixture, finished).ok).toBe(true);

  const restored = new Simulation(fixture);
  expect(restored.load(JSON.parse(JSON.stringify(finished))).ok).toBe(true);
  sim.step(500);
  replay.step(500);
  restored.step(500);
  expect(replay.serialize()).toEqual(sim.serialize());
  expect(restored.serialize()).toEqual(sim.serialize());
  expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
});
