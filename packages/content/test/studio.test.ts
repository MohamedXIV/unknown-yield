import { describe, expect, it } from "vitest";
import {
  enCatalog,
  fixture,
  validateContent,
  type LocaleCatalog,
} from "../src/index";
import {
  catalogFromStore,
  contentFromStore,
  createContentStore,
  hasStudioEntity,
  parseStudioBundle,
  referencesTo,
  serializeStudioBundle,
  studioBundleFromStore,
} from "../src/studio";

describe("Content Studio authoring core", () => {
  it("round-trips the canonical fixture through all Studio tables without changing content", () => {
    const store = createContentStore(fixture, enCatalog);
    const bundle = studioBundleFromStore(store, fixture);

    expect(bundle.schemaVersion).toBe(1);
    expect(bundle.content).toEqual(fixture);
    expect(bundle.locale).toEqual(enCatalog);
    expect(contentFromStore(store, fixture)).toEqual(fixture);
    expect(catalogFromStore(store)).toEqual(enCatalog);
    expect(
      store.getCell("machines", "deep-extractor", "maxExtractionDepth"),
    ).toBe(20);
    expect(
      store.getCell("machines", "atmospheric-intake", "sourceKind"),
    ).toBe("atmosphere");
    expect(
      store.getCell("reactions", "heat-raw-oversealed", "hazardClassId"),
    ).toBe("pressure-expansion");

    expect(hasStudioEntity(store, "material", "raw")).toBe(true);
    expect(referencesTo(fixture, "material", "gas-0")).toContainEqual({
      targetType: "material",
      targetId: "gas-0",
      sourceType: "atmospheric-source",
      sourceId: "atmospheric-plume-a",
      field: "material",
    });
    expect(hasStudioEntity(store, "operation", "heat")).toBe(true);
    expect(hasStudioEntity(store, "machine", "sealed-furnace")).toBe(true);
    expect(hasStudioEntity(store, "reaction", "heat-raw-sealed")).toBe(true);
  });

  it("authors coordinated material, operation, machine, reaction and locale records in one versioned bundle", () => {
    const store = createContentStore(fixture, enCatalog);

    store.setCell("meta", "content", "version", "world-01-v6-draft");

    store.setRow("materials", "powder", {
      nameKey: "material.powder.name",
      color: "#8899aa",
      known: false,
    });
    store.setRow("operations", "polish", {
      nameKey: "operation.polish.name",
    });
    store.setRow("machines", "polisher", {
      nameKey: "machine.polisher.name",
      role: "processor",
      processConditionId: "",
      unlockReactionId: "",
      unlockHintKey: "",
      operationsJson: JSON.stringify(["polish"]),
      capacity: 8,
      fuel: 1,
      durationTicks: 20,
      width: 2,
      height: 2,
      cost: 20,
    });
    store.setRow("reactions", "polish-raw", {
      operation: "polish",
      processConditionId: "",
      input: "raw",
      inputAmount: 2,
      output: "powder",
      outputAmount: 1,
      observationKey: "reaction.polish-raw.observation",
      hazardId: "",
      hazardClassId: "",
      hazardNameKey: "",
      hazardObservationKey: "",
      known: false,
    });

    store.setRow("locale", "material.powder.name", {
      text: "Polished powder",
    });
    store.setRow("locale", "operation.polish.name", {
      text: "Polish",
    });
    store.setRow("locale", "machine.polisher.name", {
      text: "Polisher",
    });
    store.setRow("locale", "reaction.polish-raw.observation", {
      text: "Polishing the ore produces a fine powder.",
    });

    const serialized = serializeStudioBundle(store, fixture);
    const parsed = parseStudioBundle(serialized);

    expect(parsed.content.version).toBe("world-01-v6-draft");
    expect(parsed.content.materials).toContainEqual(
      expect.objectContaining({
        id: "powder",
        nameKey: "material.powder.name",
      }),
    );
    expect(parsed.content.operations).toContainEqual({
      id: "polish",
      nameKey: "operation.polish.name",
    });
    expect(parsed.content.machines).toContainEqual(
      expect.objectContaining({
        id: "polisher",
        operations: ["polish"],
        role: "processor",
      }),
    );
    expect(parsed.content.reactions).toContainEqual(
      expect.objectContaining({
        id: "polish-raw",
        operation: "polish",
        input: "raw",
        output: "powder",
      }),
    );
    expect(parsed.locale["material.powder.name"]).toBe("Polished powder");

    expect(() => validateContent(parsed.content, parsed.locale)).not.toThrow();
    expect(() => validateContent(parsed.content)).toThrow(
      /Missing localization key/,
    );

    const imported = createContentStore(parsed.content, parsed.locale);
    expect(serializeStudioBundle(imported, parsed.content)).toBe(serialized);
  });

  it("validates the entire authored snapshot before export and rejects broken references", () => {
    const store = createContentStore(fixture, enCatalog);
    store.setCell("reactions", "crush-raw", "output", "missing-material");

    expect(() => serializeStudioBundle(store, fixture)).toThrow(
      /Missing reaction reference/,
    );
  });

  it("keeps visible locale edits separate from stable content identity", () => {
    const store = createContentStore(fixture, enCatalog);
    const before = contentFromStore(store, fixture);

    store.setCell("locale", "material.raw.name", "text", "Striated ore");
    const bundle = studioBundleFromStore(store, fixture);

    expect(bundle.content).toEqual(before);
    expect(bundle.content.materials.find((m) => m.id === "raw")?.nameKey).toBe(
      "material.raw.name",
    );
    expect(bundle.locale["material.raw.name"]).toBe("Striated ore");
  });

  it("reports reverse references for core stable IDs", () => {
    expect(referencesTo(fixture, "material", "raw")).toEqual([
      {
        targetType: "material",
        targetId: "raw",
        sourceType: "deposit",
        sourceId: "east-veins",
        field: "material",
      },
      {
        targetType: "material",
        targetId: "raw",
        sourceType: "deposit",
        sourceId: "veined-field",
        field: "material",
      },
      {
        targetType: "material",
        targetId: "raw",
        sourceType: "reaction",
        sourceId: "crush-raw",
        field: "input",
      },
      {
        targetType: "material",
        targetId: "raw",
        sourceType: "reaction",
        sourceId: "heat-raw",
        field: "input",
      },
      {
        targetType: "material",
        targetId: "raw",
        sourceType: "reaction",
        sourceId: "heat-raw-oversealed",
        field: "input",
      },
      {
        targetType: "material",
        targetId: "raw",
        sourceType: "reaction",
        sourceId: "heat-raw-sealed",
        field: "input",
      },
      {
        targetType: "material",
        targetId: "raw",
        sourceType: "reaction",
        sourceId: "liquefy-raw",
        field: "input",
      },
    ]);

    expect(referencesTo(fixture, "operation", "heat")).toEqual(
      expect.arrayContaining([
        {
          targetType: "operation",
          targetId: "heat",
          sourceType: "machine",
          sourceId: "furnace",
          field: "operations",
        },
        {
          targetType: "operation",
          targetId: "heat",
          sourceType: "reaction",
          sourceId: "heat-raw-sealed",
          field: "operation",
        },
      ]),
    );

    expect(referencesTo(fixture, "reaction", "heat-raw-sealed")).toEqual([
      {
        targetType: "reaction",
        targetId: "heat-raw-sealed",
        sourceType: "machine",
        sourceId: "deep-extractor",
        field: "unlock.reactionId",
      },
      {
        targetType: "reaction",
        targetId: "heat-raw-sealed",
        sourceType: "machine",
        sourceId: "oversealed-furnace",
        field: "unlock.reactionId",
      },
    ]);

    expect(referencesTo(fixture, "machine", "crusher")).toEqual([]);
  });

  it("rejects malformed or unsupported Studio bundles", () => {
    expect(() => parseStudioBundle("{nope")).toThrow(/not valid JSON/);
    expect(() =>
      parseStudioBundle({
        schemaVersion: 2,
        content: fixture,
        locale: enCatalog,
      }),
    ).toThrow(/Unsupported Studio bundle schema/);

    const incompleteLocale = structuredClone(enCatalog) as LocaleCatalog;
    delete incompleteLocale["material.raw.name"];
    expect(() =>
      parseStudioBundle({
        schemaVersion: 1,
        content: fixture,
        locale: incompleteLocale,
      }),
    ).toThrow(/Missing localization key/);
  });
});
