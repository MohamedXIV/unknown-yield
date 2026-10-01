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
    expect(c.version).toBe("world-01-v6");
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
      ["oversealed", "residue"],
    ]);
    expect(
      c.reactions.find((r) => r.id === "crush-raw")?.processConditionId,
    ).toBeUndefined();
  });
  it("rejects a reaction condition no capable machine provides", () => {
    const c = structuredClone(fixture);
    const sealed = c.reactions.find((r) => r.id === "heat-raw-sealed")!;
    (
      sealed as typeof sealed & { processConditionId: string }
    ).processConditionId = "vacuum";
    expect(() => validateContent(c)).toThrow(/condition/i);
  });
  it("rejects malformed stable condition IDs in the content schema", () => {
    const c = structuredClone(fixture);
    const sealed = c.reactions.find((r) => r.id === "heat-raw-sealed")!;
    (
      sealed as typeof sealed & { processConditionId: string }
    ).processConditionId = "Sealed chamber";
    expect(contentSchema.safeParse(c).success).toBe(false);
  });
  it("binds the oversealed capability unlock to stable confirmed reaction identity", () => {
    const c = validateContent(fixture);
    expect(
      c.machines.find((m) => m.id === "oversealed-furnace")?.unlock,
    ).toEqual({
      reactionId: "heat-raw-sealed",
      hintKey: "machine.oversealed-furnace.unlock-hint",
    });
    expect(enCatalog["machine.oversealed-furnace.unlock-hint"]).toContain(
      "Sealed furnace",
    );
  });
  it("rejects missing or borrowed machine unlock references", () => {
    const missing = structuredClone(fixture);
    missing.machines.find(
      (m) => m.id === "oversealed-furnace",
    )!.unlock!.reactionId = "missing-reaction";
    expect(() => validateContent(missing)).toThrow(/unlock reaction/i);

    const borrowed = structuredClone(fixture);
    borrowed.machines.find(
      (m) => m.id === "oversealed-furnace",
    )!.unlock!.hintKey = "machine.sealed-furnace.name";
    expect(() => validateContent(borrowed)).toThrow(/machine unlock/i);
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
    "exchange",
    "storage",
    "staging",
  ] as const)("rejects invalid %s", (kind) => {
    const c = structuredClone(fixture);
    if (kind === "duplicate") c.materials.push(c.materials[0]);
    if (kind === "reference") c.reactions[0].output = "missing";
    if (kind === "capability") c.operations[0].id = "unavailable";
    if (kind === "capacity") c.machines[0].capacity = 0;
    if (kind === "fuel") c.economy.grant = -1;
    if (kind === "exchange") c.economy.exchange[0].floorCompensation = 13;
    if (kind === "storage") c.storages[0].capacity = 0;
    if (kind === "staging") c.site.stagingCapacity = 0;
    expect(() => validateContent(c)).toThrow();
  });
  it("validates authored assistance packages and repeat-recovery rules", () => {
    const c = validateContent(fixture);
    expect(c.economy.defaultAssistancePackageId).toBe("emergency-fuel");
    expect(c.economy.assistancePackages).toEqual([
      expect.objectContaining({
        id: "emergency-fuel",
        fuelBelow: 2,
        grantFuel: 36,
        baseObligationFuel: 36,
        repeatObligationStepFuel: 12,
        continuationObligationFuel: 12,
        recoveryNetFuel: 24,
      }),
    ]);

    const underfunded = structuredClone(fixture);
    underfunded.economy.assistancePackages[0].baseObligationFuel = 35;
    expect(() => validateContent(underfunded)).toThrow(
      /obligation cannot be smaller/i,
    );

    const impossibleContinuation = structuredClone(fixture);
    impossibleContinuation.economy.assistancePackages[0].continuationObligationFuel = 37;
    expect(() => validateContent(impossibleContinuation)).toThrow(
      /continuation obligation is not recoverable/i,
    );

    const authoredIndependent = structuredClone(fixture);
    authoredIndependent.economy.grant = 1;
    authoredIndependent.economy.assistanceBelow = 1;
    expect(() => validateContent(authoredIndependent)).not.toThrow();

    const missingDefault = structuredClone(fixture);
    missingDefault.economy.defaultAssistancePackageId = "missing-package";
    expect(() => validateContent(missingDefault)).toThrow(
      /default assistance package/i,
    );

    const duplicate = structuredClone(fixture);
    duplicate.economy.assistancePackages.push({
      ...duplicate.economy.assistancePackages[0],
    });
    expect(() => validateContent(duplicate)).toThrow(
      /Duplicate assistance package/i,
    );
  });
  it("keeps pre-#72 world-01-v6 assistance content additively compatible", () => {
    const legacy = structuredClone(fixture) as unknown as {
      economy: Record<string, unknown>;
    };
    delete legacy.economy.assistancePackages;
    delete legacy.economy.defaultAssistancePackageId;
    const parsed = validateContent(legacy);
    expect(parsed.version).toBe("world-01-v6");
    expect(parsed.economy.assistancePackages).toEqual([]);
    expect(parsed.economy.grant).toBe(36);
    expect(parsed.economy.assistanceBelow).toBe(2);
  });
  it("validates authored company opportunities through stable IDs and hidden experiment tuples", () => {
    const c = validateContent(fixture);
    expect(c.economy.orders[0]).toMatchObject({
      id: "granules-procurement",
      materialId: "granules",
      quantity: 4,
      rewardFuel: 24,
    });
    expect(c.economy.directives[0]).toMatchObject({
      id: "sealed-thermal-study",
      operationId: "heat",
      inputMaterialId: "raw",
      processConditionId: "sealed",
      rewardFuel: 18,
    });
    expect("outputId" in c.economy.directives[0]).toBe(false);
    expect("reactionId" in c.economy.directives[0]).toBe(false);
  });
  it("rejects invalid or duplicate company opportunity definitions", () => {
    const badOrder = structuredClone(fixture);
    badOrder.economy.orders[0].materialId = "raw";
    expect(() => validateContent(badOrder)).toThrow(/exchange material/i);

    const badDirective = structuredClone(fixture);
    badDirective.economy.directives[0].processConditionId = "vacuum";
    expect(() => validateContent(badDirective)).toThrow(/authored outcome/i);

    const knownDirective = structuredClone(fixture);
    knownDirective.economy.directives[0].operationId = "crush";
    knownDirective.economy.directives[0].inputMaterialId = "ferrite";
    delete knownDirective.economy.directives[0].processConditionId;
    expect(() => validateContent(knownDirective)).toThrow(
      /unconfirmed outcome/i,
    );

    const duplicate = structuredClone(fixture);
    duplicate.economy.directives[0].id = duplicate.economy.orders[0].id;
    duplicate.economy.directives[0].nameKey =
      "directive." + duplicate.economy.orders[0].id + ".name";
    duplicate.economy.directives[0].briefKey =
      "directive." + duplicate.economy.orders[0].id + ".brief";
    expect(() => validateContent(duplicate)).toThrow(
      /Duplicate company opportunity/i,
    );

    const duplicateExperiment = structuredClone(fixture);
    duplicateExperiment.economy.directives.push({
      ...duplicateExperiment.economy.directives[0],
      id: "sealed-thermal-study-two",
      nameKey: "directive.sealed-thermal-study-two.name",
      briefKey: "directive.sealed-thermal-study-two.brief",
    });
    expect(() => validateContent(duplicateExperiment)).toThrow(
      /Duplicate directive experiment/i,
    );
  });
  it("keeps pre-#70 world-01-v6 content additively compatible", () => {
    const legacy = structuredClone(fixture) as unknown as {
      economy: Record<string, unknown> & {
        exchange: Array<Record<string, unknown>>;
      };
    };
    delete legacy.economy.orders;
    delete legacy.economy.directives;
    delete legacy.economy.terminalCapabilities;
    delete legacy.economy.milestones;
    delete legacy.economy.exchange[0].requiredTerminalCapabilityId;
    const parsed = validateContent(legacy);
    expect(parsed.version).toBe("world-01-v6");
    expect(parsed.economy.orders).toEqual([]);
    expect(parsed.economy.directives).toEqual([]);
    expect(parsed.economy.terminalCapabilities).toEqual([]);
    expect(parsed.economy.milestones).toEqual([]);
  });
  it("rejects circular or export-blocked terminal unlock graphs", () => {
    const blockedByMaterial = structuredClone(fixture);
    blockedByMaterial.economy.milestones[0].requires = [
      { type: "material-exported", materialId: "granules", units: 1 },
    ];
    expect(() => validateContent(blockedByMaterial)).toThrow(
      /depends on blocked export/i,
    );

    const blockedByOrder = structuredClone(fixture);
    blockedByOrder.economy.milestones[0].requires = [
      { type: "order-completed", orderId: "granules-procurement" },
    ];
    expect(() => validateContent(blockedByOrder)).toThrow(
      /depends on blocked export/i,
    );

    const circular = structuredClone(fixture);
    circular.economy.milestones[0].requires = [
      {
        type: "terminal-capability",
        capabilityId: "sealed-sample-outbound",
      },
    ];
    expect(() => validateContent(circular)).toThrow(
      /Circular milestone dependency/i,
    );
  });
  it("round-trips a material edit through TinyBase and validation", () => {
    const store = createContentStore(fixture);
    store.setCell("materials", "raw", "color", "#112233");
    const exported = contentFromStore(store, fixture);
    expect(exported.materials.find((m) => m.id === "raw")?.color).toBe(
      "#112233",
    );
    expect(fixture.materials.find((m) => m.id === "raw")?.color).not.toBe(
      "#112233",
    );
    expect(validateContent(JSON.parse(JSON.stringify(exported)))).toEqual(
      exported,
    );
    store.setCell("materials", "raw", "color", "not-a-color");
    expect(() => contentFromStore(store, fixture)).toThrow();
  });
  it("covers every content key with the English catalog", () => {
    expect(() => validateLocaleCoverage(fixture, enCatalog)).not.toThrow();
    expect(enCatalog["material.raw.name"]).toBe("Veined ore");
    expect(enCatalog["reaction.crush-raw.observation"]).toContain(
      "conductive grains",
    );
    expect(enCatalog["order.granules-procurement.name"]).toBe(
      "Orbital conductor allocation",
    );
    expect(enCatalog["directive.sealed-thermal-study.brief"]).toContain(
      "does not predict the output",
    );
    expect(enCatalog["milestone.sealed-study-certified.hint"]).toContain(
      "sealed Heat trial",
    );
    expect(enCatalog["terminal.capability.sealed-sample-outbound.name"]).toBe(
      "Sealed sample handling",
    );
    expect(enCatalog["assistance.emergency-fuel.name"]).toBe(
      "Emergency fuel allocation",
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

describe("junction content boundary", () => {
  it("keeps legacy content additive and preserves authored junctions through Studio", () => {
    const { junctions: unused, ...legacy } = fixture;
    expect(unused).toHaveLength(2);
    expect(validateContent(legacy).junctions).toEqual([]);
    expect(
      contentFromStore(createContentStore(fixture, enCatalog), fixture)
        .junctions,
    ).toEqual(fixture.junctions);
  });
  it("rejects invalid kind/cost, duplicate IDs and missing locale coverage", () => {
    for (const junctions of [
      [{ ...fixture.junctions[0], cost: 0 }],
      [{ ...fixture.junctions[0], kind: "router" }],
      [fixture.junctions[0], fixture.junctions[0]],
      [{ ...fixture.junctions[0], nameKey: "junction.missing.name" }],
    ])
      expect(() => validateContent({ ...fixture, junctions })).toThrow();
  });
});
