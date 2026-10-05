import { expect, it } from "vitest";
import { fixture } from "@site/content";
import { Simulation, auditLedger, type GameCommand } from "../src/index";

it("completes the Phase 10 manufactured exploration loop in one persistent world", () => {
  const sim = new Simulation(fixture);

  const audit = (current: Simulation) => {
    const report = auditLedger(fixture, current.serialize());
    expect(report.mismatches).toEqual([]);
    expect(current.serialize().flows.discarded).toEqual({});
  };

  const command = (value: GameCommand) => {
    const result = sim.command(value);
    expect(result.ok, JSON.stringify(value) + ": " + result.message).toBe(true);
    audit(sim);
    return result.id!;
  };

  const tickUntil = (predicate: () => boolean, maxTicks = 600) => {
    for (let tick = 0; tick < maxTicks; tick++) {
      if (predicate()) return;
      sim.step(fixture.tickMs);
      audit(sim);
    }
    expect(predicate()).toBe(true);
  };

  expect(
    sim.command({
      type: "sense",
      capabilityId: "resonance-probe",
      x: 57,
      y: 10,
    }),
  ).toMatchObject({ ok: false, message: "Sensing capability is locked" });
  expect(JSON.stringify(sim.snapshot())).not.toContain("catalyst-seam-a");
  expect(JSON.stringify(sim.serialize())).not.toContain("catalyst-seam-a");

  const factory = command({
    type: "placeFactory",
    x: 23,
    y: 33,
    width: 17,
    height: 10,
  });
  command({ type: "placePort", factoryId: factory, x: 23, y: 36, direction: 0 });
  const sealedExtractor = command({
    type: "placeMachine",
    definitionId: "extractor",
    x: 15,
    y: 35,
    direction: 0,
  });
  const sealedFurnace = command({
    type: "placeMachine",
    definitionId: "sealed-furnace",
    x: 25,
    y: 35,
    direction: 0,
  });
  command({
    type: "placeBelts",
    points: Array.from({ length: 8 }, (_, index) => ({
      x: 17 + index,
      y: 36,
    })),
    direction: 0,
  });

  tickUntil(() => sim.serialize().knowledge.includes("heat-raw-sealed"), 240);
  expect(
    sim.snapshot().definitions.find(
      (definition) => definition.id === "deep-extractor",
    )?.unlock?.unlocked,
  ).toBe(true);
  command({ type: "setEnabled", machineId: sealedExtractor, enabled: false });
  command({ type: "setEnabled", machineId: sealedFurnace, enabled: false });

  command({ type: "placePort", factoryId: factory, x: 23, y: 40, direction: 0 });
  const gasExtractor = command({
    type: "placeMachine",
    definitionId: "extractor",
    x: 15,
    y: 39,
    direction: 0,
  });
  command({
    type: "placeBelts",
    points: Array.from({ length: 8 }, (_, index) => ({
      x: 17 + index,
      y: 40,
    })),
    direction: 0,
  });
  const liquefier = command({
    type: "placeMachine",
    definitionId: "liquefier",
    x: 25,
    y: 39,
    direction: 0,
  });
  const pump = command({
    type: "placePump",
    containmentProfileId: "lined",
    x: 27,
    y: 40,
    direction: 0,
  });
  command({
    type: "placePipes",
    containmentProfileId: "lined",
    points: [{ x: 28, y: 40, inlet: 2, outlet: 0 }],
  });
  const vaporizer = command({
    type: "placeMachine",
    definitionId: "vaporizer",
    x: 29,
    y: 39,
    direction: 0,
  });
  const feed = command({
    type: "placeCompressor",
    x: 31,
    y: 40,
    direction: 0,
  });
  command({
    type: "placePressureLines",
    points: [{ x: 32, y: 40, inlet: 2, outlet: 0 }],
  });
  command({
    type: "placePressureVessel",
    x: 33,
    y: 39,
    direction: 0,
  });
  const outlet = command({
    type: "placeCompressor",
    x: 35,
    y: 40,
    direction: 0,
  });
  command({
    type: "placePressureLines",
    points: [{ x: 36, y: 40, inlet: 2, outlet: 0 }],
  });
  const collector = command({
    type: "placeMachine",
    definitionId: "gas-collector",
    x: 37,
    y: 39,
    direction: 0,
  });

  tickUntil(() => sim.serialize().knowledge.includes("collect-gas-0"), 360);
  expect(
    sim.snapshot().sensingCapabilities.find(
      (capability) => capability.id === "resonance-probe",
    )?.unlocked,
  ).toBe(true);
  expect(sim.serialize().machines[collector].output.granules ?? 0).toBeGreaterThan(
    0,
  );

  command({ type: "setEnabled", machineId: gasExtractor, enabled: false });
  command({ type: "setEnabled", machineId: liquefier, enabled: false });
  command({ type: "setPumpEnabled", id: pump, enabled: false });
  command({ type: "setEnabled", machineId: vaporizer, enabled: false });
  command({ type: "setCompressorEnabled", id: feed, enabled: false });
  command({ type: "setCompressorEnabled", id: outlet, enabled: false });
  command({ type: "setEnabled", machineId: collector, enabled: false });

  expect(
    sim.command({
      type: "sense",
      capabilityId: "resonance-probe",
      x: 57,
      y: 10,
    }),
  ).toMatchObject({ ok: true });
  audit(sim);
  expect(sim.serialize().discoveredDeposits).toContain("catalyst-seam-a");
  expect(sim.serialize().deposits["catalyst-seam-a"]).toBe(800);
  expect(JSON.stringify(sim.snapshot())).not.toContain("anomaly-d");

  // Exercise the distinct non-surface Phase 10 source in this same persistent world.
  expect(JSON.stringify(sim.snapshot())).not.toContain("atmospheric-plume-a");
  expect(
    sim.command({
      type: "sense",
      capabilityId: "core-probe",
      x: 70,
      y: 26,
    }),
  ).toMatchObject({ ok: true });
  audit(sim);
  expect(sim.serialize().atmosphericSources["atmospheric-plume-a"]).toBe(600);

  command({
    type: "placeMachine",
    definitionId: "atmospheric-intake",
    x: 69,
    y: 25,
    direction: 2,
  });
  const atmosphereFactory = command({
    type: "placeFactory",
    x: 56,
    y: 21,
    width: 10,
    height: 10,
  });
  command({
    type: "placePort",
    factoryId: atmosphereFactory,
    x: 65,
    y: 26,
    direction: 2,
  });
  const atmosphereCollector = command({
    type: "placeMachine",
    definitionId: "gas-collector",
    x: 62,
    y: 25,
    direction: 2,
  });
  command({ type: "placeCompressor", x: 68, y: 26, direction: 2 });
  command({
    type: "placePressureLines",
    points: [
      { x: 67, y: 26, inlet: 0, outlet: 2 },
      { x: 66, y: 26, inlet: 0, outlet: 2 },
      { x: 65, y: 26, inlet: 0, outlet: 2 },
      { x: 64, y: 26, inlet: 0, outlet: 2 },
    ],
  });
  tickUntil(
    () => (sim.serialize().machines[atmosphereCollector].output.granules ?? 0) > 0,
    360,
  );
  expect(sim.serialize().atmosphericSources["atmospheric-plume-a"]).toBeLessThan(600);
  audit(sim);

  const catalystFactory = command({
    type: "placeFactory",
    x: 61,
    y: 7,
    width: 6,
    height: 6,
  });
  command({
    type: "placePort",
    factoryId: catalystFactory,
    x: 61,
    y: 10,
    direction: 0,
  });
  command({
    type: "placeMachine",
    definitionId: "deep-extractor",
    x: 55,
    y: 9,
    direction: 0,
  });
  command({
    type: "placeBelts",
    points: Array.from({ length: 6 }, (_, index) => ({
      x: 57 + index,
      y: 10,
    })),
    direction: 0,
  });
  const sinterer = command({
    type: "placeMachine",
    definitionId: "sinterer",
    x: 63,
    y: 9,
    direction: 0,
  });

  tickUntil(
    () =>
      sim.serialize().knowledge.includes("sinter-catalyst") &&
      (sim.serialize().machines[sinterer].output.matrix ?? 0) > 0,
    360,
  );

  expect(sim.serialize().deposits["catalyst-seam-a"]).toBeLessThan(800);
  expect(sim.snapshot().materials.some((material) => material.id === "matrix")).toBe(
    true,
  );
  expect(
    sim.snapshot().exchange.some((entry) => entry.materialId === "matrix"),
  ).toBe(true);
  audit(sim);

  const restored = new Simulation(fixture);
  expect(restored.load(JSON.parse(JSON.stringify(sim.serialize()))).ok).toBe(true);
  for (let tick = 0; tick < 60; tick++) {
    sim.step(fixture.tickMs);
    restored.step(fixture.tickMs);
    audit(sim);
    audit(restored);
    expect(restored.serialize()).toEqual(sim.serialize());
  }
});
