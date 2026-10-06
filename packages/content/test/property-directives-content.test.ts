import { expect, it } from "vitest";
import { contentKeys, fixture, validateContent } from "../src";

it("authors a property directive without exposing its solution through presentation keys", () => {
  const content = validateContent(fixture);
  expect(
    content.economy.propertyDirectives.find(
      (entry) => entry.id === "matrix-local-route",
    ),
  ).toEqual(
    expect.objectContaining({
      id: "matrix-local-route",
      targetMaterialId: "matrix",
      solutionReactionIds: ["sinter-catalyst"],
      rewardImportSupplyId: "orbital-coolant-canister",
    }),
  );
  expect(contentKeys(content)).toEqual(
    expect.arrayContaining([
      "directive.matrix-local-route.name",
      "directive.matrix-local-route.brief",
      "property.matrix-local-route.name",
    ]),
  );
});

it("rejects property directives with invalid solutions, rewards or duplicate identity", () => {
  const wrongOutput = structuredClone(fixture);
  wrongOutput.economy.propertyDirectives[0].solutionReactionIds = [
    "crush-raw",
  ];
  expect(() => validateContent(wrongOutput)).toThrow(/produce target material/);

  const reward = structuredClone(fixture);
  reward.economy.propertyDirectives[0].rewardImportSupplyId = "missing";
  expect(() => validateContent(reward)).toThrow(/reward import is missing/);

  const noReward = structuredClone(fixture);
  noReward.economy.propertyDirectives[0].rewardImportSupplyId = undefined;
  noReward.economy.propertyDirectives[0].rewardFuel = 0;
  expect(() => validateContent(noReward)).toThrow(/requires a reward/);

  const duplicate = structuredClone(fixture);
  duplicate.economy.propertyDirectives[0].id =
    duplicate.economy.directives[0].id;
  duplicate.economy.propertyDirectives[0].nameKey =
    duplicate.economy.directives[0].nameKey;
  duplicate.economy.propertyDirectives[0].briefKey =
    duplicate.economy.directives[0].briefKey;
  expect(() => validateContent(duplicate)).toThrow(
    /Duplicate company opportunity ID/,
  );
});
