import { expect, it } from "vitest";
import { contentKeys, fixture, validateContent } from "../src";

it("authors import-only dry, gas and protected liquid supplies", () => {
  const content = validateContent(fixture);
  expect(content.economy.imports).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "orbital-binder-crate",
        materialId: "orbital-binder",
        quantity: 6,
        fuelCost: 42,
      }),
      expect.objectContaining({
        id: "orbital-propellant-cylinder",
        materialId: "orbital-propellant",
        terminalModuleId: "gas-dock",
      }),
      expect.objectContaining({
        id: "orbital-coolant-canister",
        materialId: "orbital-coolant",
        terminalModuleId: "cryo-dock",
      }),
    ]),
  );
  expect(contentKeys(content)).toEqual(
    expect.arrayContaining([
      "import.orbital-binder-crate.name",
      "import.orbital-binder-crate.brief",
      "import.orbital-propellant-cylinder.name",
      "import.orbital-coolant-canister.name",
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


it("requires non-dry imports to use a compatible authored terminal module", () => {
  const missing = structuredClone(fixture);
  missing.economy.imports.find(
    (entry) => entry.id === "orbital-propellant-cylinder",
  )!.terminalModuleId = undefined;
  expect(() => validateContent(missing)).toThrow(/compatible terminal module/);

  const wrongState = structuredClone(fixture);
  wrongState.economy.imports.find(
    (entry) => entry.id === "orbital-propellant-cylinder",
  )!.terminalModuleId = "liquid-dock";
  expect(() => validateContent(wrongState)).toThrow(/cannot handle material/);

  const unprotected = structuredClone(fixture);
  unprotected.site.terminalModules.find(
    (entry) => entry.id === "cryo-dock",
  )!.containmentCapabilities = [];
  expect(() => validateContent(unprotected)).toThrow(/cannot handle material/);
});
