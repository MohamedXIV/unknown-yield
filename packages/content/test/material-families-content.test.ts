import { describe, expect, it } from "vitest";
import {
  checkContainment,
  enCatalog,
  fixture,
  validateContent,
} from "../src/index";
import {
  createContentStore,
  parseStudioBundle,
  referencesTo,
  serializeStudioBundle,
} from "../src/studio";

const reaction = (id: string) =>
  fixture.reactions.find((entry) => entry.id === id)!;
const material = (id: string) =>
  fixture.materials.find((entry) => entry.id === id)!;
const listing = (id: string) =>
  fixture.economy.exchange.find((entry) => entry.materialId === id)!;

describe("Phase 15 differentiated material families", () => {
  it("keeps ferrite structurally useful while giving it a fast-saturating export branch", () => {
    expect(fixture.site.buildMaterial).toBe("plates");
    expect(reaction("press-ferrite")).toMatchObject({
      operation: "crush",
      input: "ferrite",
      inputAmount: 2,
      output: "plates",
      outputAmount: 6,
      known: true,
    });
    expect(fixture.economy.exchange.some((e) => e.materialId === "plates")).toBe(
      false,
    );

    expect(reaction("heat-ferrite")).toMatchObject({
      operation: "heat",
      processConditionId: "ambient",
      input: "ferrite",
      inputAmount: 2,
      output: "ferrite-ceramic",
      outputAmount: 1,
      known: false,
    });
    expect(material("ferrite-ceramic").known).toBe(false);
    expect(listing("ferrite-ceramic")).toMatchObject({
      baseCompensation: 14,
      floorCompensation: 3,
      saturationPerUnitBps: 2500,
    });
  });

  it("keeps the veined family physically multi-state and containment-sensitive", () => {
    expect(reaction("liquefy-raw")).toMatchObject({
      input: "raw",
      output: "liquid-0",
    });
    expect(reaction("vaporize-liquid-0")).toMatchObject({
      input: "liquid-0",
      output: "gas-0",
    });
    expect(reaction("precipitate-liquid-0").output).toBe("granules");
    expect(reaction("collect-gas-0").output).toBe("granules");

    expect(material("raw").handlingState).toBe("solid");
    expect(material("liquid-0")).toMatchObject({
      handlingState: "liquid",
      requiredContainment: ["corrosion-resistant"],
    });
    expect(material("gas-0").handlingState).toBe("gas");
    expect(
      checkContainment(fixture, "liquid-0", ["liquid"], []),
    ).toMatchObject({
      ok: false,
      reason: "missing-containment",
    });
    expect(
      checkContainment(
        fixture,
        "liquid-0",
        ["liquid"],
        ["corrosion-resistant"],
      ),
    ).toEqual({ ok: true });
  });

  it("gives the scarce resonant family a commodity-vs-matrix process choice", () => {
    const seam = fixture.site.hiddenDeposits.find(
      (entry) => entry.material === "catalyst",
    );
    expect(seam).toMatchObject({
      id: "catalyst-seam-a",
      requiredSensingCapabilityId: "resonance-probe",
    });

    expect(reaction("crush-catalyst")).toMatchObject({
      operation: "crush",
      input: "catalyst",
      output: "catalyst-powder",
      known: false,
    });
    expect(reaction("sinter-catalyst")).toMatchObject({
      operation: "sinter",
      input: "catalyst",
      output: "matrix",
      known: false,
    });

    const powder = listing("catalyst-powder"),
      matrix = listing("matrix");
    expect(powder.baseCompensation).toBeLessThan(matrix.baseCompensation);
    expect(powder.saturationPerUnitBps).toBeLessThan(
      listing("ferrite-ceramic").saturationPerUnitBps,
    );
    expect(
      fixture.economy.demandShocks.some(
        (shock) => shock.materialId === "matrix",
      ),
    ).toBe(true);
  });

  it("keeps new branches hidden at expedition start and executable by existing machines", () => {
    for (const id of ["ferrite-ceramic", "catalyst-powder"])
      expect(material(id).known).toBe(false);
    for (const id of ["heat-ferrite", "crush-catalyst"])
      expect(reaction(id).known).toBe(false);

    expect(
      fixture.machines.find((machine) => machine.id === "furnace")!.operations,
    ).toContain("heat");
    expect(
      fixture.machines.find((machine) => machine.id === "crusher")!.operations,
    ).toContain("crush");
    expect(() => validateContent(structuredClone(fixture))).not.toThrow();
  });

  it("round-trips the scaled families through the existing Content Studio contract", () => {
    const store = createContentStore(fixture, enCatalog),
      serialized = serializeStudioBundle(store, fixture),
      parsed = parseStudioBundle(serialized);

    expect(parsed.content).toEqual(fixture);
    expect(parsed.locale).toEqual(enCatalog);
    expect(referencesTo(fixture, "material", "ferrite-ceramic")).toContainEqual({
      targetType: "material",
      targetId: "ferrite-ceramic",
      sourceType: "reaction",
      sourceId: "heat-ferrite",
      field: "output",
    });
    expect(referencesTo(fixture, "material", "catalyst-powder")).toContainEqual({
      targetType: "material",
      targetId: "catalyst-powder",
      sourceType: "reaction",
      sourceId: "crush-catalyst",
      field: "output",
    });
  });
});
