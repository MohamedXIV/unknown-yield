import { expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  experimentEvidenceKey,
  initializeKnownMarkets,
  type GameCommand,
} from "../src/index";

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

function auditOk(sim: Simulation) {
  const report = auditLedger(fixture, sim.serialize());
  expect(report.ok, JSON.stringify(report.mismatches)).toBe(true);
}

function armOversealedHeat(sim: Simulation) {
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
}

function buildHazardLine(sim: Simulation) {
  const factoryId = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 23,
    width: 10,
    height: 10,
  });
  for (const x of [24, 33])
    build(sim, {
      type: "placePort",
      factoryId,
      x,
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
  build(sim, {
    type: "placeBelts",
    points: Array.from({ length: 9 }, (_, index) => ({
      x: 29 + index,
      y: 27,
    })),
    direction: 0,
  });
  return processorId;
}

function buildReliefLine(sim: Simulation) {
  const factoryId = build(sim, {
    type: "placeFactory",
    x: 59,
    y: 12,
    width: 10,
    height: 10,
  });
  build(sim, {
    type: "placePort",
    factoryId,
    x: 59,
    y: 16,
    direction: 0,
  });
  build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 53,
    y: 15,
    direction: 0,
  });
  const processorId = build(sim, {
    type: "placeMachine",
    definitionId: "relief-furnace",
    x: 62,
    y: 15,
    direction: 0,
  });
  build(sim, {
    type: "placeBelts",
    points: Array.from({ length: 7 }, (_, index) => ({
      x: 55 + index,
      y: 16,
    })),
    direction: 0,
  });
  return processorId;
}

it("closes Phase 11 through one hazardous science, recovery and prevention loop", () => {
  const sim = new Simulation(fixture);
  armOversealedHeat(sim);

  expect(
    sim.snapshot().definitions.find(
      (definition) => definition.id === "relief-furnace",
    )?.unlock,
  ).toEqual({
    unlocked: false,
    hintKey: "machine.relief-furnace.unlock-hint",
  });

  const hazardousProcessor = buildHazardLine(sim);
  for (
    let tick = 0;
    tick < 500 && !sim.serialize().machines[hazardousProcessor].incident;
    tick++
  ) {
    sim.step(fixture.tickMs);
    auditOk(sim);
  }

  const incidentState = sim.serialize();
  expect(incidentState.hazardEvidence).toEqual(["slag-jam"]);
  expect(incidentState.machines[hazardousProcessor]).toMatchObject({
    incident: "slag-jam",
    enabled: false,
    incidentInventory: { residue: 1 },
  });
  expect(
    sim.snapshot().hazardEvidence.find((entry) => entry.id === "slag-jam"),
  ).toMatchObject({
    classId: "instability",
    evidenceKey: "hazard.class.instability.evidence",
    saferHintKey: "hazard.slag-jam.safer-hint",
    operationId: "heat",
    inputId: "ferrite",
  });
  auditOk(sim);

  const restored = new Simulation(fixture);
  expect(
    restored.load(JSON.parse(JSON.stringify(incidentState))).ok,
  ).toBe(true);
  expect(restored.serialize()).toEqual(incidentState);
  auditOk(restored);

  expect(
    restored.command({
      type: "recoverMachineIncident",
      machineId: hazardousProcessor,
    }),
  ).toMatchObject({
    ok: true,
    message: "Hazard material reclaimed to machine output",
  });
  expect(restored.serialize().machines[hazardousProcessor]).toMatchObject({
    incident: null,
    enabled: false,
    incidentInventory: {},
    output: { residue: 1 },
  });
  expect(restored.serialize().hazardEvidence).toEqual(["slag-jam"]);
  auditOk(restored);

  const stagingBefore = restored.serialize().staging.residue ?? 0;
  for (
    let tick = 0;
    tick < 300 &&
    (restored.serialize().staging.residue ?? 0) <= stagingBefore;
    tick++
  ) {
    restored.step(fixture.tickMs);
    auditOk(restored);
  }
  expect(restored.serialize().staging.residue ?? 0).toBeGreaterThan(
    stagingBefore,
  );
  expect(
    restored.serialize().machines[hazardousProcessor].output.residue ?? 0,
  ).toBe(0);

  expect(
    restored.snapshot().definitions.find(
      (definition) => definition.id === "relief-furnace",
    )?.unlock,
  ).toEqual({
    unlocked: true,
    hintKey: "machine.relief-furnace.unlock-hint",
  });

  const safeProcessor = buildReliefLine(restored);
  for (
    let tick = 0;
    tick < 500 &&
    !restored.serialize().knowledge.includes("heat-ferrite-relieved");
    tick++
  ) {
    restored.step(fixture.tickMs);
    auditOk(restored);
  }

  const safeState = restored.serialize();
  expect(safeState.knowledge).toContain("heat-ferrite-relieved");
  expect(safeState.hazardEvidence).toEqual(["slag-jam"]);
  expect(safeState.machines[safeProcessor]).toMatchObject({
    incident: null,
    incidentInventory: {},
  });
  expect(safeState.machines[safeProcessor].output.residue ?? 0).toBeGreaterThanOrEqual(
    1,
  );
  auditOk(restored);

  const finalReload = new Simulation(fixture);
  expect(finalReload.load(JSON.parse(JSON.stringify(safeState))).ok).toBe(true);
  expect(finalReload.serialize()).toEqual(safeState);
  expect(
    finalReload.snapshot().definitions.find(
      (definition) => definition.id === "relief-furnace",
    )?.unlock,
  ).toEqual({
    unlocked: true,
    hintKey: "machine.relief-furnace.unlock-hint",
  });
  auditOk(finalReload);
});
