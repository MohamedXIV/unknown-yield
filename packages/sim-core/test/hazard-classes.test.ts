import { expect, it } from "vitest";
import { fixture, validateContent } from "@site/content";
import {
  Simulation,
  auditLedger,
  experimentEvidenceKey,
  hazardDefinition,
  initializeKnownMarkets,
  type GameCommand,
} from "../src/index";

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

function armedHazardLine() {
  const sim = new Simulation(fixture);
  const state = sim.serialize();
  const prerequisite = fixture.reactions.find(
    (reaction) => reaction.id === "heat-raw-sealed",
  )!;
  state.knowledge.push(prerequisite.id);
  state.evidence[
    experimentEvidenceKey(
      prerequisite.operation,
      prerequisite.input,
      prerequisite.processConditionId ?? null,
    )
  ] = {
    operationId: prerequisite.operation,
    inputId: prerequisite.input,
    processConditionId: prerequisite.processConditionId ?? null,
    state: "confirmed",
  };
  initializeKnownMarkets(fixture, state);
  expect(sim.load(state).ok).toBe(true);

  const factoryId = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 33,
    width: 10,
    height: 10,
  });
  build(sim, {
    type: "placePort",
    factoryId,
    x: 24,
    y: 37,
    direction: 0,
  });
  build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 36,
    direction: 0,
  });
  const processorId = build(sim, {
    type: "placeMachine",
    definitionId: "oversealed-furnace",
    x: 27,
    y: 36,
    direction: 0,
  });
  build(sim, {
    type: "placeBelts",
    points: Array.from({ length: 7 }, (_, index) => ({
      x: 20 + index,
      y: 37,
    })),
    direction: 0,
  });
  return { sim, processorId };
}

it("reproduces the same authored hazard class from the same authoritative state", () => {
  const left = armedHazardLine();
  const right = armedHazardLine();

  const before = JSON.stringify(left.sim.snapshot());
  expect(before).not.toContain("chamber-blowout");
  expect(before).not.toContain("pressure-expansion");
  expect(before).not.toContain("hazard.class.pressure-expansion");

  for (let tick = 0; tick < 500; tick++) {
    left.sim.step(fixture.tickMs);
    right.sim.step(fixture.tickMs);
    expect(right.sim.serialize()).toEqual(left.sim.serialize());
    expect(auditLedger(fixture, left.sim.serialize()).ok).toBe(true);
    if (left.sim.serialize().machines[left.processorId].incident) break;
  }

  expect(left.sim.serialize().machines[left.processorId].incident).toBe(
    "chamber-blowout",
  );
  expect(
    left.sim.snapshot().machines.find(
      (machine) => machine.id === left.processorId,
    )?.incident,
  ).toEqual({
    classId: "pressure-expansion",
    classNameKey: "hazard.class.pressure-expansion.name",
    nameKey: "hazard.chamber-blowout.name",
    textKey: "hazard.chamber-blowout.observation",
    evidenceKey: "hazard.class.pressure-expansion.evidence",
    saferHintKey: "hazard.chamber-blowout.safer-hint",
  });
  expect(left.sim.snapshot().hazardEvidence).toContainEqual({
    id: "chamber-blowout",
    classId: "pressure-expansion",
    classNameKey: "hazard.class.pressure-expansion.name",
    nameKey: "hazard.chamber-blowout.name",
    textKey: "hazard.chamber-blowout.observation",
    evidenceKey: "hazard.class.pressure-expansion.evidence",
    saferHintKey: "hazard.chamber-blowout.safer-hint",
    operationId: "heat",
    inputId: "raw",
    setupNameKey: "machine.oversealed-furnace.name",
  });
  expect(right.sim.serialize()).toEqual(left.sim.serialize());
});

