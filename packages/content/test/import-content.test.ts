import { expect, it } from "vitest";
import { contentKeys, fixture, validateContent } from "../src";

it("authors an import-only specialized solid supply", () => {
  const content = validateContent(fixture);
  expect(content.economy.imports).toEqual([
    expect.objectContaining({
      id: "orbital-binder-crate",
      materialId: "orbital-binder",
      quantity: 6,
      fuelCost: 42,
    }),
  ]);
  expect(contentKeys(content)).toEqual(
    expect.arrayContaining([
      "import.orbital-binder-crate.name",
      "import.orbital-binder-crate.brief",
    ]),
  );
  expect(
    content.reactions.some((reaction) => reaction.output === "orbital-binder"),
  ).toBe(false);
  expect(
    [...content.site.deposits, ...content.site.hiddenDeposits].some(
      (deposit) => deposit.material === "orbital-binder",
    ),
  ).toBe(false);
});

it("rejects import supplies that have a local source or exceed cargo capacity", () => {
  const local = structuredClone(fixture);
  local.economy.imports[0].materialId = "ferrite";
  expect(() => validateContent(local)).toThrow(/local source/);

  const oversized = structuredClone(fixture);
  oversized.economy.imports[0].quantity =
    oversized.site.terminalShipmentCapacity + 1;
  expect(() => validateContent(oversized)).toThrow(/cargo capacity/);

  const listed = structuredClone(fixture);
  listed.economy.exchange.push({
    ...listed.economy.exchange[0],
    materialId: "orbital-binder",
  });
  expect(() => validateContent(listed)).toThrow(/Import-only material/);
});
