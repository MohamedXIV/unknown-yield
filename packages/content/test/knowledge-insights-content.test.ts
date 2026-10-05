import { describe, expect, it } from "vitest";
import {
  enCatalog,
  fixture,
  validateContent,
} from "../src/index";
import {
  createContentStore,
  parseStudioBundle,
  serializeStudioBundle,
} from "../src/studio";

describe("Phase 15 partial knowledge graph content", () => {
  it("authors stable localized insights without a second knowledge database", () => {
    expect(fixture.knowledgeInsights.map((entry) => entry.id)).toEqual([
      "ferrite-capital",
      "ferrite-thermal-branch",
      "ferrite-ceramic-market",
      "veined-multi-state",
      "corrosive-liquid",
      "catalyst-choice",
      "catalyst-powder-market",
      "matrix-local-value",
    ]);
    expect(
      fixture.knowledgeInsights.find(
        (entry) => entry.id === "ferrite-ceramic-market",
      ),
    ).toMatchObject({
      materialId: "ferrite-ceramic",
      kind: "opportunity",
      requires: {
        type: "reaction-evidence",
        reactionId: "heat-ferrite",
        state: "confirmed",
      },
    });
    expect(() => validateContent(structuredClone(fixture))).not.toThrow();
  });

  it("keeps the insight table additive for older authored content", () => {
    const legacy = structuredClone(fixture) as unknown as Record<string, unknown>;
    delete legacy.knowledgeInsights;
    expect(validateContent(legacy).knowledgeInsights).toEqual([]);
  });

  it("rejects missing, unrelated or borrowed insight references", () => {
    const missingTarget = structuredClone(fixture);
    missingTarget.knowledgeInsights[0].materialId = "missing-material";
    expect(() => validateContent(missingTarget)).toThrow(
      /target material/i,
    );

    const missingReaction = structuredClone(fixture);
    const reactionRequirement = missingReaction.knowledgeInsights.find(
      (entry) => entry.id === "ferrite-ceramic-market",
    )!.requires;
    if (reactionRequirement.type !== "reaction-evidence")
      throw new Error("Expected reaction evidence");
    reactionRequirement.reactionId = "missing-reaction";
    expect(() => validateContent(missingReaction)).toThrow(
      /reaction evidence/i,
    );

    const unrelated = structuredClone(fixture);
    const unrelatedRequirement = unrelated.knowledgeInsights.find(
      (entry) => entry.id === "ferrite-ceramic-market",
    )!.requires;
    if (unrelatedRequirement.type !== "reaction-evidence")
      throw new Error("Expected reaction evidence");
    unrelatedRequirement.reactionId = "liquefy-raw";
    expect(() => validateContent(unrelated)).toThrow(/reaction evidence/i);

    const borrowed = structuredClone(fixture);
    borrowed.knowledgeInsights[0].textKey =
      "knowledge.insight.catalyst-choice.text";
    expect(() => validateContent(borrowed)).toThrow(
      /knowledge insight/i,
    );
  });

  it("round-trips the graph through the existing Studio bundle unchanged", () => {
    const store = createContentStore(fixture, enCatalog);
    const parsed = parseStudioBundle(serializeStudioBundle(store, fixture));
    expect(parsed.content.knowledgeInsights).toEqual(fixture.knowledgeInsights);
    expect(parsed.locale).toEqual(enCatalog);
  });
});