it("resolves class identity from authored data without changing trigger rules", () => {
  const draft = structuredClone(fixture);
  draft.reactions.find(
    (reaction) => reaction.id === "heat-raw-oversealed",
  )!.hazard!.classId = "thermal-runaway";
  const content = validateContent(draft);
  const resolved = hazardDefinition(content, "chamber-blowout");

  expect(resolved).toMatchObject({
    hazard: {
      id: "chamber-blowout",
      classId: "thermal-runaway",
    },
    classDefinition: {
      id: "thermal-runaway",
      machineEffect: "lockout",
    },
  });
});


function armedFerriteHazardLine() {
  const sim = new Simulation(fixture);
  const state = sim.serialize();
  const prerequisite = fixture.reactions.find(
    (reaction) => reaction.id === "heat-raw-sealed",
  )!;
  state.knowledge.push(prerequisite.id);
  state.evidence[
    experimentEvidenceKey(
      prerequisite.operation,
      prerequisite.input,
      prerequisite.processConditionId ?? null,
    )
  ] = {
    operationId: prerequisite.operation,
    inputId: prerequisite.input,
    processConditionId: prerequisite.processConditionId ?? null,
    state: "confirmed",
  };
  initializeKnownMarkets(fixture, state);
  expect(sim.load(state).ok).toBe(true);

  const factoryId = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 23,
    width: 10,
    height: 10,
  });
  build(sim, {
    type: "placePort",
    factoryId,
    x: 24,
    y: 27,
    direction: 0,
  });
  build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 26,
    direction: 0,
  });
  const processorId = build(sim, {
    type: "placeMachine",
    definitionId: "oversealed-furnace",
    x: 27,
    y: 26,
    direction: 0,
  });
  build(sim, {
    type: "placeBelts",
    points: Array.from({ length: 7 }, (_, index) => ({
      x: 20 + index,
      y: 27,
    })),
    direction: 0,
  });
  return { sim, processorId };
}

it("persists a conservative stranded-output consequence without deleting material", () => {
  const { sim, processorId } = armedFerriteHazardLine();

  for (
    let tick = 0;
    tick < 500 && !sim.serialize().machines[processorId].incident;
    tick++
  )
    sim.step(fixture.tickMs);

  const state = sim.serialize();
  expect(state.hazardEvidence).toEqual(["slag-jam"]);
  expect(state.machines[processorId]).toMatchObject({
    incident: "slag-jam",
    enabled: false,
    incidentInventory: { residue: 1 },
  });
  expect(state.machines[processorId].output.residue ?? 0).toBe(0);
  expect(state.flows.produced.residue).toBeGreaterThanOrEqual(1);

  const ledger = auditLedger(fixture, state);
  expect(ledger.ok, JSON.stringify(ledger.mismatches)).toBe(true);
  expect(
    ledger.rows.find((row) => row.material === "residue")?.machineIncidents,
  ).toBeGreaterThanOrEqual(1);

  const beforeRestart = sim.serialize();
  expect(
    sim.command({
      type: "setEnabled",
      machineId: processorId,
      enabled: true,
    }),
  ).toMatchObject({
    ok: false,
    message: "Physical hazard consequence blocks restart",
  });
  expect(sim.serialize()).toEqual(beforeRestart);
  expect(
    sim.command({
      type: "dismantle",
      id: processorId,
    }),
  ).toMatchObject({
    ok: false,
    message: "Empty the machine buffers through compatible transport first",
  });
  expect(sim.serialize()).toEqual(beforeRestart);

  const restored = new Simulation(fixture);
  expect(restored.load(JSON.parse(JSON.stringify(state))).ok).toBe(true);
  expect(restored.serialize()).toEqual(state);
  expect(restored.snapshot().hazardEvidence).toContainEqual(
    expect.objectContaining({
      id: "slag-jam",
      classId: "instability",
      evidenceKey: "hazard.class.instability.evidence",
      saferHintKey: "hazard.slag-jam.safer-hint",
      operationId: "heat",
      inputId: "ferrite",
      setupNameKey: "machine.oversealed-furnace.name",
    }),
  );
  expect(
    JSON.stringify(restored.snapshot().hazardEvidence),
  ).not.toContain("heat-ferrite-sealed");
  expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
});
