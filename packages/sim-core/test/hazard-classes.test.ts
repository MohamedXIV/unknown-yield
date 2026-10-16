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

it("turns a real pressure incident into persisted chamber damage repairable only with local parts", () => {
  const { sim, processorId } = armedHazardLine();
  expect(JSON.stringify(sim.snapshot())).not.toContain('"integrityDamage"');
  for (let n = 0; n < 500 && !sim.serialize().machines[processorId]!.incident; n++)
    sim.step(fixture.tickMs);
  const injured = sim.serialize();
  expect(injured.machines[processorId]).toMatchObject({
    incident: "chamber-blowout", enabled: false, integrity: 8000,
    incidentInventory: {},
  });
  expect(sim.snapshot().machines.find((m) => m.id === processorId)).toMatchObject({
    physicalCondition: "damaged", durationTicks: 39,
  });
  expect(auditLedger(fixture, injured).ok).toBe(true);
  const service = { type: "serviceMachine", machineId: processorId };
  expect(sim.preview(service)).toMatchObject({ ok: false });
  expect(sim.command(service)).toMatchObject({ ok: false });
  expect(sim.serialize()).toEqual(injured);

  // A real storage receives two replacement parts from a tracked deposit.
  const depot = sim.command({ type: "placeStorage", definitionId: "depot",
    x: 35, y: 36, direction: 0 });
  expect(depot.ok, depot.message).toBe(true);
  const delivered = sim.serialize();
  delivered.deposits["ferrite-field"] -= 2;
  delivered.storages[depot.id!]!.inventory.ferrite = 2;
  expect(sim.load(delivered).ok).toBe(true);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  const beforeRepair = sim.serialize();
  expect(sim.preview(service)).toMatchObject({ ok: true });
  expect(sim.serialize()).toEqual(beforeRepair);
  expect(sim.command(service)).toMatchObject({ ok: true });
  const repaired = sim.serialize();
  expect(repaired.machines[processorId]).toMatchObject({
    incident: null, enabled: false, integrity: 10000,
  });
  expect(repaired.storages[depot.id!]!.inventory.ferrite ?? 0).toBe(0);
  expect(repaired.flows.consumed.ferrite).toBe((beforeRepair.flows.consumed.ferrite ?? 0) + 2);
  expect(sim.snapshot().machines.find((m) => m.id === processorId)).toMatchObject({
    physicalCondition: "intact", durationTicks: 30,
  });
  expect(auditLedger(fixture, repaired).ok).toBe(true);
  const replay = new Simulation(fixture);
  expect(replay.load(JSON.parse(JSON.stringify(repaired))).ok).toBe(true);
  expect(sim.command({ type: "setEnabled", machineId: processorId, enabled: true }).ok)
    .toBe(true);
  expect(replay.command({ type: "setEnabled", machineId: processorId, enabled: true }).ok)
    .toBe(true);
  sim.step(500);
  replay.step(500);
  expect(replay.serialize()).toEqual(sim.serialize());
  expect(auditLedger(fixture, replay.serialize()).ok).toBe(true);
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


function armedFerriteHazardLine(content = fixture) {
  const sim = new Simulation(content);
  const state = sim.serialize();
  const prerequisite = content.reactions.find(
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
  initializeKnownMarkets(content, state);
  expect(sim.load(state).ok).toBe(true);

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
  return { sim, processorId };
}

it("scours an actual slag-jammed chamber, conserves residue and requires paid local cleaning", () => {
  const controlPack = structuredClone(fixture);
  controlPack.hazardClasses.find((h) => h.id === "instability")!.foulingWear = 0;
  const cleanContent = validateContent(controlPack);
  const active = armedFerriteHazardLine();
  const control = armedFerriteHazardLine(cleanContent);
  for (let tick = 0; tick < 500; tick++) {
    active.sim.step(fixture.tickMs);
    control.sim.step(cleanContent.tickMs);
    if (active.sim.serialize().machines[active.processorId]!.incident &&
        control.sim.serialize().machines[control.processorId]!.incident) break;
  }
  const fouled = active.sim.serialize().machines[active.processorId]!;
  const clean = control.sim.serialize().machines[control.processorId]!;
  expect(fouled).toMatchObject({
    incident: "slag-jam", enabled: false, wear: 300, integrity: 8800,
    incidentInventory: { residue: 1 },
  });
  expect(clean).toMatchObject({
    incident: "slag-jam", enabled: false, wear: 0, integrity: 10000,
    incidentInventory: { residue: 1 },
  });
  expect(active.sim.snapshot().machines.find(m => m.id === active.processorId))
    .toMatchObject({ physicalCondition: "damaged", durationTicks: 39 });
  expect(control.sim.snapshot().machines.find(m => m.id === control.processorId))
    .toMatchObject({ physicalCondition: "intact", durationTicks: 30 });
  expect(JSON.stringify(active.sim.snapshot())).not.toContain('"foulingWear"');
  expect(auditLedger(fixture, active.sim.serialize()).ok).toBe(true);
  expect(auditLedger(cleanContent, control.sim.serialize()).ok).toBe(true);

  const action = { type: "serviceMachine", machineId: active.processorId };
  const beforeRecovery = active.sim.serialize();
  expect(active.sim.preview(action)).toMatchObject({ ok: false });
  expect(active.sim.command(action)).toMatchObject({ ok: false });
  expect(active.sim.serialize()).toEqual(beforeRecovery);
  // Inventory remains physical: first move trapped residue into machine output.
  const recovery = { type: "recoverMachineIncident", machineId: active.processorId };
  expect(active.sim.preview(recovery)).toMatchObject({ ok: true });
  expect(active.sim.serialize()).toEqual(beforeRecovery);
  expect(active.sim.command(recovery)).toMatchObject({ ok: true });
  expect(active.sim.serialize().machines[active.processorId]!).toMatchObject({
    incident: null, enabled: false, input: {},
    output: { residue: 1 }, incidentInventory: {},
    wear: 300, integrity: 8800,
  });
  expect(active.sim.command(action)).toMatchObject({ ok: false });
  // Parts exist only at the specifically placed, nearby real depot.
  const depot = active.sim.command({
    type: "placeStorage", definitionId: "depot", x: 35, y: 30, direction: 0,
  });
  expect(depot.ok, depot.message).toBe(true);
  const delivered = active.sim.serialize();
  delivered.deposits["ferrite-field"] -= 2;
  delivered.storages[depot.id!]!.inventory.ferrite = 2;
  expect(active.sim.load(delivered).ok).toBe(true);
  expect(auditLedger(fixture, active.sim.serialize()).ok).toBe(true);

  const beforeService = active.sim.serialize();
  expect(active.sim.preview(action)).toMatchObject({ ok: true });
  expect(active.sim.serialize()).toEqual(beforeService);
  expect(active.sim.command(action)).toMatchObject({ ok: true });
  const serviced = active.sim.serialize();
  expect(serviced.storages[depot.id!]!.inventory.ferrite ?? 0).toBe(0);
  expect(serviced.flows.consumed.ferrite)
    .toBe((beforeService.flows.consumed.ferrite ?? 0) + 2);
  expect(serviced.machines[active.processorId]).toMatchObject({
    incident: null, enabled: false, wear: 0, integrity: 10000,
    output: { residue: 1 },
  });
  expect(active.sim.snapshot().machines.find(m => m.id === active.processorId))
    .toMatchObject({ physicalCondition: "intact", durationTicks: 30 });
  expect(auditLedger(fixture, serviced).ok).toBe(true);

  const restored = new Simulation(fixture);
  expect(restored.load(JSON.parse(JSON.stringify(serviced))).ok).toBe(true);
  expect(restored.serialize()).toEqual(serviced);
  expect(active.sim.command({ type: "setEnabled", machineId: active.processorId, enabled: true }).ok)
    .toBe(true);
  expect(restored.command({ type: "setEnabled", machineId: active.processorId, enabled: true }).ok)
    .toBe(true);
  active.sim.step(300);
  restored.step(300);
  expect(restored.serialize()).toEqual(active.sim.serialize());
  expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
});

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

  const beforeRecovery = restored.serialize();
  expect(
    restored.preview({
      type: "recoverMachineIncident",
      machineId: processorId,
    }),
  ).toMatchObject({ ok: true });
  expect(restored.serialize()).toEqual(beforeRecovery);

  expect(
    restored.command({
      type: "recoverMachineIncident",
      machineId: processorId,
    }),
  ).toMatchObject({
    ok: true,
    message: "Hazard material reclaimed to machine output",
  });
  expect(restored.serialize().machines[processorId]).toMatchObject({
    incident: null,
    enabled: false,
    incidentInventory: {},
    output: { residue: 1 },
  });
  expect(restored.serialize().hazardEvidence).toEqual(["slag-jam"]);
  expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);

  const recoveredSave = restored.serialize();
  const recoveredReload = new Simulation(fixture);
  expect(recoveredReload.load(JSON.parse(JSON.stringify(recoveredSave))).ok).toBe(
    true,
  );
  expect(recoveredReload.serialize()).toEqual(recoveredSave);

  for (
    let tick = 0;
    tick < 300 &&
    (recoveredReload.serialize().staging.residue ?? 0) < 1;
    tick++
  ) {
    recoveredReload.step(fixture.tickMs);
    expect(auditLedger(fixture, recoveredReload.serialize()).ok).toBe(true);
  }

  expect(
    recoveredReload.serialize().machines[processorId].output.residue ?? 0,
  ).toBe(0);
  expect(recoveredReload.serialize().staging.residue ?? 0).toBeGreaterThanOrEqual(
    1,
  );
  expect(recoveredReload.serialize().hazardEvidence).toEqual(["slag-jam"]);
  expect(auditLedger(fixture, recoveredReload.serialize()).ok).toBe(true);
});


