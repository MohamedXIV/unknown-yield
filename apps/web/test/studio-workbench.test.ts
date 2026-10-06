import { describe, expect, it } from "vitest";
import { enCatalog, fixture } from "@site/content";
import { createContentStore } from "@site/content/studio";
import {
  createStudioEntity,
  deleteStudioEntity,
  humanizeStudioId,
  setMachineUnlock,
  setReactionHazard,
  setStudioLocaleText,
  studioEntityIds,
  studioEntityLabel,
  studioLocaleText,
  studioRow,
} from "../game/studio-workbench";

describe("Studio workbench helpers", () => {
  it("creates stable draft entities with derived localization keys", () => {
    const store = createContentStore(fixture, enCatalog);

    expect(createStudioEntity(store, "material", "polished-powder")).toBe(
      "polished-powder",
    );
    expect(studioRow(store, "material", "polished-powder")).toEqual({
      nameKey: "material.polished-powder.name",
      color: "#888888",
      requiredContainmentJson: "[]",
      known: false,
    });
    expect(studioLocaleText(store, "material.polished-powder.name")).toBe(
      "Polished Powder",
    );

    createStudioEntity(store, "operation", "polish");
    createStudioEntity(store, "machine", "polisher");
    createStudioEntity(store, "reaction", "polish-raw");

    expect(studioEntityIds(store, "operation")).toContain("polish");
    expect(studioEntityIds(store, "machine")).toContain("polisher");
    expect(studioEntityIds(store, "reaction")).toContain("polish-raw");
  });

  it("edits visible wording independently from stable keys", () => {
    const store = createContentStore(fixture, enCatalog);
    setStudioLocaleText(store, "material.raw.name", "Striated ore");

    expect(studioLocaleText(store, "material.raw.name")).toBe("Striated ore");
    expect(studioRow(store, "material", "raw").nameKey).toBe(
      "material.raw.name",
    );
    expect(studioEntityLabel(store, "material", "raw")).toBe("Striated ore");
  });

  it("creates and clears machine unlock and reaction hazard presentation keys", () => {
    const store = createContentStore(fixture, enCatalog);

    createStudioEntity(store, "machine", "polisher");
    setMachineUnlock(store, "polisher", "heat-raw-sealed");
    expect(studioRow(store, "machine", "polisher")).toMatchObject({
      unlockReactionId: "heat-raw-sealed",
      unlockHintKey: "machine.polisher.unlock-hint",
    });
    expect(studioLocaleText(store, "machine.polisher.unlock-hint")).toContain(
      "confirmed knowledge",
    );
    setMachineUnlock(store, "polisher", "");
    expect(studioRow(store, "machine", "polisher")).toMatchObject({
      unlockReactionId: "",
      unlockHintKey: "",
    });
    expect(store.hasRow("locale", "machine.polisher.unlock-hint")).toBe(false);

    createStudioEntity(store, "reaction", "polish-raw");
    setReactionHazard(store, "polish-raw", "powder-burst");
    expect(studioRow(store, "reaction", "polish-raw")).toMatchObject({
      hazardId: "powder-burst",
      hazardNameKey: "hazard.powder-burst.name",
      hazardObservationKey: "hazard.powder-burst.observation",
    });
    expect(studioLocaleText(store, "hazard.powder-burst.name")).toBe(
      "Powder Burst",
    );
    setStudioLocaleText(
      store,
      "hazard.powder-burst.observation",
      "A tuned custom hazard observation.",
    );
    setReactionHazard(store, "polish-raw", "powder-burst");
    expect(studioLocaleText(store, "hazard.powder-burst.observation")).toBe(
      "A tuned custom hazard observation.",
    );

    setReactionHazard(store, "polish-raw", "");
    expect(studioRow(store, "reaction", "polish-raw")).toMatchObject({
      hazardId: "",
      hazardNameKey: "",
      hazardObservationKey: "",
    });
    expect(store.hasRow("locale", "hazard.powder-burst.name")).toBe(false);
  });

  it("deletes entity-owned locale rows but leaves unrelated content intact", () => {
    const store = createContentStore(fixture, enCatalog);
    createStudioEntity(store, "material", "powder");
    expect(store.hasRow("locale", "material.powder.name")).toBe(true);

    deleteStudioEntity(store, "material", "powder");

    expect(store.hasRow("materials", "powder")).toBe(false);
    expect(store.hasRow("locale", "material.powder.name")).toBe(false);
    expect(store.hasRow("materials", "raw")).toBe(true);
  });

  it("rejects malformed and duplicate stable IDs", () => {
    const store = createContentStore(fixture, enCatalog);
    expect(() => createStudioEntity(store, "material", "Bad ID")).toThrow(
      /lowercase/,
    );
    expect(() => createStudioEntity(store, "material", "raw")).toThrow(
      /already exists/,
    );
    expect(humanizeStudioId("oversealed-furnace")).toBe("Oversealed Furnace");
  });

  it("creates and deletes targeted economy entities with owned locale keys", () => {
    const store = createContentStore(fixture, enCatalog);

    expect(createStudioEntity(store, "exchange", "catalyst")).toBe("catalyst");
    expect(studioRow(store, "exchange", "catalyst")).toMatchObject({
      baseCompensation: 8,
      floorCompensation: 4,
    });

    createStudioEntity(store, "import", "sample-crate");
    expect(studioRow(store, "import", "sample-crate")).toMatchObject({
      nameKey: "import.sample-crate.name",
      briefKey: "import.sample-crate.brief",
      quantity: 1,
    });
    expect(studioLocaleText(store, "import.sample-crate.name")).toBe(
      "Sample Crate",
    );

    createStudioEntity(store, "order", "sample-order");
    expect(studioLocaleText(store, "order.sample-order.brief")).toContain(
      "Describe",
    );

    createStudioEntity(store, "property-directive", "sample-study");
    expect(studioRow(store, "property-directive", "sample-study")).toMatchObject({
      nameKey: "directive.sample-study.name",
      briefKey: "directive.sample-study.brief",
      propertyKey: "property.sample-study.name",
    });

    deleteStudioEntity(store, "property-directive", "sample-study");
    expect(store.hasRow("propertyDirectives", "sample-study")).toBe(false);
    expect(store.hasRow("locale", "directive.sample-study.name")).toBe(false);
    expect(store.hasRow("locale", "property.sample-study.name")).toBe(false);
  });

});
