import { describe, expect, it } from "vitest";
import {
  enCatalog,
  fixture,
  validateContent,
  validateSimulationContent,
} from "@site/content";
import {
  createContentStore,
  parseStudioBundle,
  referencesTo,
  serializeStudioBundle,
  studioBundleFromStore,
} from "@site/content/studio";
import {
  createStudioEntity,
  setStudioLocaleText,
} from "../game/studio-workbench";
import { previewStudioReaction } from "../game/studio-preview";

function authorPolishChain() {
  const store = createContentStore(fixture, enCatalog);

  store.setCell("meta", "content", "version", "world-01-v6-studio-proof");

  createStudioEntity(store, "material", "powder");
  createStudioEntity(store, "operation", "polish");
  createStudioEntity(store, "machine", "polisher");
  createStudioEntity(store, "reaction", "polish-raw");

  store.setCell("materials", "powder", "color", "#8899aa");
  setStudioLocaleText(store, "material.powder.name", "Polished powder");
  setStudioLocaleText(store, "operation.polish.name", "Polish");
  setStudioLocaleText(store, "machine.polisher.name", "Polisher");
  setStudioLocaleText(
    store,
    "reaction.polish-raw.observation",
    "Polishing the ore produces a fine powder.",
  );

  store.setCell("machines", "polisher", "role", "processor");
  store.setCell("machines", "polisher", "operationsJson", JSON.stringify(["polish"]));
  store.setCell("machines", "polisher", "capacity", 8);
  store.setCell("machines", "polisher", "fuel", 1);
  store.setCell("machines", "polisher", "durationTicks", 20);
  store.setCell("machines", "polisher", "width", 2);
  store.setCell("machines", "polisher", "height", 2);
  store.setCell("machines", "polisher", "cost", 20);

  store.setCell("reactions", "polish-raw", "operation", "polish");
  store.setCell("reactions", "polish-raw", "input", "raw");
  store.setCell("reactions", "polish-raw", "inputAmount", 2);
  store.setCell("reactions", "polish-raw", "output", "powder");
  store.setCell("reactions", "polish-raw", "outputAmount", 1);

  return store;
}

describe("Phase 4 Content Studio v1 exit gate", () => {
  it("authors, validates, references, exports, imports and simulates new content without per-content sim-core edits", () => {
    const originalFixture = structuredClone(fixture),
      store = authorPolishChain();

    const bundle = studioBundleFromStore(store, fixture);

    expect(bundle.schemaVersion).toBe(1);
    expect(bundle.content.version).toBe("world-01-v6-studio-proof");
    expect(bundle.content.materials).toContainEqual(
      expect.objectContaining({
        id: "powder",
        nameKey: "material.powder.name",
      }),
    );
    expect(bundle.content.operations).toContainEqual({
      id: "polish",
      nameKey: "operation.polish.name",
    });
    expect(bundle.content.machines).toContainEqual(
      expect.objectContaining({
        id: "polisher",
        role: "processor",
        operations: ["polish"],
      }),
    );
    expect(bundle.content.reactions).toContainEqual(
      expect.objectContaining({
        id: "polish-raw",
        operation: "polish",
        input: "raw",
        output: "powder",
      }),
    );

    expect(bundle.locale).toMatchObject({
      "material.powder.name": "Polished powder",
      "operation.polish.name": "Polish",
      "machine.polisher.name": "Polisher",
      "reaction.polish-raw.observation":
        "Polishing the ore produces a fine powder.",
    });

    // Content-boundary validation owns locale-resource coverage.
    expect(() => validateContent(bundle.content, bundle.locale)).not.toThrow();
    expect(() => validateContent(bundle.content)).toThrow(
      /Missing localization key/,
    );

    // Simulation semantic validation deliberately does not require the
    // built-in English resource catalog.
    expect(() => validateSimulationContent(bundle.content)).not.toThrow();

    expect(referencesTo(bundle.content, "material", "powder")).toEqual([
      {
        targetType: "material",
        targetId: "powder",
        sourceType: "reaction",
        sourceId: "polish-raw",
        field: "output",
      },
    ]);
    expect(referencesTo(bundle.content, "operation", "polish")).toEqual([
      {
        targetType: "operation",
        targetId: "polish",
        sourceType: "machine",
        sourceId: "polisher",
        field: "operations",
      },
      {
        targetType: "operation",
        targetId: "polish",
        sourceType: "reaction",
        sourceId: "polish-raw",
        field: "operation",
      },
    ]);

    const serialized = serializeStudioBundle(store, fixture),
      parsed = parseStudioBundle(serialized),
      importedStore = createContentStore(parsed.content, parsed.locale);

    expect(serializeStudioBundle(importedStore, parsed.content)).toBe(serialized);

    const previewA = previewStudioReaction(parsed.content, "polish-raw"),
      previewB = previewStudioReaction(parsed.content, "polish-raw");

    expect(previewB).toEqual(previewA);
    expect(previewA).toMatchObject({
      reactionId: "polish-raw",
      machineDefinitionId: "polisher",
      operationId: "polish",
      processConditionId: null,
      inputId: "raw",
      outputId: "powder",
      incidentId: null,
    });
    expect(previewA.outputAmount).toBeGreaterThanOrEqual(1);

    // Studio authoring and preview operate on clones/new simulations.
    expect(fixture).toEqual(originalFixture);
    expect(fixture.version).toBe("world-01-v5");
    expect(fixture.materials.some((material) => material.id === "powder")).toBe(
      false,
    );
    expect(fixture.machines.some((machine) => machine.id === "polisher")).toBe(
      false,
    );
  });

  it("keeps invalid drafts out of export and simulation preview", () => {
    const store = authorPolishChain();
    store.setCell("reactions", "polish-raw", "output", "missing-material");

    expect(() => serializeStudioBundle(store, fixture)).toThrow(
      /Missing reaction reference/,
    );
  });

  it("keeps safe, conditioned and hazardous canonical previews deterministic", () => {
    for (const reactionId of [
      "crush-raw",
      "heat-raw-sealed",
      "heat-raw-oversealed",
    ]) {
      expect(previewStudioReaction(fixture, reactionId)).toEqual(
        previewStudioReaction(fixture, reactionId),
      );
    }

    expect(
      previewStudioReaction(fixture, "heat-raw-oversealed"),
    ).toMatchObject({
      machineDefinitionId: "oversealed-furnace",
      incidentId: "chamber-blowout",
      machineStatus: "incident",
    });
  });
});
