import { expect, it } from "vitest";
import { fixture } from "@site/content";
import { auditLedger } from "../src/ledger";
import { refreshMilestones } from "../src/milestones";
import { initializeKnownMarkets } from "../src/market";
import { Simulation } from "../src/simulation";
import { experimentEvidenceKey } from "../src/types";
import { terminalState } from "./terminal-helpers";

function addConfirmedReaction(
  state: ReturnType<typeof terminalState>,
  reactionId: string,
) {
  const reaction = fixture.reactions.find((entry) => entry.id === reactionId)!;
  if (!state.knowledge.includes(reactionId)) state.knowledge.push(reactionId);
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
  initializeKnownMarkets(fixture, state);
  refreshMilestones(fixture, state);
  refreshMilestones(fixture, state);
}

it("requires an unlocked installed gas dock, then releases imported gas physically", () => {
  const sim = new Simulation(fixture);
  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-propellant-cylinder",
    }).messageKey,
  ).toBe("ui.terminal.import.result.locked");

  const state = terminalState();
  expect(sim.load(state).ok).toBe(true);
  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-propellant-cylinder",
    }).messageKey,
  ).toBe("ui.terminal.import.result.module-missing");
  expect(
    sim.command({
      type: "installTerminalModule",
      definitionId: "gas-dock",
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-propellant-cylinder",
    }).ok,
  ).toBe(true);
  expect(sim.serialize().terminalModules["gas-dock"]).toEqual({
    materialId: "orbital-propellant",
    quantity: 4,
  });
  expect(sim.serialize().stock["orbital-propellant"]).toBeUndefined();

  expect(
    sim.command({
      type: "placePressureLines",
      points: [{ x: 42, y: 27, inlet: 2, outlet: 0 }],
    }).ok,
  ).toBe(true);
  sim.step(fixture.tickMs * fixture.site.transportEveryTicks);
  const after = sim.serialize();
  expect(after.pressureLines["42,27"].materialId).toBe("orbital-propellant");
  expect(after.pressureLines["42,27"].quantity).toBe(1);
  expect(after.terminalModules["gas-dock"].quantity).toBe(3);
  expect(auditLedger(fixture, after).ok).toBe(true);
});

it("enforces cryogenic, hazardous and secure containment on inbound liquid", () => {
  const state = terminalState();
  addConfirmedReaction(state, "heat-raw-sealed");
  const sim = new Simulation(fixture);
  expect(sim.load(state).ok).toBe(true);
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
  expect(sim.snapshot().importSupplies.find(
    (entry) => entry.id === "orbital-coolant-canister",
  )?.held).toBe(4);

  expect(
    sim.command({
      type: "placePipes",
      containmentProfileId: "standard",
      points: [{ x: 37, y: 27, inlet: 0, outlet: 2 }],
    }).ok,
  ).toBe(true);
  sim.step(fixture.tickMs * fixture.site.transportEveryTicks);
  expect(sim.serialize().terminalModules["cryo-dock"].quantity).toBe(4);
  expect(sim.serialize().pipes["37,27"].quantity).toBe(0);

  expect(
    sim.command({
      type: "dismantle",
      id: sim.serialize().pipes["37,27"].id,
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "placePipes",
      containmentProfileId: "sealed-cold",
      points: [{ x: 37, y: 27, inlet: 0, outlet: 2 }],
    }).ok,
  ).toBe(true);
  sim.step(fixture.tickMs * fixture.site.transportEveryTicks);
  const after = sim.serialize();
  expect(after.pipes["37,27"].materialId).toBe("orbital-coolant");
  expect(after.pipes["37,27"].quantity).toBe(1);
  expect(after.terminalModules["cryo-dock"].quantity).toBe(3);
  expect(auditLedger(fixture, after).ok).toBe(true);

  const restored = new Simulation(fixture);
  expect(restored.load(after).ok).toBe(true);
  expect(restored.serialize()).toEqual(after);
});
