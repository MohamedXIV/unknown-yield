import { describe, expect, it } from "vitest";
import { enCatalog, fixture } from "@site/content";
import {
  createContentStore,
  studioBundleFromStore,
} from "@site/content/studio";
import {
  createStudioEntity,
  setStudioLocaleText,
} from "../game/studio-workbench";
import { previewStudioReaction } from "../game/studio-preview";

describe("Studio selected-reaction simulation preview", () => {
  it("previews a safe authored reaction through the real simulation path", () => {
    const result = previewStudioReaction(fixture, "crush-raw");

    expect(result).toMatchObject({
      reactionId: "crush-raw",
      machineDefinitionId: "crusher",
      operationId: "crush",
      processConditionId: null,
      inputId: "raw",
      outputId: "granules",
      incidentId: null,
    });
    expect(result.outputAmount).toBeGreaterThanOrEqual(1);
    expect(result.ticks).toBeGreaterThan(0);
    expect(result.fuelRemaining).toBeGreaterThan(0);
  });

  it("selects the processor whose authored condition matches the reaction", () => {
    const result = previewStudioReaction(fixture, "heat-raw-sealed");

    expect(result).toMatchObject({
      reactionId: "heat-raw-sealed",
      machineDefinitionId: "sealed-furnace",
      operationId: "heat",
      processConditionId: "sealed",
      inputId: "raw",
      outputId: "granules",
      incidentId: null,
    });
  });

  it("previews the hazardous physical result independently of progression unlock state", () => {
    const result = previewStudioReaction(fixture, "heat-raw-oversealed");

    expect(result).toMatchObject({
      reactionId: "heat-raw-oversealed",
      machineDefinitionId: "oversealed-furnace",
      operationId: "heat",
      processConditionId: "oversealed",
      inputId: "raw",
      outputId: "residue",
      incidentId: "chamber-blowout",
      machineStatus: "incident",
    });
    expect(result.outputAmount).toBeGreaterThanOrEqual(1);
  });

  it("is deterministic for the same validated authored content", () => {
    expect(previewStudioReaction(fixture, "heat-raw-sealed")).toEqual(
      previewStudioReaction(fixture, "heat-raw-sealed"),
    );
  });

  it("runs content with new Studio-authored IDs and locale text not present in the built-in catalog", () => {
    const store = createContentStore(fixture, enCatalog);
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
    store.setCell(
      "machines",
      "polisher",
      "operationsJson",
      JSON.stringify(["polish"]),
    );
    store.setCell("machines", "polisher", "capacity", 8);
    store.setCell("machines", "polisher", "fuel", 1);
    store.setCell("machines", "polisher", "durationTicks", 20);

    store.setCell("reactions", "polish-raw", "operation", "polish");
    store.setCell("reactions", "polish-raw", "input", "raw");
    store.setCell("reactions", "polish-raw", "inputAmount", 2);
    store.setCell("reactions", "polish-raw", "output", "powder");
    store.setCell("reactions", "polish-raw", "outputAmount", 1);

    const bundle = studioBundleFromStore(store, fixture);
    expect(bundle.locale["material.powder.name"]).toBe("Polished powder");

    const first = previewStudioReaction(bundle.content, "polish-raw"),
      second = previewStudioReaction(bundle.content, "polish-raw");

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      reactionId: "polish-raw",
      machineDefinitionId: "polisher",
      operationId: "polish",
      inputId: "raw",
      outputId: "powder",
      incidentId: null,
    });
  });

  it("fails clearly when no selected reaction exists", () => {
    expect(() => previewStudioReaction(fixture, "missing-reaction")).toThrow(
      /Unknown Studio preview reaction/,
    );
  });
});
