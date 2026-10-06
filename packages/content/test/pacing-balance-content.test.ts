import { describe, expect, it } from "vitest";
import { fixture, validateContent } from "../src/index";

describe("Phase 15 pacing and diversification balance", () => {
  it("keeps corporate orders bounded and diversified rather than grind-sized", () => {
    const materials = new Set(
      fixture.economy.orders.map((order) => order.materialId),
    );
    expect(materials.size).toBe(fixture.economy.orders.length);
    expect(materials.size).toBeGreaterThanOrEqual(2);

    for (const order of fixture.economy.orders) {
      expect(order.quantity).toBeLessThanOrEqual(
        fixture.site.terminalShipmentCapacity,
      );
      expect(order.rewardFuel).toBeGreaterThan(0);
      expect(order.durationTicks).toBeGreaterThan(
        fixture.economy.marketEveryTicks,
      );
    }
  });

  it("keeps durable progression evidence-led instead of export-grind gated", () => {
    for (const milestone of fixture.economy.milestones)
      for (const requirement of milestone.requires)
        if (requirement.type === "material-exported")
          expect(requirement.units).toBeLessThanOrEqual(
            fixture.site.terminalShipmentCapacity,
          );

    expect(
      fixture.economy.milestones.some((milestone) =>
        milestone.requires.some(
          (requirement) => requirement.type === "reaction-confirmed",
        ),
      ),
    ).toBe(true);
  });

  it("keeps the highest-value late market volatile rather than universally dominant", () => {
    const ranked = [...fixture.economy.exchange].sort(
      (a, b) => b.baseCompensation - a.baseCompensation,
    );
    const highest = ranked[0];

    expect(highest.materialId).toBe("phase-ceramic");
    expect(highest.floorCompensation).toBeLessThan(
      highest.baseCompensation / 2,
    );
    expect(highest.saturationPerUnitBps).toBeGreaterThan(
      ranked[1].saturationPerUnitBps,
    );
    expect(() => validateContent(structuredClone(fixture))).not.toThrow();
  });
});
