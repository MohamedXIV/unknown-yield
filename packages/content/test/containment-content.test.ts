import { describe, expect, it } from "vitest";
import {
  fixture,
  checkContainment,
  validateContent,
  enCatalog,
} from "../src/index";
import {
  createContentStore,
  serializeStudioBundle,
  parseStudioBundle,
} from "../src/studio";

describe("authored containment", () => {
  it("requires every capability independently of handling state", () => {
    const c = structuredClone(fixture);
    c.materials.find((m) => m.id === "liquid-0")!.requiredContainment = [
      "corrosion-resistant",
      "heat-resistant",
    ];
    expect(
      checkContainment(c, "liquid-0", ["liquid"], ["corrosion-resistant"]),
    ).toEqual({
      ok: false,
      reason: "missing-containment",
      missing: ["heat-resistant"],
    });
    expect(
      checkContainment(
        c,
        "liquid-0",
        ["liquid"],
        ["heat-resistant", "corrosion-resistant"],
      ),
    ).toEqual({ ok: true });
    expect(
      checkContainment(
        c,
        "liquid-0",
        ["solid"],
        ["heat-resistant", "corrosion-resistant"],
      ).ok,
    ).toBe(false);
    expect(checkContainment(c, "unknown", ["liquid"], []).ok).toBe(false);
  });
  it("authors one provisional protected liquid branch", () => {
    expect(fixture.version).toBe("world-01-v9");
    expect(
      fixture.materials.find((m) => m.id === "liquid-0")!.requiredContainment,
    ).toEqual(["corrosion-resistant"]);
    expect(
      fixture.liquidLogistics!.containmentProfiles.find(
        (p) => p.id === "lined",
      )!.additionalCost,
    ).toEqual({ pipe: 2, tank: 10, pump: 4 });
  });
  it("rejects invalid references, baseline and costs", () => {
    for (const change of [
      (c: typeof fixture) => {
        c.materials[0].requiredContainment = ["missing"];
      },
      (c: typeof fixture) => {
        c.containmentCapabilities.push(c.containmentCapabilities[0]);
      },
      (c: typeof fixture) => {
        c.liquidLogistics!.containmentProfiles[0].additionalCost.pipe = -1;
      },
      (c: typeof fixture) => {
        c.liquidLogistics!.containmentProfiles =
          c.liquidLogistics!.containmentProfiles.filter(
            (p) => p.id !== "standard",
          );
      },
      (c: typeof fixture) => {
        c.liquidLogistics!.containmentProfiles.find(
          (p) => p.id === "standard",
        )!.capabilities = ["corrosion-resistant"];
      },
      (c: typeof fixture) => {
        c.containmentCapabilities[0].nameKey = "containment.missing.name";
      },
    ]) {
      const c = structuredClone(fixture);
      change(c);
      expect(() => validateContent(c)).toThrow();
    }
  });
  it("requires protected executable machine inputs and outputs", () => {
    for (const [id, field] of [
      ["liquefier", "outputContainment"],
      ["vaporizer", "inputContainment"],
    ] as const) {
      const c = structuredClone(fixture);
      c.machines.find((m) => m.id === id)![field] = [];
      expect(() => validateContent(c)).toThrow(/containment/i);
    }
    const c = structuredClone(fixture);
    c.materials.find((m) => m.id === "ferrite")!.requiredContainment = [
      "corrosion-resistant",
    ];
    expect(() => validateContent(c)).toThrow(/containment/i);
  });
  it("preserves authored requirements, interfaces and profiles through Studio", () => {
    const store = createContentStore(fixture, enCatalog);
    const bundle = serializeStudioBundle(store, fixture);
    expect(parseStudioBundle(bundle).content).toEqual(fixture);
  });
});
