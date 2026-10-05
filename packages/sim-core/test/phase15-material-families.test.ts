import { expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  companyKnowsMaterial,
  ensureMarket,
  marketListings,
} from "../src/market";

it("keeps Phase 15 family markets hidden until their process result is known", () => {
  const state = {
    knowledge: [] as string[],
    market: {} as Record<
      string,
      { demandBps: number; saturationBps: number }
    >,
    milestones: {},
  };

  for (const materialId of ["ferrite-ceramic", "catalyst-powder"]) {
    expect(companyKnowsMaterial(fixture, state, materialId)).toBe(false);
    expect(ensureMarket(fixture, state, materialId)).toBeNull();
  }
  expect(
    marketListings(fixture, state).some(
      (listing) => listing.materialId === "ferrite-ceramic",
    ),
  ).toBe(false);

  state.knowledge.push("heat-ferrite");
  expect(companyKnowsMaterial(fixture, state, "ferrite-ceramic")).toBe(true);
  expect(ensureMarket(fixture, state, "ferrite-ceramic")).toEqual({
    demandBps: 10000,
    saturationBps: 0,
  });
  expect(
    marketListings(fixture, state).find(
      (listing) => listing.materialId === "ferrite-ceramic",
    ),
  ).toMatchObject({
    materialId: "ferrite-ceramic",
    compensationPerUnit: 14,
  });

  state.knowledge.push("crush-catalyst");
  expect(companyKnowsMaterial(fixture, state, "catalyst-powder")).toBe(true);
  expect(ensureMarket(fixture, state, "catalyst-powder")).toEqual({
    demandBps: 10000,
    saturationBps: 0,
  });
});
