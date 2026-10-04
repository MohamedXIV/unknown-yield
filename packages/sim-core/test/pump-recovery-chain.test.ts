import { it, expect } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  type GameCommand,
  factoryBlueprint,
} from "../src/index";
it("recovers a native fresh-world failure through protected storage, upgrade, repair and restart", () => {
  const sim = new Simulation(fixture);
  const build = (c: GameCommand) => {
    const r = sim.command(c);
    expect(r.ok, r.message).toBe(true);
    return r.id!;
  };
  const tick = (n: number) => {
    for (let i = 0; i < n; i++) {
      sim.step(100);
      expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
    }
  };
  const f = build({ type: "placeFactory", x: 23, y: 33, width: 12, height: 8 });
  build({ type: "placePort", factoryId: f, x: 23, y: 36, direction: 0 });
  const e = build({
    type: "placeMachine",
    definitionId: "extractor",
    x: 15,
    y: 35,
    direction: 0,
  });
  build({
    type: "placeMachine",
    definitionId: "liquefier",
    x: 25,
    y: 35,
    direction: 0,
  });
  build({
    type: "placeBelts",
    points: Array.from({ length: 8 }, (_, i) => ({ x: 17 + i, y: 36 })),
    direction: 0,
  });
  const p = build({ type: "placePump", x: 27, y: 36, direction: 0 });
  build({
    type: "placePipes",
    points: [
      { x: 28, y: 36, inlet: 2, outlet: 0 },
      { x: 29, y: 36, inlet: 2, outlet: 0 },
    ],
    containmentProfileId: "lined",
  });
  const tank = build({
    type: "placeTank",
    x: 30,
    y: 35,
    direction: 0,
    containmentProfileId: "lined",
  });
  tick(160);
  expect(sim.serialize().pumps[p].incident?.quantity).toBe(1);
  expect(sim.snapshot().pumps.find((x) => x.id === p)?.status).toBe("incident");
  expect(
    sim.snapshot().factories.find((x) => x.id === f)?.contract
      .liquidInventory?.["liquid-0"],
  ).toBe(1);
  expect(
    sim.snapshot().factories.find((x) => x.id === f)?.contract.statusCounts
      .incident,
  ).toBe(1);
  const blueprint = factoryBlueprint(fixture, sim.serialize(), f);
  expect(blueprint.pumps![0].enabled).toBe(false);
  expect(JSON.stringify(blueprint)).not.toMatch(
    /incident|drainEnabled|quantity|materialId|startedAt/,
  );
  build({ type: "setEnabled", machineId: e, enabled: false });
  const saved = sim.serialize(),
    restored = new Simulation(fixture);
  expect(restored.load(saved).ok).toBe(true);
  for (let i = 0; i < 60; i++) {
    tick(1);
    restored.step(100);
    expect(restored.serialize()).toEqual(sim.serialize());
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
  }
  build({ type: "setPumpRecoveryDrain", id: p, enabled: true });
  tick(20);
  expect(sim.serialize().pumps[p].incident?.quantity).toBe(0);
  expect(sim.serialize().tanks[tank].quantity).toBe(1);
  build({
    type: "setLiquidContainmentProfile",
    id: p,
    containmentProfileId: "lined",
  });
  build({ type: "repairPump", id: p });
  expect(sim.serialize().pumps[p].enabled).toBe(false);
  build({ type: "setPumpEnabled", id: p, enabled: true });
  tick(40);
  expect(sim.serialize().tanks[tank].quantity).toBeGreaterThan(1);
  expect(sim.serialize().pumps[p].incident).toBeNull();
  build({
    type: "placePump",
    x: 32,
    y: 36,
    direction: 0,
    containmentProfileId: "lined",
  });
  build({ type: "placePort", factoryId: f, x: 33, y: 33, direction: 3 });
  build({
    type: "placePipes",
    containmentProfileId: "lined",
    points: [
      { x: 33, y: 36, inlet: 2, outlet: 3 },
      ...[35, 34, 33].map((y) => ({ x: 33, y, inlet: 1, outlet: 3 })),
      { x: 33, y: 32, inlet: 1, outlet: 0 },
      ...[34, 35, 36, 37, 38].map((x) => ({ x, y: 32, inlet: 2, outlet: 0 })),
      { x: 39, y: 32, inlet: 2, outlet: 3 },
      ...[31, 30].map((y) => ({ x: 39, y, inlet: 1, outlet: 3 })),
    ],
  });
  build({ type: "installTerminalModule", definitionId: "liquid-dock" });
  build({ type: "setPolicy", materialId: "liquid-0", policy: "export" });
  if (sim.serialize().fuel < 2) build({ type: "assistance" });
  tick(180);
  expect(sim.serialize().flows.exported["liquid-0"]).toBeGreaterThan(0);
});
