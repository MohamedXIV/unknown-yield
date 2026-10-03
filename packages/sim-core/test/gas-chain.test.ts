import { it, expect } from "vitest";
import { fixture } from "@site/content";
import { Simulation, auditLedger, type GameCommand } from "../src/index";

it("discovers a normal-command liquid-gas-solid chain and conserves every step across restore", () => {
  const sim = new Simulation(fixture);
  expect(sim.snapshot().materials.some((m) => m.id === "gas-0")).toBe(false);
  const build = (cmd: GameCommand) => {
    const r = sim.command(cmd);
    expect(r.ok, JSON.stringify(cmd) + ": " + r.message).toBe(true);
    return r.id!;
  };
  const factory = build({
    type: "placeFactory",
    x: 23,
    y: 33,
    width: 20,
    height: 10,
  });
  build({ type: "placePort", factoryId: factory, x: 23, y: 36, direction: 0 });
  build({
    type: "placeMachine",
    definitionId: "extractor",
    x: 15,
    y: 35,
    direction: 0,
  });
  build({
    type: "placeBelts",
    points: Array.from({ length: 8 }, (_, i) => ({ x: 17 + i, y: 36 })),
    direction: 0,
  });
  build({
    type: "placeMachine",
    definitionId: "liquefier",
    x: 25,
    y: 35,
    direction: 0,
  });
  build({ type: "placePump", x: 27, y: 36, direction: 0 });
  build({
    type: "placePipes",
    points: [{ x: 28, y: 36, inlet: 2, outlet: 0 }],
  });
  const vaporizer = build({
    type: "placeMachine",
    definitionId: "vaporizer",
    x: 29,
    y: 35,
    direction: 0,
  });
  const feed = build({ type: "placeCompressor", x: 31, y: 36, direction: 0 });
  build({
    type: "placePressureLines",
    points: [{ x: 32, y: 36, inlet: 2, outlet: 0 }],
  });
  build({ type: "placePressureVessel", x: 33, y: 35, direction: 0 });
  const outlet = build({ type: "placeCompressor", x: 35, y: 36, direction: 0 });
  build({
    type: "placePressureLines",
    points: [{ x: 36, y: 36, inlet: 2, outlet: 0 }],
  });
  const collector = build({
    type: "placeMachine",
    definitionId: "gas-collector",
    x: 37,
    y: 35,
    direction: 0,
  });
  for (let i = 0; i < 220; i++) {
    sim.step(fixture.tickMs);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  }
  expect(sim.serialize().knowledge).toEqual(
    expect.arrayContaining([
      "liquefy-raw",
      "vaporize-liquid-0",
      "collect-gas-0",
    ]),
  );
  expect(sim.serialize().machines[collector].output.granules).toBeGreaterThan(
    0,
  );
  expect(sim.snapshot().materials.some((m) => m.id === "gas-0")).toBe(true);
  const saved = sim.serialize(),
    snapshot = sim.snapshot();
  snapshot.pressureLines[0].quantity = 999;
  expect(sim.serialize()).toEqual(saved);
  expect(
    sim.command({ type: "setCompressorEnabled", id: outlet, enabled: false })
      .ok,
  ).toBe(true);
  expect(
    sim.command({ type: "setCompressorEnabled", id: feed, enabled: false }).ok,
  ).toBe(true);
  const restored = new Simulation(fixture);
  expect(restored.load(sim.serialize()).ok).toBe(true);
  for (let i = 0; i < 60; i++) {
    sim.step(fixture.tickMs);
    restored.step(fixture.tickMs);
    expect(restored.serialize()).toEqual(sim.serialize());
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  }
  expect(sim.serialize().machines[vaporizer]).toBeDefined();
});
