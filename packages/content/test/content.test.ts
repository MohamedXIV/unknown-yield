import { describe, it, expect } from "vitest";
import { fixture, validateContent } from "../src/index";
import {
  enCatalog,
  localeCatalogSchema,
  validateLocaleCoverage,
} from "../src/locale";
import { createContentStore, contentFromStore } from "../src/studio";

describe("content boundary", () => {
  it("accepts the complete tiny scenario", () => {
    expect(validateContent(fixture).machines).toHaveLength(3);
  });
  it.each([
    "duplicate",
    "reference",
    "capability",
    "capacity",
    "fuel",
    "export",
  ] as const)("rejects invalid %s", (kind) => {
    const c = structuredClone(fixture);
    if (kind === "duplicate") c.materials.push(c.materials[0]);
    if (kind === "reference") c.reactions[0].output = "missing";
    if (kind === "capability") c.operations[0].id = "unavailable";
    if (kind === "capacity") c.machines[0].capacity = 0;
    if (kind === "fuel") c.economy.grant = -1;
    if (kind === "export") c.materials[1].exportValue = -1;
    expect(() => validateContent(c)).toThrow();
  });
  it("round-trips a material edit through TinyBase and validation", () => {
    const store = createContentStore(fixture);
    store.setCell("materials", "raw", "nameKey", "material.ferrite.name");
    const exported = contentFromStore(store, fixture);
    expect(exported.materials.find((m) => m.id === "raw")?.nameKey).toBe(
      "material.ferrite.name",
    );
    expect(fixture.materials.find((m) => m.id === "raw")?.nameKey).not.toBe(
      "material.ferrite.name",
    );
    expect(validateContent(JSON.parse(JSON.stringify(exported)))).toEqual(
      exported,
    );
    store.setCell("materials", "raw", "exportValue", -5);
    expect(() => contentFromStore(store, fixture)).toThrow();
  });
  it("covers every content key with the English catalog", () => {
    expect(() => validateLocaleCoverage(fixture, enCatalog)).not.toThrow();
    expect(enCatalog["material.raw.name"]).toBe("Veined ore");
    expect(enCatalog["reaction.crush-raw.observation"]).toContain(
      "conductive grains",
    );
  });
  it("rejects content referencing a missing localization key", () => {
    const c = structuredClone(fixture);
    c.materials[0].nameKey = "material.nope.name";
    expect(() => validateContent(c)).toThrow(/Missing localization key/);
    const d = structuredClone(fixture);
    d.reactions[0].observationKey = "reaction.nope.observation";
    expect(() => validateLocaleCoverage(d, enCatalog)).toThrow(
      /Missing localization key/,
    );
  });
  it("rejects malformed localization catalogs", () => {
    expect(() => localeCatalogSchema.parse({ "bad key!": "x" })).toThrow();
    expect(() => localeCatalogSchema.parse({ "a.b": "" })).toThrow();
    expect(() => localeCatalogSchema.parse({})).not.toThrow();
  });
});
