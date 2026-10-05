import { expect, it } from "vitest";
import { fixture } from "@site/content";
import { initialState } from "../src/save";
import {
  ensureMarket,
  marketBulletins,
  recoverMarkets,
  refreshMarketSignals,
} from "../src/market";
import { refreshOpportunities } from "../src/opportunities";
import { Simulation } from "../src/simulation";
import { experimentEvidenceKey } from "../src/types";

function characterizeMatrix() {
  const state = initialState(fixture);
  const reaction = fixture.reactions.find(
    (entry) => entry.id === "sinter-orbital-binder",
  )!;
  state.knowledge.push(reaction.id);
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
  state.policies.matrix = "export";
  ensureMarket(fixture, state, "matrix");
  return state;
}

it("keeps future listing, opportunity and bulletin truth hidden before characterization", () => {
  const sim = new Simulation(fixture);
  expect(sim.snapshot().exchange).not.toContainEqual(
    expect.objectContaining({ materialId: "matrix" }),
  );
  expect(sim.snapshot().marketBulletins).toEqual([]);
  expect(sim.snapshot().opportunities).not.toContainEqual(
    expect.objectContaining({ id: "matrix-procurement" }),
  );
  expect(JSON.stringify(sim.snapshot())).not.toContain(
    "Orbital resonance application identified",
  );
});

it("creates one persistent demand shock and procurement opportunity from confirmed discovery", () => {
  const state = characterizeMatrix();
  state.tick = fixture.economy.marketEveryTicks;

  recoverMarkets(fixture, state);
  refreshMarketSignals(fixture, state);
  refreshOpportunities(fixture, state);

  expect(state.market.matrix.demandBps).toBe(15000);
  expect(state.marketSignals).toEqual({
    "resonance-orbital-application": { triggeredAt: state.tick },
  });
  expect(state.opportunities["matrix-procurement"]).toMatchObject({
    status: "offered",
    offeredAt: state.tick,
    progress: 0,
  });
  expect(marketBulletins(fixture, state)).toEqual([
    expect.objectContaining({
      id: "resonance-orbital-application",
      materialId: "matrix",
      demandDeltaBps: 5000,
      triggeredAt: state.tick,
    }),
  ]);

  refreshMarketSignals(fixture, state);
  expect(state.market.matrix.demandBps).toBe(15000);

  recoverMarkets(fixture, state);
  expect(state.market.matrix.demandBps).toBe(14900);
});

it("persists bulletin memory and cannot replay it after save/load", () => {
  const state = characterizeMatrix();
  state.tick = fixture.economy.marketEveryTicks;
  refreshMarketSignals(fixture, state);
  refreshOpportunities(fixture, state);

  const sim = new Simulation(fixture);
  expect(sim.load(structuredClone(state)).ok).toBe(true);
  const restored = sim.serialize();
  expect(restored.schemaVersion).toBe(25);
  expect(restored.marketSignals).toEqual(state.marketSignals);
  expect(sim.snapshot().marketBulletins).toHaveLength(1);

  const demand = restored.market.matrix.demandBps;
  refreshMarketSignals(fixture, restored);
  expect(restored.market.matrix.demandBps).toBe(demand);
});

it("migrates schema 23 to empty bulletin history and rejects impossible legacy history", () => {
  const current = new Simulation(fixture).serialize();
  const legacy = structuredClone(current) as Record<string, unknown>;
  legacy.schemaVersion = 23;
  delete legacy.marketSignals;

  const restored = new Simulation(fixture);
  expect(restored.load(legacy).ok).toBe(true);
  expect(restored.serialize().schemaVersion).toBe(25);
  expect(restored.serialize().marketSignals).toEqual({});

  const impossible = structuredClone(current) as Record<string, unknown>;
  impossible.schemaVersion = 23;
  impossible.marketSignals = {
    "resonance-orbital-application": { triggeredAt: 0 },
  };
  expect(restored.load(impossible).ok).toBe(false);

  const missing = structuredClone(current) as Record<string, unknown>;
  delete missing.marketSignals;
  expect(restored.load(missing).ok).toBe(false);
});
