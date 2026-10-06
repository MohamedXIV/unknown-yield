import { expect, it } from "vitest";
import { fixture } from "@site/content";
import { Simulation, auditLedger, type GameCommand } from "../src/index";

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, JSON.stringify(command) + ": " + result.message).toBe(true);
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

function audit(sim: Simulation) {
  const report = auditLedger(fixture, sim.serialize());
  expect(report.ok, JSON.stringify(report.mismatches)).toBe(true);
  expect(sim.serialize().flows.discarded).toEqual({});
}

const inventoryTotal = (inventory: Record<string, number>) =>
  Object.values(inventory).reduce((sum, amount) => sum + amount, 0);

function machineDrained(sim: Simulation, id: string) {
  const machine = sim.serialize().machines[id];
  return (
    machine.job === null &&
    inventoryTotal(machine.input) === 0 &&
    inventoryTotal(machine.output) === 0 &&
    inventoryTotal(machine.incidentInventory) === 0
  );
}

function tickUntil(
  sim: Simulation,
  predicate: () => boolean,
  maxTicks: number,
  label: string,
) {
  for (let tick = 0; tick < maxTicks && !predicate(); tick++)
    sim.step(fixture.tickMs);
  expect(predicate(), label).toBe(true);
}

it("plays a fresh Phase 15 expedition from ordinary industry into company-learned Phase technology", () => {
  const sim = new Simulation(fixture);
  const initial = sim.snapshot();

  expect(initial.materials.some((entry) => entry.id === "phase-lattice")).toBe(
    false,
  );
  expect(
    initial.sensingCapabilities.some((entry) => entry.id === "phase-probe"),
  ).toBe(false);
  expect(
    initial.milestones.some(
      (entry) => entry.id === "phase-lattice-certified",
    ),
  ).toBe(false);
  expect(
    initial.importSupplies.some(
      (entry) => entry.id === "orbital-resonance-seed-crate",
    ),
  ).toBe(false);
  expect(JSON.stringify(initial)).not.toContain("phase-lattice-seam-a");
  audit(sim);

  // Let the company publish its initial property/directive work before the
  // first experiment. This is ordinary simulation time, not injected state.
  tickUntil(
    sim,
    () =>
      sim
        .snapshot()
        .opportunities.some((entry) => entry.id === "sealed-thermal-study"),
    fixture.economy.marketEveryTicks + 5,
    "sealed thermal study should be offered",
  );

  // Era 1 — a stable structural family branches into a specialty export.
  const ferriteFactory = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 22,
    width: 10,
    height: 10,
  });
  for (const x of [24, 33])
    build(sim, {
      type: "placePort",
      factoryId: ferriteFactory,
      x,
      y: 27,
      direction: 0,
    });
  const ferriteExtractor = build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 26,
    direction: 0,
  });
  const ferriteFurnace = build(sim, {
    type: "placeMachine",
    definitionId: "furnace",
    x: 27,
    y: 26,
    direction: 0,
  });
  build(sim, path(20, 27, 26, 27));
  const ferriteExportPath = Array.from({ length: 9 }, (_, index) => ({
    x: 29 + index,
    y: 27,
  }));
  build(sim, {
    type: "placeBelts",
    points: ferriteExportPath,
    direction: 0,
  });

  tickUntil(
    sim,
    () => sim.serialize().knowledge.includes("heat-ferrite"),
    500,
    "ferrite thermal branch should be discovered",
  );
  expect(
    sim.command({
      type: "setPolicy",
      materialId: "ferrite-ceramic",
      policy: "export",
    }).ok,
  ).toBe(true);
  tickUntil(
    sim,
    () => (sim.serialize().flows.exported["ferrite-ceramic"] ?? 0) >= 4,
    1000,
    "magnetic ceramic should reach the Materials Exchange",
  );
  expect(
    sim.snapshot().knowledgeInsights.find(
      (entry) => entry.id === "ferrite-ceramic-market",
    ),
  ).toBeTruthy();
  build(sim, {
    type: "setEnabled",
    machineId: ferriteExtractor,
    enabled: false,
  });
  build(sim, {
    type: "setEnabled",
    machineId: ferriteFurnace,
    enabled: false,
  });
  tickUntil(
    sim,
    () =>
      sim.serialize().machines[ferriteFurnace].job === null &&
      (sim.serialize().machines[ferriteFurnace].output["ferrite-ceramic"] ?? 0) ===
        0 &&
      ferriteExportPath.every((point) => {
        const belt = Object.values(sim.serialize().belts).find(
          (entry) => entry.x === point.x && entry.y === point.y,
        );
        return belt?.cargo === null;
      }),
    300,
    "the temporary ferrite export corridor should drain",
  );
  for (const point of ferriteExportPath) {
    const belt = Object.values(sim.serialize().belts).find(
      (entry) => entry.x === point.x && entry.y === point.y,
    )!;
    expect(sim.command({ type: "dismantle", id: belt.id }).ok).toBe(true);
  }
  audit(sim);

  // Era 2 — the reactive family crosses solid -> corrosive liquid -> gas and
  // teaches the company sealed handling, gas logistics and resonance sensing.
  const reactiveFactory = build(sim, {
    type: "placeFactory",
    x: 23,
    y: 34,
    width: 17,
    height: 7,
  });
  build(sim, {
    type: "placePort",
    factoryId: reactiveFactory,
    x: 23,
    y: 36,
    direction: 0,
  });
  const sealedExtractor = build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 15,
    y: 35,
    direction: 0,
  });
  const sealedFurnace = build(sim, {
    type: "placeMachine",
    definitionId: "sealed-furnace",
    x: 25,
    y: 35,
    direction: 0,
  });
  build(sim, {
    type: "placeBelts",
    points: Array.from({ length: 8 }, (_, index) => ({
      x: 17 + index,
      y: 36,
    })),
    direction: 0,
  });

  tickUntil(
    sim,
    () => sim.serialize().knowledge.includes("heat-raw-sealed"),
    300,
    "sealed veined-material study should complete",
  );
  expect(sim.serialize().opportunities["sealed-thermal-study"]).toMatchObject({
    status: "completed",
  });
  build(sim, {
    type: "setEnabled",
    machineId: sealedExtractor,
    enabled: false,
  });
  build(sim, {
    type: "setEnabled",
    machineId: sealedFurnace,
    enabled: false,
  });

  tickUntil(
    sim,
    () =>
      sim
        .snapshot()
        .opportunities.some((entry) => entry.id === "granules-procurement"),
    fixture.economy.marketEveryTicks + 5,
    "granules procurement should be offered",
  );
  expect(
    sim.command({
      type: "setPolicy",
      materialId: "granules",
      policy: "export",
    }).ok,
  ).toBe(true);

  build(sim, {
    type: "placePort",
    factoryId: reactiveFactory,
    x: 23,
    y: 39,
    direction: 0,
  });
  build(sim, {
    type: "placePort",
    factoryId: reactiveFactory,
    x: 39,
    y: 39,
    direction: 0,
  });
  const gasExtractor = build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 15,
    y: 38,
    direction: 0,
  });
  build(sim, {
    type: "placeBelts",
    points: Array.from({ length: 8 }, (_, index) => ({
      x: 17 + index,
      y: 39,
    })),
    direction: 0,
  });
  const liquefier = build(sim, {
    type: "placeMachine",
    definitionId: "liquefier",
    x: 25,
    y: 38,
    direction: 0,
  });
  const pump = build(sim, {
    type: "placePump",
    containmentProfileId: "lined",
    x: 27,
    y: 39,
    direction: 0,
  });
  build(sim, {
    type: "placePipes",
    containmentProfileId: "lined",
    points: [{ x: 28, y: 39, inlet: 2, outlet: 0 }],
  });
  const vaporizer = build(sim, {
    type: "placeMachine",
    definitionId: "vaporizer",
    x: 29,
    y: 38,
    direction: 0,
  });
  const compressor = build(sim, {
    type: "placeCompressor",
    x: 31,
    y: 39,
    direction: 0,
  });
  build(sim, {
    type: "placePressureLines",
    points: [32, 33, 34, 35, 36].map((x) => ({
      x,
      y: 39,
      inlet: 2,
      outlet: 0,
    })),
  });
  const collector = build(sim, {
    type: "placeMachine",
    definitionId: "gas-collector",
    x: 37,
    y: 38,
    direction: 0,
  });
  const granuleExportPath = [
    { x: 39, y: 39 },
    { x: 40, y: 39 },
    ...Array.from({ length: 9 }, (_, index) => ({
      x: 40,
      y: 38 - index,
    })),
  ];
  build(sim, {
    type: "placeBelts",
    points: granuleExportPath,
    direction: 3,
  });

  tickUntil(
    sim,
    () =>
      sim.serialize().knowledge.includes("collect-gas-0") &&
      (sim.serialize().flows.exported.granules ?? 0) >= 4,
    900,
    "gas collection should certify resonance sensing and fulfill a granules shipment",
  );
  expect(sim.serialize().opportunities["granules-procurement"]).toMatchObject({
    status: "completed",
    progress: 4,
  });
  expect(
    sim.snapshot().sensingCapabilities.find(
      (entry) => entry.id === "resonance-probe",
    )?.unlocked,
  ).toBe(true);

  // Stop only the source first. The downstream chain stays live long enough
  // to consume every physical unit already in flight, then its solved capital
  // can be reclaimed for the next industrial district.
  build(sim, {
    type: "setEnabled",
    machineId: gasExtractor,
    enabled: false,
  });
  const gasFeedPoints = Array.from({ length: 8 }, (_, index) => ({
    x: 17 + index,
    y: 39,
  }));
  const pressurePoints = [32, 33, 34, 35, 36].map((x) => ({ x, y: 39 }));
  tickUntil(
    sim,
    () =>
      machineDrained(sim, gasExtractor) &&
      sim.serialize().machines[liquefier].job === null &&
      inventoryTotal(sim.serialize().machines[liquefier].output) === 0 &&
      machineDrained(sim, vaporizer) &&
      machineDrained(sim, collector) &&
      gasFeedPoints.every((point) => {
        const belt = Object.values(sim.serialize().belts).find(
          (entry) => entry.x === point.x && entry.y === point.y,
        );
        return belt?.cargo === null;
      }) &&
      granuleExportPath.every((point) => {
        const belt = Object.values(sim.serialize().belts).find(
          (entry) => entry.x === point.x && entry.y === point.y,
        );
        return belt?.cargo === null;
      }) &&
      sim.serialize().pipes["28,39"].quantity === 0 &&
      pressurePoints.every(
        (point) => sim.serialize().pressureLines[point.x + "," + point.y].quantity === 0,
      ),
    700,
    "the reactive gas line should drain before capital recovery",
  );

  for (const command of [
    { type: "setEnabled", machineId: liquefier, enabled: false },
    { type: "setPumpEnabled", id: pump, enabled: false },
    { type: "setEnabled", machineId: vaporizer, enabled: false },
    { type: "setCompressorEnabled", id: compressor, enabled: false },
    { type: "setEnabled", machineId: collector, enabled: false },
  ] satisfies GameCommand[])
    build(sim, command);

  // The liquefier may retain one raw unit, which is real inventory below its
  // two-unit batch size. Keep that solved machine intact rather than deleting
  // or teleporting the remainder.
  for (const id of [gasExtractor, vaporizer, collector, pump, compressor])
    expect(sim.command({ type: "dismantle", id }).ok).toBe(true);

  const pipeId = sim.serialize().pipes["28,39"].id;
  expect(sim.command({ type: "dismantle", id: pipeId }).ok).toBe(true);
  for (const point of pressurePoints) {
    const line = sim.serialize().pressureLines[point.x + "," + point.y];
    expect(sim.command({ type: "dismantle", id: line.id }).ok).toBe(true);
  }
  for (const point of [...gasFeedPoints, ...granuleExportPath]) {
    const belt = Object.values(sim.serialize().belts).find(
      (entry) => entry.x === point.x && entry.y === point.y,
    )!;
    expect(sim.command({ type: "dismantle", id: belt.id }).ok).toBe(true);
  }
  audit(sim);

  // Era 3 — physical higher fuel classes gate deep extraction and sintering.
  expect(
    sim.command({
      type: "sense",
      capabilityId: "resonance-probe",
      x: 57,
      y: 10,
    }).ok,
  ).toBe(true);
  expect(sim.serialize().discoveredDeposits).toContain("catalyst-seam-a");
  expect(
    sim.snapshot().sensingCapabilities.some(
      (entry) => entry.id === "phase-probe",
    ),
  ).toBe(false);

  build(sim, { type: "installTerminalModule", definitionId: "gas-dock" });
  build(sim, { type: "installTerminalModule", definitionId: "cryo-dock" });
  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-propellant-cylinder",
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-coolant-canister",
    }).ok,
  ).toBe(true);

  const catalystFactory = build(sim, {
    type: "placeFactory",
    x: 61,
    y: 7,
    width: 6,
    height: 6,
  });
  build(sim, {
    type: "placePort",
    factoryId: catalystFactory,
    x: 61,
    y: 10,
    direction: 0,
  });
  const deepExtractor = build(sim, {
    type: "placeMachine",
    definitionId: "deep-extractor",
    x: 55,
    y: 9,
    direction: 0,
  });
  build(sim, {
    type: "placeBelts",
    points: Array.from({ length: 6 }, (_, index) => ({
      x: 57 + index,
      y: 10,
    })),
    direction: 0,
  });
  const catalystSinterer = build(sim, {
    type: "placeMachine",
    definitionId: "sinterer",
    x: 63,
    y: 9,
    direction: 0,
  });

  tickUntil(
    sim,
    () => sim.serialize().deposits["catalyst-seam-a"] <= 798,
    300,
    "deep extractor should produce exactly enough catalyst feed",
  );
  build(sim, {
    type: "setEnabled",
    machineId: deepExtractor,
    enabled: false,
  });
  tickUntil(
    sim,
    () =>
      sim.serialize().knowledge.includes("sinter-catalyst") &&
      (sim.serialize().machines[catalystSinterer].output.matrix ?? 0) > 0,
    500,
    "local catalyst sintering should discover matrix",
  );
  build(sim, {
    type: "setEnabled",
    machineId: catalystSinterer,
    enabled: false,
  });
  expect(sim.snapshot().materials.some((entry) => entry.id === "matrix")).toBe(
    true,
  );
  tickUntil(
    sim,
    () =>
      sim.serialize().machines[deepExtractor].job === null &&
      inventoryTotal(sim.serialize().machines[deepExtractor].output) === 0,
    300,
    "the catalyst Deep extractor should finish and release its output",
  );
  expect(sim.command({ type: "dismantle", id: deepExtractor }).ok).toBe(true);
  audit(sim);

  // Era 4 — that player discovery creates company R&D which returns a hidden
  // off-world seed; the seed then unlocks a deeper local capability.
  tickUntil(
    sim,
    () =>
      sim
        .snapshot()
        .opportunities.some(
          (entry) => entry.id === "matrix-orbital-application",
        ),
    fixture.economy.marketEveryTicks + 5,
    "matrix discovery should create company orbital R&D",
  );
  expect(
    sim.snapshot().importSupplies.some(
      (entry) => entry.id === "orbital-resonance-seed-crate",
    ),
  ).toBe(false);

  // Reuse the solved catalyst Sinterer instead of building a second research
  // factory. A temporary dry corridor connects the terminal import outlet to
  // the existing catalyst feed belt.
  tickUntil(
    sim,
    () =>
      sim.serialize().machines[catalystSinterer].job === null &&
      (sim.serialize().machines[catalystSinterer].input.catalyst ?? 0) < 2,
    300,
    "the catalyst Sinterer should be ready for company R&D feed",
  );
  const researchSinterer = catalystSinterer;
  const researchImportPath = path(42, 28, 56, 10, 0);
  build(sim, researchImportPath);
  build(sim, {
    type: "setEnabled",
    machineId: researchSinterer,
    enabled: true,
  });

  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-binder-crate",
    }).ok,
  ).toBe(true);
  tickUntil(
    sim,
    () =>
      sim.serialize().knowledge.includes("sinter-orbital-binder") &&
      (sim.serialize().terminalImports.staging["orbital-binder"] ?? 0) === 0 &&
      (sim.serialize().machines[researchSinterer].input["orbital-binder"] ?? 0) ===
        0 &&
      sim.serialize().machines[researchSinterer].job === null,
    1200,
    "physical orbital binder should complete company R&D",
  );
  expect(
    sim.serialize().opportunities["matrix-orbital-application"],
  ).toMatchObject({
    status: "completed",
    progress: 1,
  });
  expect(
    sim.serialize().company.importAllocations[
      "orbital-resonance-seed-crate"
    ],
  ).toBe(1);
  expect(
    sim.snapshot().importSupplies.find(
      (entry) => entry.id === "orbital-resonance-seed-crate",
    ),
  ).toMatchObject({ eligible: true, allocations: 1 });

  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-coolant-canister",
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "requestImport",
      supplyId: "orbital-resonance-seed-crate",
    }).ok,
  ).toBe(true);
  tickUntil(
    sim,
    () => sim.serialize().knowledge.includes("sinter-resonance-seed"),
    600,
    "company resonance seed should become local Phase lattice",
  );
  build(sim, {
    type: "setEnabled",
    machineId: researchSinterer,
    enabled: false,
  });

  expect(
    sim.snapshot().sensingCapabilities.find(
      (entry) => entry.id === "phase-probe",
    ),
  ).toMatchObject({ unlocked: true });
  expect(
    sim.snapshot().milestones.find(
      (entry) => entry.id === "phase-lattice-certified",
    ),
  ).toMatchObject({ completed: true });
  expect(
    sim.snapshot().definitions.find((entry) => entry.id === "phase-quencher")
      ?.unlock,
  ).toMatchObject({ unlocked: true });
  expect(JSON.stringify(initial)).not.toContain("phase-lattice");
  expect(sim.snapshot().materials.some((entry) => entry.id === "phase-lattice")).toBe(
    true,
  );
  expect(JSON.stringify(sim.snapshot())).not.toContain("phase-lattice-seam-a");

  expect(
    sim.command({
      type: "sense",
      capabilityId: "phase-probe",
      x: 73,
      y: 50,
    }).ok,
  ).toBe(true);
  expect(sim.serialize().discoveredDeposits).toContain("phase-lattice-seam-a");

  const phaseExtractor = build(sim, {
    type: "placeMachine",
    definitionId: "deep-extractor",
    x: 71,
    y: 49,
    direction: 0,
  });
  tickUntil(
    sim,
    () =>
      (sim.serialize().machines[phaseExtractor].output["phase-lattice"] ?? 0) >
      0,
    180,
    "the company-learned phase capability should lead to native local extraction",
  );
  build(sim, {
    type: "setEnabled",
    machineId: phaseExtractor,
    enabled: false,
  });

  expect(sim.serialize().deposits["phase-lattice-seam-a"]).toBeLessThan(480);
  expect(sim.serialize().flows.produced["phase-lattice"] ?? 0).toBeGreaterThan(0);
  audit(sim);

  const checkpoint = sim.serialize();
  const restored = new Simulation(fixture);
  expect(restored.load(structuredClone(checkpoint)).ok).toBe(true);
  for (let tick = 0; tick < 20; tick++) {
    sim.step(fixture.tickMs);
    restored.step(fixture.tickMs);
  }
  expect(restored.serialize()).toEqual(sim.serialize());
  audit(restored);
});
