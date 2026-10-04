import { it, expect } from "vitest";
import { fixture } from "@site/content";
import { Simulation, auditLedger, type GameCommand } from "../src/index";

it("preserves one fresh expedition through contained recovery, liquid storage, gas storage and terminal export", () => {
  const sim = new Simulation(fixture);
  const audit = (s: Simulation) => {
    const report = auditLedger(fixture, s.serialize());
    expect(report.mismatches).toEqual([]);
    expect(s.serialize().flows.discarded).toEqual({});
  };
  const command = (c: GameCommand) => {
    const result = sim.command(c);
    expect(result.ok, JSON.stringify(c) + ": " + result.message).toBe(true);
    audit(sim);
    return result.id!;
  };
  const tick = (n: number) => {
    for (let i = 0; i < n; i++) {
      sim.step(fixture.tickMs);
      audit(sim);
    }
  };
  const restore = () => {
    const restored = new Simulation(fixture);
    expect(restored.load(sim.serialize()).ok).toBe(true);
    for (let i = 0; i < 60; i++) {
      tick(1);
      restored.step(fixture.tickMs);
      audit(restored);
      expect(restored.serialize()).toEqual(sim.serialize());
    }
  };
  expect(sim.snapshot().materials.some((m) => m.id === "gas-0")).toBe(false);
  const f = command({
    type: "placeFactory",
    x: 23,
    y: 33,
    width: 20,
    height: 10,
  });
  command({ type: "placePort", factoryId: f, x: 23, y: 36, direction: 0 });
  command({ type: "placePort", factoryId: f, x: 42, y: 36, direction: 0 });
  const extractor = command({
    type: "placeMachine",
    definitionId: "extractor",
    x: 15,
    y: 35,
    direction: 0,
  });
  command({
    type: "placeMachine",
    definitionId: "liquefier",
    x: 25,
    y: 35,
    direction: 0,
  });
  command({
    type: "placeBelts",
    points: Array.from({ length: 8 }, (_, i) => ({ x: 17 + i, y: 36 })),
    direction: 0,
  });
  const pump = command({ type: "placePump", x: 27, y: 36, direction: 0 });
  command({
    type: "placePipes",
    containmentProfileId: "lined",
    points: [28, 29].map((x) => ({ x, y: 36, inlet: 2, outlet: 0 })),
  });
  const tank = command({
    type: "placeTank",
    containmentProfileId: "lined",
    x: 30,
    y: 35,
    direction: 0,
  });
  tick(160);
  expect(sim.serialize().pumps[pump].incident?.quantity).toBe(1);
  const failure = sim.serialize();
  expect(sim.command({ type: "reclaim", id: pump }).ok).toBe(false);
  expect(sim.serialize()).toEqual(failure);
  restore();
  command({ type: "setPumpRecoveryDrain", id: pump, enabled: true });
  tick(20);
  expect(sim.serialize().tanks[tank].quantity).toBe(1);
  expect(sim.serialize().pumps[pump].incident?.quantity).toBe(0);
  command({
    type: "setLiquidContainmentProfile",
    id: pump,
    containmentProfileId: "lined",
  });
  command({ type: "repairPump", id: pump });
  expect(sim.serialize().pumps[pump].enabled).toBe(false);
  command({ type: "setPumpEnabled", id: pump, enabled: true });
  command({
    type: "placePump",
    containmentProfileId: "lined",
    x: 32,
    y: 36,
    direction: 0,
  });
  command({
    type: "placePipes",
    containmentProfileId: "lined",
    points: [{ x: 33, y: 36, inlet: 2, outlet: 0 }],
  });
  command({
    type: "placeMachine",
    definitionId: "vaporizer",
    x: 34,
    y: 35,
    direction: 0,
  });
  command({ type: "placeCompressor", x: 36, y: 36, direction: 0 });
  command({
    type: "placePressureLines",
    points: [{ x: 37, y: 36, inlet: 2, outlet: 0 }],
  });
  const vessel = command({
    type: "placePressureVessel",
    x: 38,
    y: 35,
    direction: 0,
  });
  const outlet = command({
    type: "placeCompressor",
    x: 40,
    y: 36,
    direction: 0,
  });
  command({ type: "setCompressorEnabled", id: outlet, enabled: false });
  command({
    type: "placePressureLines",
    points: [
      ...[41, 42, 43].map((x) => ({ x, y: 36, inlet: 2, outlet: 0 })),
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
  if (sim.serialize().fuel < 2) command({ type: "assistance" });
  tick(50);
  expect(sim.serialize().pressureVessels[vessel].quantity).toBeGreaterThan(0);
  restore();
  command({ type: "setCompressorEnabled", id: outlet, enabled: true });
  tick(70);
  expect(sim.serialize().knowledge).toContain("vaporize-liquid-0");
  expect(sim.serialize().pressureLines["42,27"].quantity).toBeGreaterThan(0);
  expect(sim.serialize().terminalModules).toEqual({});
  command({ type: "installTerminalModule", definitionId: "gas-dock" });
  tick(40);
  expect(sim.serialize().terminalModules["gas-dock"].quantity).toBeGreaterThan(
    0,
  );
  command({ type: "setEnabled", machineId: extractor, enabled: false });
  restore();
  command({ type: "setPolicy", materialId: "gas-0", policy: "export" });
  tick(20);
  expect(sim.serialize().flows.exported["gas-0"]).toBeGreaterThan(0);
  expect(sim.serialize().pumps[pump].incident).toBeNull();
  restore();
});