it("unlocks an evidence-driven relief furnace that deterministically prevents the learned jam", () => {
  const { sim } = armedFerriteHazardLine();

  expect(
    sim.preview({
      type: "placeMachine",
      definitionId: "relief-furnace",
      x: 30,
      y: 30,
      direction: 0,
    }),
  ).toMatchObject({
    ok: false,
    message: "Capability locked by unconfirmed knowledge",
  });

  for (
    let tick = 0;
    tick < 500 && sim.serialize().hazardEvidence.length === 0;
    tick++
  )
    sim.step(fixture.tickMs);

  expect(sim.serialize().hazardEvidence).toContain("slag-jam");
  expect(
    sim.snapshot().definitions.find(
      (definition) => definition.id === "relief-furnace",
    )?.unlock,
  ).toEqual({
    unlocked: true,
    hintKey: "machine.relief-furnace.unlock-hint",
  });

  const safeId = build(sim, {
    type: "placeMachine",
    definitionId: "relief-furnace",
    x: 30,
    y: 30,
    direction: 0,
  });
  const staged = sim.serialize();
  staged.deposits["ferrite-field"] -= 2;
  staged.machines[safeId].input.ferrite = 2;
  expect(sim.load(staged).ok).toBe(true);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);

  for (
    let tick = 0;
    tick < 200 &&
    !sim.serialize().knowledge.includes("heat-ferrite-relieved");
    tick++
  ) {
    sim.step(fixture.tickMs);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  }

  expect(sim.serialize().knowledge).toContain("heat-ferrite-relieved");
  expect(sim.serialize().machines[safeId]).toMatchObject({
    incident: null,
    incidentInventory: {},
  });
  expect(sim.serialize().machines[safeId].output.residue).toBeGreaterThanOrEqual(
    1,
  );
  expect(sim.serialize().hazardEvidence).toEqual(["slag-jam"]);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
});


