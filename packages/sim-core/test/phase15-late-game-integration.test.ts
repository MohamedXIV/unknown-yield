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
  expect(result.ok, JSON.stringify(command) + ": " + result.message).toBe(true);
  return result.id!;
}

function confirm(
  state: ReturnType<Simulation["serialize"]>,
  reactionId: string,
) {
  const reaction = fixture.reactions.find((entry) => entry.id === reactionId)!;
  if (!state.knowledge.includes(reaction.id)) state.knowledge.push(reaction.id);
  state.evidence[
    experimentEvidenceKey(
      reaction.operation,
      reaction.input,
      reaction.processConditionId ?? null,
    )
  ] = {
    operationId: reaction.operation,
    inputId: reaction.input,
    processConditionId: reaction.processConditionId ?? null,
    state: "confirmed",
  };
}

function auditOk(sim: Simulation) {
  const report = auditLedger(fixture, sim.serialize());
  expect(report.ok, JSON.stringify(report.mismatches)).toBe(true);
}

it("integrates late Phase lattice hazard, sealed-cold handling and underground liquid logistics", () => {
  const sim = new Simulation(fixture);

  // #149 begins from an accepted post-#148 checkpoint: company R&D already
  // produced Phase lattice and the expedition has the prerequisite handling
  // evidence. The two units below are accounted as historical reaction output,
  // then all #149 behavior proceeds through ordinary commands and ticks.
  const prior = sim.serialize();
  prior.fuel = 500;
  for (const id of [
    "sinter-resonance-seed",
    "collect-gas-0",
    "heat-raw-sealed",
    "vaporize-liquid-0",
  ])
    confirm(prior, id);
  prior.flows.produced["phase-lattice"] = 2;
  initializeKnownMarkets(fixture, prior);
  expect(sim.load(prior).ok).toBe(true);

  expect(
    sim.snapshot().definitions.find((entry) => entry.id === "phase-quencher")
      ?.unlock,
  ).toEqual({
    unlocked: true,
    hintKey: "machine.phase-quencher.unlock-hint",
  });

  expect(
    sim.command({
      type: "installTerminalModule",
      definitionId: "cryo-dock",
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-coolant-canister",
    }).ok,
  ).toBe(true);

  const factoryId = build(sim, {
    type: "placeFactory",
    x: 23,
    y: 33,
    width: 20,
    height: 10,
  });
  expect(factoryId).toBeTruthy();

  const quencherId = build(sim, {
    type: "placeMachine",
    definitionId: "phase-quencher",
    x: 25,
    y: 35,
    direction: 0,
  });
  const hazardId = build(sim, {
    type: "placeMachine",
    definitionId: "oversealed-furnace",
    x: 25,
    y: 39,
    direction: 0,
  });
  const pumpId = build(sim, {
    type: "placePump",
    x: 27,
    y: 36,
    direction: 0,
    containmentProfileId: "sealed-cold",
  });

  const standardRoute = build(sim, {
    type: "placeUndergroundLiquid",
    entry: { x: 28, y: 36 },
    exit: { x: 34, y: 36 },
    containmentProfileId: "standard",
  });

  // The buried middle span still frees the surface for another logistics layer.
  expect(
    sim.command({
      type: "placeBelts",
      points: [{ x: 31, y: 36 }],
      direction: 1,
    }).ok,
  ).toBe(true);

  const staged = sim.serialize();
  staged.machines[quencherId].input["phase-lattice"] = 1;
  staged.machines[hazardId].input["phase-lattice"] = 1;
  expect(sim.load(staged).ok).toBe(true);
  auditOk(sim);

  for (
    let tick = 0;
    tick < 120 &&
    (!sim.serialize().knowledge.includes("phase-quench-lattice") ||
      !sim.serialize().machines[hazardId].incident);
    tick++
  ) {
    sim.step(fixture.tickMs);
    auditOk(sim);
  }

  expect(sim.serialize().knowledge).toContain("phase-quench-lattice");
  expect(sim.serialize().machines[quencherId].output).toMatchObject({
    "phase-suspension": 1,
  });
  expect(sim.serialize().machines[hazardId]).toMatchObject({
    incident: "phase-shear-lock",
    enabled: false,
    incidentInventory: { residue: 1 },
  });
  expect(sim.serialize().hazardEvidence).toContain("phase-shear-lock");
  expect(
    sim.snapshot().hazardEvidence.find(
      (entry) => entry.id === "phase-shear-lock",
    ),
  ).toMatchObject({
    classId: "instability",
    operationId: "heat",
    inputId: "phase-lattice",
  });

  expect(
    sim.command({
      type: "recoverMachineIncident",
      machineId: hazardId,
    }),
  ).toMatchObject({
    ok: true,
    message: "Hazard material reclaimed to machine output",
  });
  expect(sim.serialize().machines[hazardId]).toMatchObject({
    incident: null,
    enabled: false,
    incidentInventory: {},
    output: { residue: 1 },
  });
  auditOk(sim);

  // A protected source pump cannot push the late-game liquid into a Standard
  // buried route: the cargo remains at the machine instead of disappearing.
  for (let tick = 0; tick < fixture.site.transportEveryTicks + 2; tick++)
    sim.step(fixture.tickMs);
  expect(sim.serialize().machines[quencherId].output["phase-suspension"]).toBe(1);
  expect(sim.serialize().undergroundLiquids[standardRoute]).toMatchObject({
    materialId: null,
    quantity: 0,
  });
  expect(
    sim.snapshot().pumps.find((entry) => entry.id === pumpId)?.status,
  ).toBe("incompatible");
  auditOk(sim);

  expect(sim.command({ type: "dismantle", id: standardRoute }).ok).toBe(true);
  const protectedRoute = build(sim, {
    type: "placeUndergroundLiquid",
    entry: { x: 28, y: 36 },
    exit: { x: 34, y: 36 },
    containmentProfileId: "sealed-cold",
  });

  const stabilizerId = build(sim, {
    type: "placeMachine",
    definitionId: "phase-stabilizer",
    x: 36,
    y: 35,
    direction: 0,
  });
  build(sim, {
    type: "placePipes",
    containmentProfileId: "sealed-cold",
    points: [{ x: 35, y: 36, inlet: 2, outlet: 0 }],
  });

  // The protected route now admits the exact same physical liquid under the
  // same cadence, preserving its authored containment profile in transit.
  for (
    let tick = 0;
    tick < 80 &&
    sim.serialize().undergroundLiquids[protectedRoute].quantity === 0;
    tick++
  )
    sim.step(fixture.tickMs);

  expect(sim.serialize().machines[quencherId].output["phase-suspension"] ?? 0).toBe(
    0,
  );
  expect(sim.serialize().undergroundLiquids[protectedRoute]).toMatchObject({
    materialId: "phase-suspension",
    quantity: 1,
    containmentProfileId: "sealed-cold",
  });
  auditOk(sim);

  const midTransit = sim.serialize();
  const restored = new Simulation(fixture);
  expect(restored.load(structuredClone(midTransit)).ok).toBe(true);
  expect(restored.serialize()).toEqual(midTransit);

  for (
    let tick = 0;
    tick < 180 &&
    !sim.serialize().knowledge.includes("phase-stabilize-suspension");
    tick++
  ) {
    sim.step(fixture.tickMs);
    restored.step(fixture.tickMs);
    expect(restored.serialize()).toEqual(sim.serialize());
    auditOk(sim);
  }

  expect(sim.serialize().knowledge).toContain("phase-stabilize-suspension");
  expect(sim.serialize().machines[stabilizerId].output["phase-ceramic"]).toBe(1);
  expect(
    sim.snapshot().exchange.find(
      (entry) => entry.materialId === "phase-ceramic",
    ),
  ).toBeDefined();
  expect(
    sim.serialize().terminalModules["cryo-dock"],
  ).toMatchObject({
    materialId: "orbital-coolant",
    quantity: 2,
  });
  auditOk(sim);

  const finalState = sim.serialize();
  const finalReload = new Simulation(fixture);
  expect(finalReload.load(structuredClone(finalState)).ok).toBe(true);
  expect(finalReload.serialize()).toEqual(finalState);
  for (let tick = 0; tick < 20; tick++) {
    sim.step(fixture.tickMs);
    finalReload.step(fixture.tickMs);
    expect(finalReload.serialize()).toEqual(sim.serialize());
    auditOk(sim);
  }
});
