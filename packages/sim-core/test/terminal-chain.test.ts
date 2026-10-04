import { it, expect } from "vitest";
import { fixture } from "@site/content";
import { Simulation, auditLedger, type GameCommand } from "../src/index";

it("discovers, installs, stages and exports liquid then gas from normal fresh-world commands", () => {
  const sim = new Simulation(fixture);
  const build = (c: GameCommand) => {
    const r = sim.command(c);
    expect(r.ok, JSON.stringify(c) + ": " + r.message).toBe(true);
    return r.id!;
  };
  const tick = (n: number) => {
    for (let i = 0; i < n; i++) {
      sim.step(100);
      expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
    }
  };
  const factoryId = build({
    type: "placeFactory",
    x: 23,
    y: 33,
    width: 20,
    height: 10,
  });
  for (const p of [
    { x: 23, y: 36, direction: 0 },
    { x: 30, y: 33, direction: 3 },
    { x: 42, y: 36, direction: 0 },
  ])
    build({ type: "placePort", factoryId, ...p });
  const extractor = build({
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
  const pump = build({
    type: "placePump",
    x: 27,
    y: 36,
    direction: 0,
    containmentProfileId: "lined",
  });
  const points = [
    { x: 28, y: 36, inlet: 2, outlet: 0 },
    { x: 29, y: 36, inlet: 2, outlet: 0 },
    { x: 30, y: 36, inlet: 2, outlet: 3 },
    ...[35, 34, 33].map((y) => ({ x: 30, y, inlet: 1, outlet: 3 })),
    { x: 30, y: 32, inlet: 1, outlet: 0 },
    ...[31, 32, 33, 34, 35, 36, 37, 38].map((x) => ({
      x,
      y: 32,
      inlet: 2,
      outlet: 0,
    })),
    { x: 39, y: 32, inlet: 2, outlet: 3 },
    ...[31, 30].map((y) => ({ x: 39, y, inlet: 1, outlet: 3 })),
  ];
  build({ type: "placePipes", points, containmentProfileId: "lined" });
  expect(
    sim.command({ type: "installTerminalModule", definitionId: "liquid-dock" })
      .ok,
  ).toBe(false);
  tick(240);
  expect(sim.serialize().knowledge).toContain("liquefy-raw");
  expect(sim.serialize().pipes["39,30"].quantity).toBeGreaterThan(0);
  expect(sim.serialize().terminalModules).toEqual({});
  build({ type: "installTerminalModule", definitionId: "liquid-dock" });
  tick(40);
  expect(
    sim.serialize().terminalModules["liquid-dock"].quantity,
  ).toBeGreaterThan(0);
  expect(
    sim.command({ type: "removeTerminalModule", definitionId: "liquid-dock" })
      .ok,
  ).toBe(false);
  build({ type: "setPolicy", materialId: "liquid-0", policy: "export" });
  tick(10);
  expect(sim.serialize().flows.exported["liquid-0"]).toBeGreaterThan(0);
  build({ type: "setPumpEnabled", id: pump, enabled: false });
  tick(60);
  expect(sim.serialize().pipes["30,36"].quantity).toBe(0);
  build({
    type: "configurePipe",
    id: sim.serialize().pipes["30,36"].id,
    inlet: 2,
    outlet: 0,
  });
  build({
    type: "placeMachine",
    definitionId: "vaporizer",
    x: 31,
    y: 35,
    direction: 0,
  });
  build({ type: "placeCompressor", x: 33, y: 36, direction: 0 });
  build({
    type: "placePressureLines",
    points: [
      ...[34, 35, 36, 37, 38, 39, 40, 41, 42, 43].map((x) => ({
        x,
        y: 36,
        inlet: 2,
        outlet: 0,
      })),
      { x: 44, y: 36, inlet: 2, outlet: 3 },
      ...[35, 34, 33, 32, 31, 30, 29, 28].map((y) => ({
        x: 44,
        y,
        inlet: 1,
        outlet: 3,
      })),
      { x: 44, y: 27, inlet: 1, outlet: 2 },
      ...[43, 42].map((x) => ({ x, y: 27, inlet: 0, outlet: 2 })),
    ],
  });
  build({ type: "setPumpEnabled", id: pump, enabled: true });
  if (sim.serialize().fuel < 2) build({ type: "assistance" });
  tick(220);
  if (sim.serialize().fuel < 2) {
    build({ type: "assistance" });
    tick(160);
  }
  expect(sim.serialize().knowledge).toContain("vaporize-liquid-0");
  expect(sim.serialize().pressureLines["42,27"].quantity).toBeGreaterThan(0);
  build({ type: "installTerminalModule", definitionId: "gas-dock" });
  tick(30);
  expect(sim.serialize().terminalModules["gas-dock"].quantity).toBeGreaterThan(
    0,
  );
  build({ type: "setEnabled", machineId: extractor, enabled: false });
  const saved = sim.serialize(),
    restored = new Simulation(fixture);
  expect(restored.load(saved).ok).toBe(true);
  for (let i = 0; i < 60; i++) {
    tick(1);
    restored.step(100);
    expect(restored.serialize()).toEqual(sim.serialize());
  }
  build({ type: "setPolicy", materialId: "gas-0", policy: "export" });
  tick(10);
  expect(sim.serialize().flows.exported["gas-0"]).toBeGreaterThan(0);
});