it("recovers actual trapped incident cargo directly into adjacent storage, not global stock", () => {
  const { sim, processorId } = armedFerriteHazardLine();
  for (let n = 0; n < 500 && !sim.serialize().machines[processorId].incident; n++)
    sim.step(fixture.tickMs);
  expect(sim.serialize().machines[processorId].incidentInventory).toEqual({ residue: 1 });
  const command = { type: "recoverIncidentToReceiver", machineId: processorId };
  const waiting = sim.serialize();
  expect(sim.snapshot().machines.find(m => m.id === processorId)?.incidentRecovery)
    .toMatchObject({ ready: false, reason: "no-local-storage", units: 1 });
  expect(sim.preview(command).ok).toBe(false);
  expect(sim.command(command).ok).toBe(false);
  expect(sim.serialize()).toEqual(waiting);

  const storage = sim.command({
    type: "placeStorage", definitionId: "depot", x: 34, y: 29, direction: 0,
  });
  expect(storage.ok, storage.message).toBe(true);
  expect(sim.snapshot().machines.find(m => m.id === processorId)?.incidentRecovery)
    .toMatchObject({ ready: true, reason: null, units: 1, handlingState: "solid" });
  const before = sim.serialize();
  expect(sim.preview(command).ok).toBe(true);
  expect(sim.serialize()).toEqual(before);
  expect(sim.command(command).ok).toBe(true);
  const done = sim.serialize();
  expect(done.machines[processorId]).toMatchObject({
    enabled: false, incident: null, incidentInventory: {},
  });
  expect(done.machines[processorId].output.residue ?? 0).toBe(before.machines[processorId].output.residue ?? 0);
  expect(done.storages[storage.id!]!.inventory.residue).toBe(1);
  expect(done.flows).toEqual(before.flows);
  expect(done.stock).toEqual(before.stock);
  expect(auditLedger(fixture, done).ok).toBe(true);
  const restored = new Simulation(fixture);
  expect(restored.load(done).ok).toBe(true);
  sim.step(1200);
  restored.step(1200);
  expect(restored.serialize()).toEqual(sim.serialize());
});

