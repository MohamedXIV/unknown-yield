import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  applyExportCompensation,
  experimentEvidenceKey,
  initializeKnownMarkets,
  recordOrderExport,
  refreshOpportunities,
} from "../src/index";
import { initialState } from "../src/save";

function confirm(
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
}

function diversifiedMarketState() {
  const state = initialState(fixture);
  for (const reactionId of [
    "crush-raw",
    "heat-ferrite",
    "crush-catalyst",
  ])
    confirm(state, reactionId);
  initializeKnownMarkets(fixture, state);
  state.tick = fixture.economy.marketEveryTicks;
  refreshOpportunities(fixture, state);
  state.fuel = 0;
  return state;
}

function strategyFuel(
  round: readonly (readonly [materialId: string, units: number])[],
) {
  const state = diversifiedMarketState();
  for (let shipment = 0; shipment < 2; shipment++)
    for (const [materialId, units] of round) {
      applyExportCompensation(fixture, state, materialId, units);
      recordOrderExport(fixture, state, materialId, units);
    }
  return state.fuel;
}

function listing(materialId: string) {
  return fixture.economy.exchange.find(
    (entry) => entry.materialId === materialId,
  )!;
}

function importUnitFuel(supplyId: string) {
  const supply = fixture.economy.imports.find((entry) => entry.id === supplyId)!;
  return supply.fuelCost / supply.quantity;
}

describe("Phase 15 pacing and diversification balance", () => {
  it("makes a sustained diversified export basket beat every comparable single-product dump", () => {
    const granulesOnly = strategyFuel([["granules", 12]]);
    const ceramicOnly = strategyFuel([["ferrite-ceramic", 12]]);
    const powderOnly = strategyFuel([["catalyst-powder", 12]]);
    const diversified = strategyFuel([
      ["granules", 4],
      ["ferrite-ceramic", 2],
      ["catalyst-powder", 6],
    ]);

    expect(granulesOnly).toBe(216);
    expect(ceramicOnly).toBe(216);
    expect(powderOnly).toBe(208);
    expect(diversified).toBe(284);
    expect(diversified).toBeGreaterThanOrEqual(
      Math.ceil(Math.max(granulesOnly, ceramicOnly, powderOnly) * 1.25),
    );
  });

  it("keeps corporate premiums bounded and avoids grind-sized procurement targets", () => {
    for (const order of fixture.economy.orders) {
      const exchange = listing(order.materialId);
      expect(order.quantity).toBeLessThanOrEqual(4);
      expect(order.rewardFuel / order.quantity).toBeLessThanOrEqual(
        exchange.baseCompensation,
      );
    }

    for (const milestone of fixture.economy.milestones)
      for (const requirement of milestone.requires)
        if (requirement.type === "material-exported")
          expect(requirement.units).toBeLessThanOrEqual(4);
  });

  it("keeps ordinary recovery products viable at market floors without making advanced chains self-funding", () => {
    const crusher = fixture.machines.find((entry) => entry.id === "crusher")!;
    const furnace = fixture.machines.find((entry) => entry.id === "furnace")!;

    expect(listing("granules").floorCompensation).toBeGreaterThan(
      crusher.fuel,
    );
    expect(listing("catalyst-powder").floorCompensation).toBeGreaterThan(
      crusher.fuel,
    );
    expect(listing("ferrite-ceramic").floorCompensation).toBeGreaterThan(
      furnace.fuel,
    );

    const coolantUnitFuel = importUnitFuel("orbital-coolant-canister");
    const propellantUnitFuel = importUnitFuel("orbital-propellant-cylinder");

    // One local Matrix batch consumes one research-coolant unit.
    const matrix = listing("matrix");
    expect(matrix.floorCompensation).toBeLessThan(coolantUnitFuel);
    expect(matrix.baseCompensation).toBeGreaterThan(coolantUnitFuel);

    // One native Phase ceramic unit needs deep extraction (propellant) plus
    // quench + stabilization (two coolant units). It is attractive while
    // demand is fresh, but saturated exports cannot finance the same loop.
    const phaseCeramicOperatingFuel =
      propellantUnitFuel + 2 * coolantUnitFuel;
    const phaseCeramic = listing("phase-ceramic");
    expect(phaseCeramic.floorCompensation).toBeLessThan(
      phaseCeramicOperatingFuel,
    );
    expect(phaseCeramic.baseCompensation).toBeGreaterThan(
      phaseCeramicOperatingFuel,
    );
  });

  it("offers bounded premiums for both alternate material-family branches", () => {
    const state = diversifiedMarketState();
    expect(state.opportunities["magnetic-ceramic-procurement"]).toMatchObject({
      status: "offered",
      progress: 0,
    });
    expect(state.opportunities["catalyst-powder-reserve"]).toMatchObject({
      status: "offered",
      progress: 0,
    });
  });
});
