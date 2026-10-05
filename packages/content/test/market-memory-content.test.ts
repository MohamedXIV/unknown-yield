import { expect, it } from "vitest";
import { contentKeys, fixture, validateContent } from "../src";

it("authors a discovery-gated demand shock with localized bulletin text", () => {
  const content = validateContent(fixture);
  expect(content.economy.demandShocks).toEqual([
    expect.objectContaining({
      id: "resonance-orbital-application",
      materialId: "matrix",
      triggerReactionId: "sinter-orbital-binder",
      demandDeltaBps: 5000,
    }),
  ]);
  expect(contentKeys(content)).toEqual(
    expect.arrayContaining([
      "market-shock.resonance-orbital-application.name",
      "market-shock.resonance-orbital-application.brief",
    ]),
  );
});

it("rejects demand shocks that leak an unrelated or missing application", () => {
  const missing = structuredClone(fixture);
  missing.economy.demandShocks[0].triggerReactionId = "missing";
  expect(() => validateContent(missing)).toThrow(
    /exchange material and reaction/,
  );

  const unrelated = structuredClone(fixture);
  unrelated.economy.demandShocks[0].triggerReactionId = "crush-raw";
  expect(() => validateContent(unrelated)).toThrow(
    /characterize its market material/,
  );

  const duplicate = structuredClone(fixture);
  duplicate.economy.demandShocks.push(
    structuredClone(duplicate.economy.demandShocks[0]),
  );
  expect(() => validateContent(duplicate)).toThrow(/Duplicate demand shock ID/);
});