it("refuses hazard discharge into a full physical store without moving a unit", () => {
  const { sim, processorId } = armedFerriteHazardLine();
  for (let n = 0; n < 500 && !sim.serialize().machines[processorId].incident; n++)
    sim.step(fixture.tickMs);
  const store = sim.command({ type: "placeStorage", definitionId: "depot",
    x: 34, y: 29, direction: 0 });
  expect(store.ok, store.message).toBe(true);
  const state = sim.serialize();
  const capacity = fixture.storages.find(s => s.id === "depot")!.capacity;
  state.deposits["ferrite-field"] -= capacity;
  state.storages[store.id!]!.inventory.ferrite = capacity;
  expect(sim.load(state).ok).toBe(true);
  const waiting = sim.serialize(), command = {
    type: "recoverIncidentToReceiver", machineId: processorId,
  };
  expect(sim.snapshot().machines.find(m => m.id === processorId)?.incidentRecovery)
    .toMatchObject({ ready: false, reason: "insufficient-capacity" });
  expect(sim.preview(command).ok).toBe(false);
  expect(sim.command(command).ok).toBe(false);
  expect(sim.serialize()).toEqual(waiting);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
});


function fluidHazardVariant(phase: "liquid" | "gas") {
  const draft = structuredClone(fixture);
  draft.materials.find((m) => m.id === "residue")!.handlingState = phase;
  for (const machine of draft.machines) {
    machine.outputStates = [...new Set([...machine.outputStates, phase])];
    machine.inputStates = [...new Set([...machine.inputStates, phase])];
  }
  // This is a fully authored phase-specific incident world. The hazard is
  // still the original real completed reaction, not a forged runtime record.
  return validateContent(draft);
}

for (const phase of ["liquid", "gas"] as const)
  it("routes actual trapped " + phase + " incident output only to real local phase-specific containers", () => {
    const c = fluidHazardVariant(phase);
    const { sim, processorId } = armedFerriteHazardLine(c);
    for (let n = 0; n < 500 && !sim.serialize().machines[processorId].incident; n++)
      sim.step(c.tickMs);
    expect(sim.serialize().machines[processorId]).toMatchObject({
      incident: "slag-jam", enabled: false,
      incidentInventory: { residue: 1 },
    });
    const command = { type: "recoverIncidentToReceiver", machineId: processorId };
    const absent = sim.snapshot().machines.find(m => m.id === processorId)!.incidentRecovery;
    expect(absent).toMatchObject({
      ready: false,
      reason: phase === "liquid" ? "no-local-tank" : "no-local-vessel",
      units: 1, handlingState: phase,
    });
    const beforePlacement = sim.serialize();
    expect(sim.preview(command).ok).toBe(false);
    expect(sim.command(command).ok).toBe(false);
    expect(sim.serialize()).toEqual(beforePlacement);
    const receiver = phase === "liquid"
      ? sim.command({ type: "placeTank", x: 34, y: 29, direction: 0,
        containmentProfileId: "standard" })
      : sim.command({ type: "placePressureVessel", x: 34, y: 29, direction: 0 });
    expect(receiver.ok, receiver.message).toBe(true);
    expect(sim.snapshot().machines.find(m => m.id === processorId)!.incidentRecovery)
      .toMatchObject({ ready: true, reason: null, units: 1 });
    const before = sim.serialize();
    expect(sim.preview(command).ok).toBe(true);
    expect(sim.serialize()).toEqual(before);
    expect(sim.command(command).ok).toBe(true);
    const after = sim.serialize(), m = after.machines[processorId];
    expect(m).toMatchObject({ incident: null, incidentInventory: {}, enabled: false });
    expect(m.output.residue ?? 0).toBe(before.machines[processorId].output.residue ?? 0);
    const item = phase === "liquid"
      ? after.tanks[receiver.id!]! : after.pressureVessels[receiver.id!]!;
    expect(item).toMatchObject({ materialId: "residue", quantity: 1 });
    expect(after.flows).toEqual(before.flows);
    expect(after.stock).toEqual(before.stock);
    expect(auditLedger(c, after).ok).toBe(true);
    const restored = new Simulation(c);
    expect(restored.load(after).ok).toBe(true);
    sim.step(1000); restored.step(1000);
    expect(restored.serialize()).toEqual(sim.serialize());
  });
