import { describe, expect, it } from "vitest";
import { fixture, validateContent } from "../src/index";

describe("Phase 15 physical higher fuel classes", () => {
  it("authors qualitatively different advanced and research operating fuels", () => {
    expect(fixture.fuelClasses).toEqual([
      {
        id: "advanced-propellant",
        nameKey: "fuel.class.advanced-propellant.name",
        materialId: "orbital-propellant",
        terminalModuleId: "gas-dock",
        requiredMilestoneId: "gas-study-certified",
      },
      {
        id: "research-coolant",
        nameKey: "fuel.class.research-coolant.name",
        materialId: "orbital-coolant",
        terminalModuleId: "cryo-dock",
        requiredMilestoneId: "resonance-survey-certified",
      },
    ]);
    expect(
      fixture.machines.find((entry) => entry.id === "deep-extractor"),
    ).toMatchObject({
      fuelClassId: "advanced-propellant",
      fuel: 1,
    });
    expect(
      fixture.machines.find((entry) => entry.id === "sinterer"),
    ).toMatchObject({
      fuelClassId: "research-coolant",
      fuel: 1,
    });
    for (const fuelClass of fixture.fuelClasses)
      expect(
        fixture.economy.imports.some(
          (supply) =>
            supply.materialId === fuelClass.materialId &&
            supply.terminalModuleId === fuelClass.terminalModuleId,
        ),
      ).toBe(true);
  });

  it("keeps the contract additive for older content", () => {
    const legacy = structuredClone(fixture) as unknown as Record<string, unknown>;
    delete legacy.fuelClasses;
    for (const machine of (legacy.machines as Record<string, unknown>[]))
      delete machine.fuelClassId;
    expect(validateContent(legacy).fuelClasses).toEqual([]);
  });

  it("rejects missing or physically incompatible higher fuel definitions", () => {
    const missingMilestone = structuredClone(fixture);
    missingMilestone.fuelClasses[0].requiredMilestoneId = "missing-milestone";
    expect(() => validateContent(missingMilestone)).toThrow(/fuel class.*milestone/i);

    const badModule = structuredClone(fixture);
    badModule.fuelClasses[1].terminalModuleId = "gas-dock";
    expect(() => validateContent(badModule)).toThrow(
      /physical imported terminal supply|cannot protect/i,
    );

    const missingClass = structuredClone(fixture);
    missingClass.machines.find(
      (entry) => entry.id === "deep-extractor",
    )!.fuelClassId = "missing-class";
    expect(() => validateContent(missingClass)).toThrow(
      /missing fuel class/i,
    );
  });
});
