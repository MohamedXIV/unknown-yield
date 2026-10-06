import { describe, expect, it } from "vitest";
import {
  checkContainment,
  fixture,
  validateContent,
} from "../src/index";

describe("Phase 15 late-game hazard, handling and logistics content", () => {
  it("authors a protected liquid phase chain instead of another generic solid recipe", () => {
    const suspension = fixture.materials.find(
      (entry) => entry.id === "phase-suspension",
    )!;
    const ceramic = fixture.materials.find(
      (entry) => entry.id === "phase-ceramic",
    )!;
    const quencher = fixture.machines.find(
      (entry) => entry.id === "phase-quencher",
    )!;
    const stabilizer = fixture.machines.find(
      (entry) => entry.id === "phase-stabilizer",
    )!;

    expect(suspension).toMatchObject({
      handlingState: "liquid",
      requiredContainment: [
        "cryogenic-rated",
        "hazard-isolated",
        "secure-chain",
      ],
    });
    expect(ceramic.handlingState).toBe("solid");
    expect(quencher).toMatchObject({
      fuelClassId: "research-coolant",
      inputStates: ["solid"],
      outputStates: ["liquid"],
      operations: ["phase-quench"],
      outputContainment: [
        "cryogenic-rated",
        "hazard-isolated",
        "secure-chain",
      ],
    });
    expect(stabilizer).toMatchObject({
      fuelClassId: "research-coolant",
      inputStates: ["liquid"],
      outputStates: ["solid"],
      operations: ["phase-stabilize"],
      inputContainment: [
        "cryogenic-rated",
        "hazard-isolated",
        "secure-chain",
      ],
    });

    const standard = fixture.liquidLogistics!.containmentProfiles.find(
      (entry) => entry.id === "standard",
    )!;
    const lined = fixture.liquidLogistics!.containmentProfiles.find(
      (entry) => entry.id === "lined",
    )!;
    const sealedCold = fixture.liquidLogistics!.containmentProfiles.find(
      (entry) => entry.id === "sealed-cold",
    )!;
    expect(
      checkContainment(
        fixture,
        suspension.id,
        ["liquid"],
        standard.capabilities,
      ).ok,
    ).toBe(false);
    expect(
      checkContainment(
        fixture,
        suspension.id,
        ["liquid"],
        lined.capabilities,
      ).ok,
    ).toBe(false);
    expect(
      checkContainment(
        fixture,
        suspension.id,
        ["liquid"],
        sealedCold.capabilities,
      ).ok,
    ).toBe(true);
  });

  it("authors an explicit unsafe thermal branch with recoverable instability", () => {
    expect(
      fixture.reactions.find(
        (entry) => entry.id === "heat-phase-lattice-oversealed",
      ),
    ).toMatchObject({
      operation: "heat",
      processConditionId: "oversealed",
      input: "phase-lattice",
      output: "residue",
      hazard: {
        id: "phase-shear-lock",
        classId: "instability",
      },
    });
    expect(
      fixture.reactions.find(
        (entry) => entry.id === "phase-quench-lattice",
      ),
    ).toMatchObject({
      input: "phase-lattice",
      output: "phase-suspension",
    });
    expect(
      fixture.reactions.find(
        (entry) => entry.id === "phase-stabilize-suspension",
      ),
    ).toMatchObject({
      input: "phase-suspension",
      output: "phase-ceramic",
    });
    expect(
      fixture.economy.exchange.find(
        (entry) => entry.materialId === "phase-ceramic",
      ),
    ).toBeDefined();
  });

  it("keeps the authored graph semantically valid", () => {
    expect(() => validateContent(structuredClone(fixture))).not.toThrow();

    const unsafe = structuredClone(fixture);
    unsafe.materials.find(
      (entry) => entry.id === "phase-suspension",
    )!.requiredContainment = [];
    expect(() => validateContent(unsafe)).not.toThrow();

    const broken = structuredClone(fixture);
    broken.machines.find(
      (entry) => entry.id === "phase-quencher",
    )!.outputContainment = [];
    expect(() => validateContent(broken)).toThrow(
      /containment mismatches machine interface/i,
    );
  });
});
