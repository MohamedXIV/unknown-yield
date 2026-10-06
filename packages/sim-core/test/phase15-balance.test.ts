import { expect, it } from "vitest";
import { fixture, validateContent } from "@site/content";
import {
  Simulation,
  applyExportCompensation,
  initializeKnownMarkets,
} from "../src/index";

function marketKnownContent() {
  const content = structuredClone(fixture);
  for (const listing of content.economy.exchange)
    content.materials.find(
      (material) => material.id === listing.materialId,
    )!.known = true;
  return validateContent(content);
}

function revenue(
  content: ReturnType<typeof marketKnownContent>,
  lots: { materialId: string; units: number }[],
) {
  const sim = new Simulation(content);
  const state = sim.serialize();
  state.fuel = 0;
  state.debt = 0;
  initializeKnownMarkets(content, state);

  let gross = 0;
  for (const lot of lots)
    gross += applyExportCompensation(
      content,
      state,
      lot.materialId,
      lot.units,
    ).gross;
  return gross;
}

it("makes a diversified shipment plan outperform repeated spam of the top listing", () => {
  const content = marketKnownContent();
  const ranked = [...content.economy.exchange].sort(
    (a, b) => b.baseCompensation - a.baseCompensation,
  );
  const lot = 4;
  const top = ranked[0].materialId;

  const spam = revenue(content, [
    { materialId: top, units: lot },
    { materialId: top, units: lot },
    { materialId: top, units: lot },
  ]);
  const diversified = revenue(
    content,
    ranked.slice(0, 3).map((listing) => ({
      materialId: listing.materialId,
      units: lot,
    })),
  );

  expect(lot * 3).toBeLessThanOrEqual(content.site.terminalShipmentCapacity);
  expect(diversified).toBeGreaterThan(spam);
});

it("does not let the late Phase ceramic chain become a sustained self-funding fuel loop", () => {
  const content = marketKnownContent();
  const propellant = content.economy.imports.find(
    (entry) => entry.id === "orbital-propellant-cylinder",
  )!;
  const coolant = content.economy.imports.find(
    (entry) => entry.id === "orbital-coolant-canister",
  )!;
  const deep = content.machines.find(
    (entry) => entry.id === "deep-extractor",
  )!;
  const quencher = content.machines.find(
    (entry) => entry.id === "phase-quencher",
  )!;
  const stabilizer = content.machines.find(
    (entry) => entry.id === "phase-stabilizer",
  )!;

  const operatingFuelCost = (units: number) =>
    Math.ceil((units * deep.fuel) / propellant.quantity) *
      propellant.fuelCost +
    Math.ceil(
      (units * (quencher.fuel + stabilizer.fuel)) / coolant.quantity,
    ) *
      coolant.fuelCost;

  const firstFourRevenue = revenue(content, [
    { materialId: "phase-ceramic", units: 4 },
  ]);
  const firstEightRevenue = revenue(content, [
    { materialId: "phase-ceramic", units: 4 },
    { materialId: "phase-ceramic", units: 4 },
  ]);

  expect(firstFourRevenue).toBeGreaterThan(operatingFuelCost(4));
  expect(firstEightRevenue).toBeLessThan(operatingFuelCost(8));
});

it("keeps one-shot company bonuses as diversification prompts rather than repeatable fuel income", () => {
  expect(
    fixture.economy.orders.map((entry) => entry.materialId).sort(),
  ).toEqual(["granules", "matrix"]);
  expect(
    fixture.economy.propertyDirectives.every(
      (entry) => entry.rewardFuel === 0 && !!entry.rewardImportSupplyId,
    ),
  ).toBe(true);
});
