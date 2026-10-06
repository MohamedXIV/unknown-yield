import { describe, expect, it } from "vitest";
import { fixture, validateContent } from "../src/index";

const reaction = (id: string) =>
  fixture.reactions.find((entry) => entry.id === id)!;

describe("Phase 16 representative production slice", () => {
  it("selects distinct industrial beats instead of maximizing content count", () => {
    expect(reaction("heat-ferrite")).toMatchObject({
      input: "ferrite",
      output: "ferrite-ceramic",
      processConditionId: "ambient",
    });

    expect(reaction("liquefy-raw")).toMatchObject({
      input: "raw",
      output: "liquid-0",
    });
    expect(reaction("vaporize-liquid-0")).toMatchObject({
      input: "liquid-0",
      output: "gas-0",
    });
    expect(reaction("collect-gas-0")).toMatchObject({
      input: "gas-0",
      output: "granules",
    });

    expect(reaction("sinter-catalyst")).toMatchObject({
      input: "catalyst",
      output: "matrix",
    });
    expect(reaction("sinter-orbital-binder")).toMatchObject({
      input: "orbital-binder",
      output: "matrix",
    });
    expect(reaction("sinter-resonance-seed")).toMatchObject({
      input: "orbital-resonance-seed",
      output: "phase-lattice",
    });

    expect(reaction("heat-phase-lattice-oversealed").hazard?.id).toBe(
      "phase-shear-lock",
    );
    expect(reaction("phase-quench-lattice")).toMatchObject({
      input: "phase-lattice",
      output: "phase-suspension",
    });
    expect(reaction("phase-stabilize-suspension")).toMatchObject({
      input: "phase-suspension",
      output: "phase-ceramic",
    });

    expect(
      fixture.materials.find((entry) => entry.id === "phase-suspension"),
    ).toMatchObject({
      handlingState: "liquid",
      requiredContainment: [
        "cryogenic-rated",
        "hazard-isolated",
        "secure-chain",
      ],
    });
  });

  it("uses a bounded late shipment as the advanced production objective", () => {
    const objective = fixture.economy.orders.find(
      (entry) => entry.id === "phase-ceramic-demonstration",
    )!;

    expect(objective).toMatchObject({
      materialId: "phase-ceramic",
      quantity: 4,
      durationTicks: 12000,
      rewardFuel: 36,
    });
    expect(objective.quantity).toBeLessThanOrEqual(
      fixture.site.terminalShipmentCapacity,
    );
    expect(objective.durationTicks).toBeGreaterThan(
      fixture.economy.marketEveryTicks,
    );

    const representativeCompanyWork = new Set([
      "sealed-thermal-study",
      "granules-procurement",
      "matrix-local-route",
      "matrix-orbital-application",
      "phase-ceramic-demonstration",
    ]);
    for (const id of representativeCompanyWork)
      expect(
        [
          ...fixture.economy.orders,
          ...fixture.economy.directives,
          ...fixture.economy.propertyDirectives,
        ].some((entry) => entry.id === id),
      ).toBe(true);

    expect(() => validateContent(structuredClone(fixture))).not.toThrow();
  });

  it("retains the measured anti-dominance values instead of retuning by taste", () => {
    const phase = fixture.economy.exchange.find(
      (entry) => entry.materialId === "phase-ceramic",
    )!;
    expect(phase).toMatchObject({
      baseCompensation: 28,
      floorCompensation: 9,
      saturationPerUnitBps: 1800,
      recoveryPerMarketTickBps: 150,
    });

    expect(
      fixture.economy.orders
        .map((entry) => entry.materialId)
        .sort(),
    ).toEqual(["granules", "matrix", "phase-ceramic"]);
  });
});
