import { expect, it } from "vitest";
import { fixture } from "@site/content";
import { Simulation, type GameCommand } from "../src/index";

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

function path(x: number, y: number, endX: number, endY: number) {
  const points = [{ x, y }];
  while (x !== endX) {
    x += Math.sign(endX - x);
    points.push({ x, y });
  }
  while (y !== endY) {
    y += Math.sign(endY - y);
    points.push({ x, y });
  }
  return { type: "placeBelts" as const, points, direction: 0 };
}

function ferriteHeatLine() {
  const sim = new Simulation(fixture);
  const factoryId = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 22,
    width: 10,
    height: 10,
  });
  for (const x of [24, 33])
    build(sim, {
      type: "placePort",
      factoryId,
      x,
      y: 27,
      direction: 0,
    });

  build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 26,
    direction: 0,
  });
  const processorId = build(sim, {
    type: "placeMachine",
    definitionId: "furnace",
    x: 27,
    y: 26,
    direction: 0,
  });
  build(sim, path(20, 27, 26, 27));
  return { sim, processorId };
}

it("projects partial material knowledge without leaking hidden recipe truth", () => {
  const { sim, processorId } = ferriteHeatLine();
  const initial = sim.snapshot();

  expect(initial.knowledgeInsights.map((entry) => entry.id)).toEqual([
    "ferrite-capital",
    "ferrite-thermal-branch",
    "veined-multi-state",
    "catalyst-choice",
  ]);
  expect(JSON.stringify(initial.knowledgeInsights)).not.toContain("reactionId");
  expect(JSON.stringify(initial)).not.toContain("ferrite-ceramic");
  expect(initial.materials.some((entry) => entry.id === "ferrite-ceramic")).toBe(
    false,
  );

  for (
    let ticks = 0;
    ticks < 500 && !sim.serialize().machines[processorId].job;
    ticks++
  )
    sim.step(fixture.tickMs);

  expect(sim.serialize().machines[processorId].job?.reaction).toBe(
    "heat-ferrite",
  );
  const hinted = sim.snapshot();
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

  const hintedSave = sim.serialize();
  const hintedRestored = new Simulation(fixture);
  expect(hintedRestored.load(structuredClone(hintedSave)).ok).toBe(true);
  expect(hintedRestored.snapshot().knowledgeInsights).toEqual(
    hinted.knowledgeInsights,
  );

  for (
    let ticks = 0;
    ticks < 500 && !sim.serialize().knowledge.includes("heat-ferrite");
    ticks++
  )
    sim.step(fixture.tickMs);

  expect(sim.serialize().knowledge).toContain("heat-ferrite");
  const confirmed = sim.snapshot();
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

  const saved = sim.serialize();
  const restored = new Simulation(fixture);
  expect(restored.load(structuredClone(saved)).ok).toBe(true);
  expect(restored.snapshot().knowledgeInsights).toEqual(
    confirmed.knowledgeInsights,
  );
});
