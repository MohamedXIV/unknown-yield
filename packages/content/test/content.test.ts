import { describe, it, expect } from "vitest";
import { fixture, validateContent, contentSchema } from "../src/index";
import {
  enCatalog,
  localeCatalogSchema,
  validateLocaleCoverage,
} from "../src/locale";
import { createContentStore, contentFromStore } from "../src/studio";

describe("content boundary", () => {
  it("accepts the complete tiny scenario", () => {
    const c = validateContent(fixture);
    expect(c.machines).toHaveLength(5);
    expect(c.version).toBe("world-01-v5");
    expect(c.storages).toHaveLength(1);
    expect(c.storages[0]).toMatchObject({ id: "depot", capacity: 40 });
    expect(c.site.stagingCapacity).toBe(24);
  });
  it("matches authored reactions by an exact process condition", () => {
    const c = validateContent(fixture);
    expect(
      c.reactions
        .filter((r) => r.operation === "heat" && r.input === "raw")
        .map((r) => [r.processConditionId, r.output]),
    ).toEqual([
      ["ambient", "residue"],
      ["sealed", "granules"],
    ]);
    expect(
      c.reactions.find((r) => r.id === "crush-raw")?.processConditionId,
    ).toBeUndefined();
  });
  it("rejects a reaction condition no capable machine provides", () => {
    const c = structuredClone(fixture);
    const sealed = c.reactions.find((r) => r.id === "heat-raw-sealed")!;
    (sealed as typeof sealed & { processConditionId: string }).processConditionId =
      "vacuum";
    expect(() => validateContent(c)).toThrow(/condition/i);
  });
  it("rejects malformed stable condition IDs in the content schema", () => {
    const c = structuredClone(fixture);
    const sealed = c.reactions.find((r) => r.id === "heat-raw-sealed")!;
    (sealed as typeof sealed & { processConditionId: string }).processConditionId =
      "Sealed chamber";
    expect(contentSchema.safeParse(c).success).toBe(false);
  });
  it("accepts one explicit condition-driven hazard with localized identity", () => {
    const c = validateContent(fixture);
    const hazardous = c.reactions.find((r) => r.id === "heat-raw-oversealed")!;
    expect(hazardous).toMatchObject({
      processConditionId: "oversealed",
      output: "residue",
      hazard: {
        id: "chamber-blowout",
        nameKey: "hazard.chamber-blowout.name",
        observationKey: "hazard.chamber-blowout.observation",
      },
    });
  });
  it("rejects hazards without an explicit process condition", () => {
    const c = structuredClone(fixture);
    const hazardous = c.reactions.find((r) => r.id === "heat-raw-oversealed")!;
    delete hazardous.processConditionId;
    expect(() => validateContent(c)).toThrow(/Hazard requires/i);
  });
  it("rejects hazard localization keys that do not match hazard identity", () => {
    const c = structuredClone(fixture);
    const hazardous = c.reactions.find((r) => r.id === "heat-raw-oversealed")!;
    hazardous.hazard!.nameKey = "hazard.other.name";
    expect(() => validateContent(c)).toThrow(/hazard/i);
  });
  it("rejects duplicate hazard identities", () => {
    const c = structuredClone(fixture);
    const sealed = c.reactions.find((r) => r.id === "heat-raw-sealed")!;
    sealed.hazard = {
      id: "chamber-blowout",
      nameKey: "hazard.chamber-blowout.name",
      observationKey: "hazard.chamber-blowout.observation",
    };
    expect(() => validateContent(c)).toThrow(/Duplicate hazard ID/);
  });
  it("rejects overlapping reactions with the same process condition", () => {
    const c = structuredClone(fixture);
    const sealed = c.reactions.find((r) => r.id === "heat-raw-sealed")!;
    sealed.processConditionId = "ambient";
    expect(() => validateContent(c)).toThrow(/Ambiguous reaction/);
  });
  it.each([
    "duplicate",
    "reference",
    "capability",
    "capacity",
    "fuel",
    "export",
    "storage",
    "staging",
  ] as const)("rejects invalid %s", (kind) => {
    const c = structuredClone(fixture);
    if (kind === "duplicate") c.materials.push(c.materials[0]);
    if (kind === "reference") c.reactions[0].output = "missing";
    if (kind === "capability") c.operations[0].id = "unavailable";
    if (kind === "capacity") c.machines[0].capacity = 0;
    if (kind === "fuel") c.economy.grant = -1;
    if (kind === "export") c.materials[1].exportValue = -1;
    if (kind === "storage") c.storages[0].capacity = 0;
    if (kind === "staging") c.site.stagingCapacity = 0;
    expect(() => validateContent(c)).toThrow();
  });
  it("round-trips a material edit through TinyBase and validation", () => {
    const store = createContentStore(fixture);
    store.setCell("materials", "raw", "exportValue", 7);
    const exported = contentFromStore(store, fixture);
    expect(exported.materials.find((m) => m.id === "raw")?.exportValue).toBe(
      7,
    );
    expect(
      fixture.materials.find((m) => m.id === "raw")?.exportValue,
    ).not.toBe(7);
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
  it("rejects localization keys borrowed from another entity", () => {
    const c = structuredClone(fixture);
    c.materials.find((m) => m.id === "raw")!.nameKey = "material.ferrite.name";
    expect(() => validateContent(c)).toThrow(/must match its entity/);
    const d = structuredClone(fixture);
    d.storages[0].nameKey = "machine.crusher.name";
    expect(() => validateContent(d)).toThrow(/must match its entity/);
  });
  it("rejects malformed localization catalogs", () => {
    expect(() => localeCatalogSchema.parse({ "bad key!": "x" })).toThrow();
    expect(() => localeCatalogSchema.parse({ "a.b": "" })).toThrow();
    expect(() => localeCatalogSchema.parse({})).not.toThrow();
  });
});
