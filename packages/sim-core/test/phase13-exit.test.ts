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

function unlockAcceptedTerminalPrerequisites(
  sim: Simulation,
  content: typeof fixture,
) {
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
  // specialized-inbound depends on the sealed-study milestone, so run the
  // existing deterministic milestone closure twice just like the focused gate.
  refreshMilestones(content, save);
  refreshMilestones(content, save);
  expect(sim.load(save).ok).toBe(true);
}

function storageQuantity(sim: Simulation, storageId: string, materialId: string) {
  return sim.serialize().storages[storageId].inventory[materialId] ?? 0;
}

function depotReleasePath() {
  const points = [{ x: 61, y: 28 }];
  for (let x = 62; x <= 64; x++) points.push({ x, y: 28 });
  for (let y = 29; y <= 34; y++) points.push({ x: 64, y });
  for (let x = 63; x >= 37; x--) points.push({ x, y: 34 });
  for (let y = 33; y >= 28; y--) points.push({ x: 37, y });
  return { type: "placeBelts" as const, points, direction: 0 };
}

it("closes Phase 13 through one conserved terminal and exchange workflow", () => {
  const draft = structuredClone(fixture);
  // Keep the company signal behind the physical production/stockpile setup and
  // make one full manifest/import allocation visibly capacity-bound.
  draft.economy.marketEveryTicks = 900;
  draft.site.terminalShipmentCapacity = 6;
  const content = validateContent(draft);
  let sim = new Simulation(content);
  unlockAcceptedTerminalPrerequisites(sim, content);

  const fresh = sim.snapshot();
  expect(fresh.exchange).not.toContainEqual(
    expect.objectContaining({ materialId: "matrix" }),
  );
  expect(fresh.opportunities).not.toContainEqual(
    expect.objectContaining({ id: "matrix-procurement" }),
  );
  expect(fresh.opportunities).not.toContainEqual(
    expect.objectContaining({ id: "matrix-local-route" }),
  );
  expect(fresh.marketBulletins).toEqual([]);
  expect(JSON.stringify(fresh)).not.toContain("sinter-orbital-binder");
  expect(JSON.stringify(fresh)).not.toContain("sinter-catalyst");
  expect(auditLedger(content, sim.serialize()).ok).toBe(true);

  const factoryId = build(sim, {
    type: "placeFactory",
    x: 43,
    y: 23,
    width: 10,
    height: 10,
  });
  for (const x of [43, 52])
    build(sim, {
      type: "placePort",
      factoryId,
      x,
      y: 28,
      direction: 0,
    });
  build(sim, {
    type: "placeMachine",
    definitionId: "sinterer",
    x: 46,
    y: 27,
    direction: 0,
  });
  build(sim, path(42, 28, 45, 28, 0));

  const depotId = build(sim, {
    type: "placeStorage",
    definitionId: "depot",
    x: 58,
    y: 27,
    direction: 0,
  });
  build(sim, path(48, 28, 57, 28, 0));

  const firstImport = sim.command({
    type: "requestImport",
    supplyId: "orbital-binder-crate",
  });
  expect(firstImport.ok).toBe(true);
  expect(sim.serialize().terminalImports.staging["orbital-binder"]).toBe(6);
  expect(sim.serialize().terminalImports.received["orbital-binder"]).toBe(6);
  expect(sim.serialize().stock["orbital-binder"]).toBeUndefined();

  const beforeCapacityRefusal = sim.serialize();
  const blockedImport = sim.command({
    type: "requestImport",
    supplyId: "orbital-binder-crate",
  });
  expect(blockedImport.ok).toBe(false);
  expect(blockedImport.messageKey).toBe("ui.terminal.import.result.capacity");
  expect(sim.serialize()).toEqual(beforeCapacityRefusal);

  // The next import is admitted only after ordinary belts have physically
  // drained the first six-unit terminal holding.
  while (
    (sim.serialize().terminalImports.staging["orbital-binder"] ?? 0) > 0 &&
    sim.serialize().tick < 300
  )
    sim.step(content.tickMs * 10);
  expect(sim.serialize().terminalImports.staging["orbital-binder"] ?? 0).toBe(0);
  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-binder-crate",
    }).ok,
  ).toBe(true);
  expect(sim.serialize().terminalImports.received["orbital-binder"]).toBe(12);

  while (
    storageQuantity(sim, depotId, "matrix") < 6 &&
    sim.serialize().tick < content.economy.marketEveryTicks - 10
  )
    sim.step(content.tickMs * 10);

  const characterized = sim.serialize();
  expect(characterized.tick).toBeLessThan(content.economy.marketEveryTicks);
  expect(characterized.knowledge).toContain("sinter-orbital-binder");
  expect(storageQuantity(sim, depotId, "matrix")).toBe(6);
  expect(characterized.flows.exported.matrix ?? 0).toBe(0);
  expect(characterized.market.matrix.demandBps).toBe(10000);
  expect(characterized.marketSignals["resonance-orbital-application"]).toBeUndefined();
  expect(characterized.opportunities["matrix-procurement"]).toBeUndefined();
  expect(auditLedger(content, characterized).ok).toBe(true);

  sim.step(
    content.tickMs *
      (content.economy.marketEveryTicks - sim.serialize().tick),
  );
  const signaled = sim.serialize();
  expect(signaled.tick).toBe(content.economy.marketEveryTicks);
  expect(signaled.market.matrix.demandBps).toBe(15000);
  expect(signaled.marketSignals["resonance-orbital-application"]).toEqual({
    triggeredAt: signaled.tick,
  });
  expect(signaled.opportunities["matrix-procurement"]).toMatchObject({
    status: "offered",
    progress: 0,
  });
  expect(signaled.opportunities["matrix-local-route"]).toMatchObject({
    status: "offered",
    progress: 0,
  });
  const directiveView = sim
    .snapshot()
    .opportunities.find((entry) => entry.id === "matrix-local-route");
  expect(directiveView).toMatchObject({
    kind: "property-directive",
    targetMaterialId: "matrix",
    rewardImportSupplyId: "orbital-coolant-canister",
  });
  expect(JSON.stringify(directiveView)).not.toContain("sinter-catalyst");
  expect(JSON.stringify(directiveView)).not.toContain("solutionReactionIds");
  expect(storageQuantity(sim, depotId, "matrix")).toBe(6);
  expect(auditLedger(content, signaled).ok).toBe(true);

  const checkpoint = sim.serialize();
  const restored = new Simulation(content);
  expect(restored.load(structuredClone(checkpoint)).ok).toBe(true);
  expect(restored.serialize()).toEqual(checkpoint);
  sim = restored;

  // Discovery defaults an exchange-listed solid to auto-export. Keep it
  // explicitly while the pre-existing geographic stock moves to staging so
  // the player, not automation, selects this shipment.
  expect(
    sim.command({ type: "setPolicy", materialId: "matrix", policy: "keep" }).ok,
  ).toBe(true);
  build(sim, depotReleasePath());

  while (
    (sim.snapshot().staging.matrix ?? 0) < 6 &&
    sim.serialize().tick < content.economy.marketEveryTicks * 2
  )
    sim.step(content.tickMs * 10);

  expect(sim.snapshot().staging.matrix).toBe(6);
  expect(storageQuantity(sim, depotId, "matrix")).toBe(0);
  expect(sim.serialize().flows.exported.matrix ?? 0).toBe(0);
  expect(auditLedger(content, sim.serialize()).ok).toBe(true);

  expect(
    sim.command({
      type: "setShipmentQuantity",
      materialId: "matrix",
      quantity: 6,
    }).ok,
  ).toBe(true);
  expect(sim.snapshot().shipmentManifest).toEqual({ matrix: 6 });
  expect(
    Object.values(sim.snapshot().shipmentManifest).reduce(
      (sum, quantity) => sum + quantity,
      0,
    ),
  ).toBe(content.site.terminalShipmentCapacity);

  const fuelBeforeDispatch = sim.serialize().fuel;
  expect(sim.command({ type: "dispatchShipment" }).ok).toBe(true);
  const exported = sim.serialize();
  expect(exported.shipmentManifest).toEqual({});
  expect(exported.flows.exported.matrix).toBe(6);
  expect(exported.opportunities["matrix-procurement"]).toMatchObject({
    status: "completed",
  });
  expect(exported.fuel).toBeGreaterThan(fuelBeforeDispatch);
  expect(exported.market.matrix.saturationBps).toBeGreaterThan(0);
  expect(auditLedger(content, exported).ok).toBe(true);

  // Finish on the inbound specialized side of the same physical terminal.
  expect(
    sim.command({
      type: "installTerminalModule",
      definitionId: "cryo-dock",
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-coolant-canister",
    }).ok,
  ).toBe(true);
  expect(sim.serialize().terminalModules["cryo-dock"]).toEqual({
    materialId: "orbital-coolant",
    quantity: 4,
  });
  expect(sim.serialize().terminalImports.received["orbital-coolant"]).toBe(4);
  expect(sim.serialize().stock["orbital-coolant"]).toBeUndefined();

  build(sim, {
    type: "placePipes",
    containmentProfileId: "sealed-cold",
    points: [{ x: 37, y: 27, inlet: 0, outlet: 2 }],
  });
  sim.step(content.tickMs * content.site.transportEveryTicks);
  expect(sim.serialize().pipes["37,27"]).toMatchObject({
    materialId: "orbital-coolant",
    quantity: 1,
  });
  expect(sim.serialize().terminalModules["cryo-dock"].quantity).toBe(3);
  expect(auditLedger(content, sim.serialize()).ok).toBe(true);

  const finalState = sim.serialize();
  const finalRestored = new Simulation(content);
  expect(finalRestored.load(structuredClone(finalState)).ok).toBe(true);
  expect(finalRestored.serialize()).toEqual(finalState);
  expect(auditLedger(content, finalRestored.serialize()).ok).toBe(true);
});
