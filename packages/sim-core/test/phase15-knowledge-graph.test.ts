import { expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  ensureMarket,
  experimentEvidenceKey,
} from "../src/index";

const reaction = (id: string) =>
  fixture.reactions.find((entry) => entry.id === id)!;

it("projects partial material knowledge without leaking hidden recipe truth", () => {
  const simulation = new Simulation(fixture);
  const initial = simulation.snapshot();

  expect(initial.knowledgeInsights.map((entry) => entry.id)).toEqual([
    "ferrite-capital",
    "ferrite-thermal-branch",
    "veined-multi-state",
    "catalyst-choice",
  ]);
  expect(JSON.stringify(initial.knowledgeInsights)).not.toContain("reactionId");
  expect(JSON.stringify(initial.knowledgeInsights)).not.toContain(
    "ferrite-ceramic",
  );
  expect(initial.materials.some((entry) => entry.id === "ferrite-ceramic")).toBe(
    false,
  );

  const heatFerrite = reaction("heat-ferrite");
  const hintedSave = simulation.serialize();
  hintedSave.evidence[
    experimentEvidenceKey(
      heatFerrite.operation,
      heatFerrite.input,
      heatFerrite.processConditionId ?? null,
    )
  ] = {
    operationId: heatFerrite.operation,
    inputId: heatFerrite.input,
    processConditionId: heatFerrite.processConditionId ?? null,
    state: "hinted",
  };

  expect(simulation.load(hintedSave).ok).toBe(true);
  const hinted = simulation.snapshot();
  expect(
    hinted.knowledgeEntries.some(
      (entry) =>
        entry.inputId === "ferrite" &&
        entry.operationId === "heat" &&
        entry.state === "hinted",
    ),
  ).toBe(true);
  expect(hinted.materials.some((entry) => entry.id === "ferrite-ceramic")).toBe(
    false,
  );
  expect(
    hinted.knowledgeInsights.some(
      (entry) => entry.id === "ferrite-ceramic-market",
    ),
  ).toBe(false);
  expect(JSON.stringify(hinted)).not.toContain("ferrite-ceramic");

  const confirmedSave = simulation.serialize();
  confirmedSave.knowledge.push("heat-ferrite");
  confirmedSave.evidence[
    experimentEvidenceKey(
      heatFerrite.operation,
      heatFerrite.input,
      heatFerrite.processConditionId ?? null,
    )
  ] = {
    operationId: heatFerrite.operation,
    inputId: heatFerrite.input,
    processConditionId: heatFerrite.processConditionId ?? null,
    state: "confirmed",
  };
  confirmedSave.policies["ferrite-ceramic"] = "export";
  ensureMarket(fixture, confirmedSave, "ferrite-ceramic");

  expect(simulation.load(confirmedSave).ok).toBe(true);
  const confirmed = simulation.snapshot();
  expect(
    confirmed.materials.some((entry) => entry.id === "ferrite-ceramic"),
  ).toBe(true);
  expect(
    confirmed.knowledgeInsights.find(
      (entry) => entry.id === "ferrite-ceramic-market",
    ),
  ).toEqual({
    id: "ferrite-ceramic-market",
    materialId: "ferrite-ceramic",
    kind: "opportunity",
    textKey: "knowledge.insight.ferrite-ceramic-market.text",
  });
  expect(JSON.stringify(confirmed.knowledgeInsights)).not.toContain(
    "heat-ferrite",
  );
  expect(JSON.stringify(confirmed.knowledgeInsights)).not.toContain(
    "reactionId",
  );

  const saved = simulation.serialize();
  const restored = new Simulation(fixture);
  expect(restored.load(structuredClone(saved)).ok).toBe(true);
  expect(restored.snapshot().knowledgeInsights).toEqual(
    confirmed.knowledgeInsights,
  );
});
