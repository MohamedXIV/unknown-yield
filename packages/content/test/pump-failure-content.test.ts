import { it, expect } from "vitest";
import { fixture, validateContent, enCatalog } from "../src/index";
import { createContentStore, studioBundleFromStore } from "../src/studio";

it("authors one bounded exposure rule and preserves it through Studio", () => {
  expect(fixture.liquidLogistics!.pump.containmentFailure).toMatchObject({
    id: "pump-corrosion", exposedProfileId: "standard",
    missingCapabilityId: "corrosion-resistant", trappedCapacity: 1,
  });
  expect(studioBundleFromStore(createContentStore(fixture), fixture).content.liquidLogistics!.pump.containmentFailure)
    .toEqual(fixture.liquidLogistics!.pump.containmentFailure);
  const historical = structuredClone(fixture);
  delete historical.liquidLogistics!.pump.containmentFailure;
  expect(validateContent(historical).liquidLogistics!.pump.containmentFailure).toBeUndefined();
});

it("rejects invalid references, protected exposure and unrecoverable failure definitions", () => {
  const changes = [
    (c: typeof fixture) => { c.liquidLogistics!.pump.containmentFailure!.exposedProfileId = "missing"; },
    (c: typeof fixture) => { c.liquidLogistics!.pump.containmentFailure!.missingCapabilityId = "missing"; },
    (c: typeof fixture) => { c.liquidLogistics!.pump.containmentFailure!.exposedProfileId = "lined"; },
    (c: typeof fixture) => { c.liquidLogistics!.pump.containmentFailure!.trappedCapacity = 0; },
    (c: typeof fixture) => { c.liquidLogistics!.pump.containmentFailure!.nameKey = "handling.failure.missing.name"; },
    (c: typeof fixture) => { c.materials.find(m => m.id === "liquid-0")!.requiredContainment = []; },
    (c: typeof fixture) => { c.liquidLogistics!.containmentProfiles.find(p => p.id === "lined")!.capabilities = []; },
  ];
  for (const change of changes) {
    const c = structuredClone(fixture); change(c);
    expect(() => validateContent(c, enCatalog)).toThrow();
  }
});
