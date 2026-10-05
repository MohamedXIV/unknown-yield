import { expect, it } from "vitest";
import { fixture, validateContent } from "@site/content";
import { auditLedger } from "../src/ledger";
import { initializeKnownMarkets } from "../src/market";
import { refreshMilestones } from "../src/milestones";
import { Simulation } from "../src/simulation";
import { experimentEvidenceKey, type GameCommand } from "../src/types";

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

function path(
  x: number,
  y: number,
  endX: number,
  endY: number,
  direction = 0,
) {
  const points = [{ x, y }];
  while (x !== endX) {
    x += Math.sign(endX - x);
    points.push({ x, y });
  }
  while (y !== endY) {
    y += Math.sign(endY - y);
    points.push({ x, y });
  }
  return { type: "placeBelts" as const, points, direction };
}

function unlockGranuleHandling(sim: Simulation, content: typeof fixture) {
  const save = sim.serialize();
  const reaction = content.reactions.find(
    (entry) => entry.id === "heat-raw-sealed",
  )!;
  if (!save.knowledge.includes(reaction.id)) save.knowledge.push(reaction.id);
  save.evidence[
    experimentEvidenceKey(
      reaction.operation,
      reaction.input,
      reaction.processConditionId ?? null,
    )
  ] = {
    operationId: reaction.operation,
    inputId: reaction.input,
    processConditionId: reaction.processConditionId ?? null,
    state: "confirmed",
  };
  initializeKnownMarkets(content, save);
  refreshMilestones(content, save);
  expect(sim.load(save).ok).toBe(true);
}

function storageInventory(sim: Simulation) {
  return Object.values(sim.serialize().storages)[0].inventory;
}

it("physically stockpiles production before a later order, then releases it through world logistics", () => {
  const draft = structuredClone(fixture);
  // Slow only the company cadence so real production can build inventory
  // before the first opportunity evaluation.
  draft.economy.marketEveryTicks = 600;
  const content = validateContent(draft);
  const sim = new Simulation(content);
  unlockGranuleHandling(sim, content);

  const factoryId = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 33,
    width: 10,
    height: 10,
  });
  for (const x of [24, 33])
    build(sim, {
      type: "placePort",
      factoryId,
      x,
      y: 37,
      direction: 0,
    });
  const extractorId = build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 36,
    direction: 0,
  });
  const crusherId = build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 36,
    direction: 0,
  });
  build(sim, path(20, 37, 26, 37));

  build(sim, {
    type: "placeStorage",
    definitionId: "depot",
    x: 10,
    y: 20,
    direction: 0,
  });
  const toDepot = [{ x: 29, y: 37 }];
  for (let x = 30; x <= 34; x++) toDepot.push({ x, y: 37 });
  for (let y = 36; y >= 30; y--) toDepot.push({ x: 34, y });
  for (let x = 33; x >= 9; x--) toDepot.push({ x, y: 30 });
  for (let y = 29; y >= 21; y--) toDepot.push({ x: 9, y });
  build(sim, { type: "placeBelts", points: toDepot, direction: 0 });

  // Wait for a real four-unit stockpile, but never cross the first
  // market/opportunity cadence at tick 600. This proves production/storage
  // causally precedes the company signal without depending on one fragile
  // fixed throughput timestamp.
  while (
    (storageInventory(sim).granules ?? 0) < 4 &&
    sim.serialize().tick < content.economy.marketEveryTicks - 10
  )
    sim.step(content.tickMs * 10);
  expect(sim.serialize().tick).toBeLessThan(content.economy.marketEveryTicks);
  expect(storageInventory(sim).granules ?? 0).toBeGreaterThanOrEqual(4);
  expect(sim.serialize().opportunities["granules-procurement"]).toBeUndefined();
  expect(sim.serialize().flows.exported.granules ?? 0).toBe(0);
  expect(Object.keys(sim.serialize().stock)).toEqual(["plates"]);
  expect(auditLedger(content, sim.serialize()).ok).toBe(true);

  // Freeze production so the post-signal inventory delta proves deliberate
  // release of the existing geographic stockpile rather than fresh output.
  expect(
    sim.command({ type: "setEnabled", machineId: extractorId, enabled: false })
      .ok,
  ).toBe(true);
  expect(
    sim.command({ type: "setEnabled", machineId: crusherId, enabled: false }).ok,
  ).toBe(true);

  sim.step(
    content.tickMs *
      (content.economy.marketEveryTicks - sim.serialize().tick),
  );
  const offered = sim.serialize().opportunities["granules-procurement"];
  expect(sim.serialize().tick).toBe(content.economy.marketEveryTicks);
  expect(offered).toMatchObject({ status: "offered", progress: 0 });
  const heldAtOffer = storageInventory(sim).granules ?? 0;
  expect(heldAtOffer).toBeGreaterThanOrEqual(4);

  const checkpoint = sim.serialize();
  const resumed = new Simulation(content);
  expect(resumed.load(structuredClone(checkpoint)).ok).toBe(true);
  expect(resumed.serialize()).toEqual(checkpoint);
  expect(storageInventory(resumed).granules).toBe(heldAtOffer);

  // Only now create the depot's physical withdrawal route to terminal staging.
  build(resumed, path(13, 21, 37, 28, 0));
  const fuelBeforeRelease = resumed.serialize().fuel;
  resumed.step(content.tickMs * 300);

  const after = resumed.serialize();
  expect(after.opportunities["granules-procurement"]).toMatchObject({
    status: "completed",
    progress: 4,
  });
  expect(after.flows.exported.granules ?? 0).toBeGreaterThanOrEqual(4);
  expect(storageInventory(resumed).granules ?? 0).toBeLessThan(heldAtOffer);
  expect(after.fuel).toBeGreaterThan(fuelBeforeRelease);
  expect(Object.keys(after.stock)).toEqual(["plates"]);
  expect(auditLedger(content, after).ok).toBe(true);
});
