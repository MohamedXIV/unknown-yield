import { describe, expect, it } from "vitest";
import { enCatalog, fixture } from "../src/index";
import {
  createContentStore,
  parseStudioBundle,
  referencesTo,
  serializeStudioBundle,
} from "../src/studio";

describe("Phase 15 targeted economy Studio authoring", () => {
  it("loads canonical exchange, import, order and property-directive rows", () => {
    const store = createContentStore(fixture, enCatalog);

    expect(store.hasRow("exchange", "phase-ceramic")).toBe(true);
    expect(store.getCell("exchange", "phase-ceramic", "baseCompensation")).toBe(28);
    expect(store.hasRow("imports", "orbital-resonance-seed-crate")).toBe(true);
    expect(store.getCell("imports", "orbital-resonance-seed-crate", "requiredOpportunityId")).toBe(
      "matrix-orbital-application",
    );
    expect(store.hasRow("orders", "matrix-procurement")).toBe(true);
    expect(store.hasRow("propertyDirectives", "matrix-local-route")).toBe(true);
  });

  it("round-trips economy edits through the existing versioned bundle", () => {
    const store = createContentStore(fixture, enCatalog);

    store.setCell("exchange", "phase-ceramic", "baseCompensation", 31);
    store.setCell("imports", "orbital-binder-crate", "fuelCost", 45);
    store.setCell("orders", "matrix-procurement", "quantity", 5);
    store.setCell(
      "propertyDirectives",
      "matrix-local-route",
      "durationTicks",
      11000,
    );

    const parsed = parseStudioBundle(serializeStudioBundle(store, fixture));
    expect(
      parsed.content.economy.exchange.find(
        (entry) => entry.materialId === "phase-ceramic",
      )?.baseCompensation,
    ).toBe(31);
    expect(
      parsed.content.economy.imports.find(
        (entry) => entry.id === "orbital-binder-crate",
      )?.fuelCost,
    ).toBe(45);
    expect(
      parsed.content.economy.orders.find(
        (entry) => entry.id === "matrix-procurement",
      )?.quantity,
    ).toBe(5);
    expect(
      parsed.content.economy.propertyDirectives.find(
        (entry) => entry.id === "matrix-local-route",
      )?.durationTicks,
    ).toBe(11000);
  });

  it("authors new economy records without replacing untouched economy tables", () => {
    const store = createContentStore(fixture, enCatalog);

    store.setRow("exchange", "catalyst", {
      baseCompensation: 7,
      floorCompensation: 3,
      baseDemandBps: 10000,
      saturationPerUnitBps: 700,
      recoveryPerMarketTickBps: 250,
      demandRecoveryPerMarketTickBps: 100,
      requiredTerminalCapabilityId: "",
    });
    store.setRow("imports", "test-propellant-crate", {
      nameKey: "import.test-propellant-crate.name",
      briefKey: "import.test-propellant-crate.brief",
      materialId: "orbital-propellant",
      quantity: 2,
      fuelCost: 10,
      terminalModuleId: "gas-dock",
      requiredOpportunityId: "",
    });
    store.setRow("orders", "test-catalyst-order", {
      nameKey: "order.test-catalyst-order.name",
      briefKey: "order.test-catalyst-order.brief",
      materialId: "catalyst",
      quantity: 2,
      durationTicks: 2000,
      rewardFuel: 12,
    });
    store.setRow("propertyDirectives", "test-catalyst-study", {
      nameKey: "directive.test-catalyst-study.name",
      briefKey: "directive.test-catalyst-study.brief",
      propertyKey: "property.test-catalyst-study.name",
      targetMaterialId: "catalyst-powder",
      solutionReactionIdsJson: JSON.stringify(["crush-catalyst"]),
      durationTicks: 3000,
      rewardFuel: 5,
      rewardImportSupplyId: "",
    });
    for (const [key, text] of [
      ["import.test-propellant-crate.name", "Propellant test crate"],
      ["import.test-propellant-crate.brief", "A bounded authoring proof import."],
      ["order.test-catalyst-order.name", "Catalyst test order"],
      ["order.test-catalyst-order.brief", "A bounded authoring proof order."],
      ["directive.test-catalyst-study.name", "Catalyst test study"],
      ["directive.test-catalyst-study.brief", "A bounded authoring proof directive."],
      ["property.test-catalyst-study.name", "Characterize catalyst output"],
    ])
      store.setRow("locale", key, { text });

    const parsed = parseStudioBundle(serializeStudioBundle(store, fixture));
    expect(parsed.content.economy.exchange.some((entry) => entry.materialId === "catalyst")).toBe(true);
    expect(parsed.content.economy.imports.some((entry) => entry.id === "test-propellant-crate")).toBe(true);
    expect(parsed.content.economy.orders.some((entry) => entry.id === "test-catalyst-order")).toBe(true);
    expect(
      parsed.content.economy.propertyDirectives.some(
        (entry) => entry.id === "test-catalyst-study",
      ),
    ).toBe(true);
    expect(parsed.content.economy.milestones).toEqual(fixture.economy.milestones);
    expect(parsed.content.site).toEqual(fixture.site);
  });

  it("reports economy references to stable material and reaction IDs", () => {
    expect(referencesTo(fixture, "material", "matrix")).toEqual(
      expect.arrayContaining([
        {
          targetType: "material",
          targetId: "matrix",
          sourceType: "exchange",
          sourceId: "matrix",
          field: "materialId",
        },
        {
          targetType: "material",
          targetId: "matrix",
          sourceType: "order",
          sourceId: "matrix-procurement",
          field: "materialId",
        },
        {
          targetType: "material",
          targetId: "matrix",
          sourceType: "property-directive",
          sourceId: "matrix-local-route",
          field: "targetMaterialId",
        },
      ]),
    );
    expect(referencesTo(fixture, "reaction", "sinter-catalyst")).toContainEqual({
      targetType: "reaction",
      targetId: "sinter-catalyst",
      sourceType: "property-directive",
      sourceId: "matrix-local-route",
      field: "solutionReactionIds",
    });
  });
});
