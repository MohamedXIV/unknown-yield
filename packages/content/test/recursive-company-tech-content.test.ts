import { describe, expect, it } from "vitest";
import { fixture, validateContent } from "../src/index";

describe("Phase 15 recursive company technology content", () => {
  it("chains player matrix evidence into company R&D and deeper local access", () => {
    const directive = fixture.economy.propertyDirectives.find(
      (entry) => entry.id === "matrix-orbital-application",
    )!;
    const seed = fixture.economy.imports.find(
      (entry) => entry.id === "orbital-resonance-seed-crate",
    )!;
    const latticeReaction = fixture.reactions.find(
      (entry) => entry.id === "sinter-resonance-seed",
    )!;
    const milestone = fixture.economy.milestones.find(
      (entry) => entry.id === "phase-lattice-certified",
    )!;
    const probe = fixture.site.sensingCapabilities.find(
      (entry) => entry.id === "phase-probe",
    )!;
    const seam = fixture.site.hiddenDeposits.find(
      (entry) => entry.id === "phase-lattice-seam-a",
    )!;
    const signal = fixture.site.surveySignals.find(
      (entry) => entry.id === seam.surveySignalId,
    )!;
    const deepExtractor = fixture.machines.find(
      (entry) => entry.id === "deep-extractor",
    )!;

    expect(directive).toMatchObject({
      targetMaterialId: "matrix",
      solutionReactionIds: ["sinter-orbital-binder"],
      rewardImportSupplyId: "orbital-resonance-seed-crate",
    });
    expect(seed).toMatchObject({
      materialId: "orbital-resonance-seed",
      requiredOpportunityId: directive.id,
    });
    expect(
      fixture.materials.find(
        (entry) => entry.id === "orbital-resonance-seed",
      )?.known,
    ).toBe(false);
    expect(latticeReaction).toMatchObject({
      operation: "sinter",
      input: "orbital-resonance-seed",
      output: "phase-lattice",
      known: false,
    });
    expect(milestone.requires).toContainEqual({
      type: "reaction-confirmed",
      reactionId: latticeReaction.id,
    });
    expect(probe).toMatchObject({
      mode: "probe",
      requiredMilestoneId: milestone.id,
    });
    expect(seam).toMatchObject({
      material: "phase-lattice",
      requiredSensingCapabilityId: probe.id,
    });
    expect(signal.depth).toBe(18);
    expect(deepExtractor.maxExtractionDepth).toBeGreaterThanOrEqual(
      signal.depth,
    );
    expect(() => validateContent(structuredClone(fixture))).not.toThrow();
  });

  it("rejects company R&D imports borrowed by the wrong opportunity", () => {
    const content = structuredClone(fixture);
    const seed = content.economy.imports.find(
      (entry) => entry.id === "orbital-resonance-seed-crate",
    )!;
    seed.requiredOpportunityId = "matrix-local-route";
    expect(() => validateContent(content)).toThrow(
      /cannot unlock another opportunity|company R&D/i,
    );
  });
});
