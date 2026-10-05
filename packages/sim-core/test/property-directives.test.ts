import { expect, it } from "vitest";
import { fixture } from "@site/content";
import { ensureMarket } from "../src/market";
import { refreshMilestones } from "../src/milestones";
import {
  opportunityViews,
  recordDirectiveExperiment,
  refreshOpportunities,
} from "../src/opportunities";
import { Simulation } from "../src/simulation";
import { initialState } from "../src/save";
import { experimentEvidenceKey } from "../src/types";

function confirmReaction(
  state: ReturnType<typeof initialState>,
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
  state.policies[reaction.output] ??= "keep";
  ensureMarket(fixture, state, reaction.output);
}

function matrixKnownState() {
  const state = initialState(fixture);
  confirmReaction(state, "sinter-orbital-binder");
  state.tick = fixture.economy.marketEveryTicks;
  refreshOpportunities(fixture, state);
  return state;
}

it("offers a property target without exposing its hidden acceptable reaction", () => {
  const state = matrixKnownState();
  const view = opportunityViews(fixture, state).find(
    (entry) => entry.id === "matrix-local-route",
  );
  expect(view).toMatchObject({
    kind: "property-directive",
    targetMaterialId: "matrix",
    propertyKey: "property.matrix-local-route.name",
    rewardFuel: 0,
    rewardImportSupplyId: "orbital-coolant-canister",
  });
  expect(JSON.stringify(view)).not.toContain("sinter-catalyst");
  expect(JSON.stringify(view)).not.toContain("solutionReactionIds");
});

it("grants one persisted import allocation when an accepted solution is confirmed", () => {
  const state = matrixKnownState();
  const beforeFuel = state.fuel;
  confirmReaction(state, "sinter-catalyst");
  recordDirectiveExperiment(fixture, state, "sinter", "catalyst", null);

  expect(state.opportunities["matrix-local-route"]).toMatchObject({
    status: "completed",
    progress: 1,
    completedAt: state.tick,
  });
  expect(state.fuel).toBe(beforeFuel);
  expect(state.company.importAllocations).toEqual({
    "orbital-coolant-canister": 1,
  });

  recordDirectiveExperiment(fixture, state, "sinter", "catalyst", null);
  expect(state.company.importAllocations).toEqual({
    "orbital-coolant-canister": 1,
  });

  const sim = new Simulation(fixture);
  expect(sim.load(state).ok).toBe(true);
  expect(sim.serialize()).toEqual(state);
});

it("spends an allocation only after the physical import gate accepts cargo", () => {
  const state = matrixKnownState();
  confirmReaction(state, "sinter-catalyst");
  recordDirectiveExperiment(fixture, state, "sinter", "catalyst", null);
  confirmReaction(state, "heat-raw-sealed");
  refreshMilestones(fixture, state);
  refreshMilestones(fixture, state);
  ensureMarket(fixture, state, "granules");
  state.fuel = 0;

  const sim = new Simulation(fixture);
  expect(sim.load(state).ok).toBe(true);

  const blocked = sim.command({
    type: "requestImport",
    supplyId: "orbital-coolant-canister",
  });
  expect(blocked.ok).toBe(false);
  expect(blocked.messageKey).toBe("ui.terminal.import.result.module-missing");
  expect(sim.serialize().company.importAllocations).toEqual({
    "orbital-coolant-canister": 1,
  });

  expect(
    sim.command({
      type: "installTerminalModule",
      definitionId: "cryo-dock",
    }).ok,
  ).toBe(true);
  const fuelBeforeClaim = sim.serialize().fuel;
  const claimed = sim.command({
    type: "requestImport",
    supplyId: "orbital-coolant-canister",
  });
  expect(claimed.ok).toBe(true);
  expect(claimed.cost).toBe(0);
  expect(sim.serialize().fuel).toBe(fuelBeforeClaim);
  expect(sim.serialize().company.importAllocations).toEqual({});
  expect(sim.serialize().terminalModules["cryo-dock"]).toEqual({
    materialId: "orbital-coolant",
    quantity: 4,
  });
});

it("migrates schema 24 to empty allocations and rejects future state in legacy saves", () => {
  const current = new Simulation(fixture).serialize();
  const legacy = structuredClone(current) as Record<string, unknown>;
  legacy.schemaVersion = 24;
  delete (legacy.company as Record<string, unknown>).importAllocations;

  const restored = new Simulation(fixture);
  expect(restored.load(legacy).ok).toBe(true);
  expect(restored.serialize().schemaVersion).toBe(27);
  expect(restored.serialize().company.importAllocations).toEqual({});

  const impossible = structuredClone(current) as Record<string, unknown>;
  impossible.schemaVersion = 24;
  (impossible.company as Record<string, unknown>).importAllocations = {
    "orbital-coolant-canister": 1,
  };
  expect(restored.load(impossible).ok).toBe(false);

  const missing = structuredClone(current) as Record<string, unknown>;
  delete (missing.company as Record<string, unknown>).importAllocations;
  expect(restored.load(missing).ok).toBe(false);
});
