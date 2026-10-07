import { it, expect } from "vitest";
import {
  beltPath,
  buildCommand,
  hitTest,
  structureKey,
  BUILD_PALETTE,
  DEFAULT_MODE,
  TOOL_GROUPS,
  TOOL_HOTKEYS,
  buildPaletteTools,
  toolGroupFor,
  toggleFactoryOpen,
} from "../game/interaction";
import { Simulation } from "@site/sim-core";
import { fixture } from "@site/content";
it("draws orthogonal paths including turns and reversed drags", () => {
  const p = beltPath({ x: 5, y: 5 }, { x: 2, y: 7 });
  expect(p).toHaveLength(6);
  for (let i = 1; i < p.length; i++)
    expect(Math.abs(p[i].x - p[i - 1].x) + Math.abs(p[i].y - p[i - 1].y)).toBe(
      1,
    );
  expect(p[0]).toEqual({ x: 5, y: 5 });
  expect(p.at(-1)).toEqual({ x: 2, y: 7 });
});
it("uses the current rotation for single belts and handles factory drag in all directions", () => {
  const s = new Simulation(fixture).snapshot();
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "belt", direction: 3 },
      s,
      { x: 3, y: 4 },
      null,
    ),
  ).toEqual({ type: "placeBelts", points: [{ x: 3, y: 4 }], direction: 3 });
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "factory" },
      s,
      { x: 24, y: 22 },
      { x: 33, y: 31 },
    ),
  ).toEqual({ type: "placeFactory", x: 24, y: 22, width: 10, height: 10 });
});
it("keeps toolbar hotkeys stable and maps the depot tool to placeStorage", () => {
  expect(TOOL_HOTKEYS).toMatchObject({
    extractor: "1",
    belt: "5",
    port: "6",
    depot: "7",
  });
  const s = new Simulation(fixture).snapshot();
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "depot", direction: 1 },
      s,
      { x: 10, y: 20 },
      null,
    ),
  ).toEqual({
    type: "placeStorage",
    definitionId: "depot",
    x: 10,
    y: 20,
    direction: 1,
  });
});

it("defines a complete deterministic grouped build palette", () => {
  const legacyTools = Object.keys(TOOL_HOTKEYS).sort();
  const paletteTools = buildPaletteTools();

  expect([...paletteTools].sort()).toEqual(legacyTools);
  expect(new Set(paletteTools).size).toBe(paletteTools.length);
  expect(BUILD_PALETTE).toHaveLength(10);

  const groupIds = TOOL_GROUPS.map((group) => group.id);
  const groupShortcuts = TOOL_GROUPS.map((group) => group.shortcut);
  expect(new Set(groupIds).size).toBe(groupIds.length);
  expect(new Set(groupShortcuts).size).toBe(groupShortcuts.length);

  for (const group of TOOL_GROUPS) {
    expect(group.tools).toContain(group.defaultTool);
    for (const tool of group.tools) expect(toolGroupFor(tool)?.id).toBe(group.id);
  }

  expect(toolGroupFor("select")).toBeNull();
  expect(toolGroupFor("demolish")).toBeNull();
  expect(toolGroupFor("extractor")?.id).toBe("acquisition");
  expect(toolGroupFor("furnace")?.id).toBe("thermal");
  expect(toolGroupFor("belt")?.id).toBe("solid-logistics");
  expect(toolGroupFor("tank")?.id).toBe("storage");
});

it("maps the atmospheric intake to a distinct machine build command", () => {
  expect(TOOL_HOTKEYS["atmospheric-intake"]).toBe("K");
  const s = new Simulation(fixture).snapshot();
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "atmospheric-intake" },
      s,
      { x: 69, y: 25 },
      null,
    ),
  ).toEqual({
    type: "placeMachine",
    definitionId: "atmospheric-intake",
    x: 69,
    y: 25,
    direction: 0,
  });
});

it("maps the Sinterer to the authored machine definition", () => {
  expect(TOOL_HOTKEYS.sinterer).toBe("N");
  const s = new Simulation(fixture).snapshot();
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "sinterer" },
      s,
      { x: 63, y: 9 },
      null,
    ),
  ).toEqual({
    type: "placeMachine",
    definitionId: "sinterer",
    x: 63,
    y: 9,
    direction: 0,
  });
});

it("maps the deep extractor to a distinct machine build command", () => {
  expect(TOOL_HOTKEYS["deep-extractor"]).toBe("0");
  const s = new Simulation(fixture).snapshot();
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "deep-extractor" },
      s,
      { x: 44, y: 16 },
      null,
    ),
  ).toEqual({
    type: "placeMachine",
    definitionId: "deep-extractor",
    x: 44,
    y: 16,
    direction: 0,
  });
});

it("selects the sealed furnace as a condition-bearing machine tool", () => {
  expect(TOOL_HOTKEYS["sealed-furnace"]).toBe("8");
  const s = new Simulation(fixture).snapshot();
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "sealed-furnace" },
      s,
      { x: 27, y: 26 },
      null,
    ),
  ).toEqual({
    type: "placeMachine",
    definitionId: "sealed-furnace",
    x: 27,
    y: 26,
    direction: 0,
  });
});
it("selects the oversealed furnace as the hazardous condition tool", () => {
  expect(TOOL_HOTKEYS["oversealed-furnace"]).toBe("9");
  const s = new Simulation(fixture).snapshot();
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "oversealed-furnace" },
      s,
      { x: 27, y: 26 },
      null,
    ),
  ).toEqual({
    type: "placeMachine",
    definitionId: "oversealed-furnace",
    x: 27,
    y: 26,
    direction: 0,
  });
});

it("hit-tests storage footprints by id", () => {
  const sim = new Simulation(fixture);
  const placed = sim.command({
    type: "placeStorage",
    definitionId: "depot",
    x: 10,
    y: 20,
    direction: 0,
  });
  expect(placed.ok).toBe(true);
  const s = sim.snapshot();
  expect(hitTest(s, { x: 11, y: 21 }, [])).toBe(placed.id);
  expect(hitTest(s, { x: 0, y: 0 }, [])).toBeNull();
});
it("invalidates world geometry on storage-only topology edits", () => {
  const sim = new Simulation(fixture);
  const before = structureKey(sim.snapshot());
  const first = sim.command({
    type: "placeStorage",
    definitionId: "depot",
    x: 10,
    y: 20,
    direction: 0,
  });
  expect(first.ok).toBe(true);
  const one = structureKey(sim.snapshot());
  expect(one).not.toBe(before);
  const second = sim.command({
    type: "placeStorage",
    definitionId: "depot",
    x: 30,
    y: 40,
    direction: 1,
  });
  expect(second.ok).toBe(true);
  const two = structureKey(sim.snapshot());
  expect(two).not.toBe(one);
  expect(sim.command({ type: "dismantle", id: second.id! }).ok).toBe(true);
  // Back to exactly the one-depot key: removal invalidates too.
  expect(structureKey(sim.snapshot())).toBe(one);
  // Cargo-only changes must not rebuild geometry.
  sim.step(5000);
  expect(structureKey(sim.snapshot())).toBe(one);
});
it("invalidates atmospheric source presentation when material identity becomes known", () => {
  const snapshot = new Simulation(fixture).snapshot();
  const source = fixture.site.atmosphericSources[0];
  snapshot.atmosphericSources = [
    {
      id: source.id,
      nameKey: source.nameKey,
      x: source.x,
      y: source.y,
      width: source.width,
      height: source.height,
      units: source.units,
      material: null,
      remaining: source.units,
    },
  ];
  const unidentified = structureKey(snapshot);
  const identified = structuredClone(snapshot);
  identified.atmosphericSources[0].material = "gas-0";
  expect(structureKey(identified)).not.toBe(unidentified);
});

it("invalidates world geometry on diverter switch/rotate", () => {
  const sim = new Simulation(fixture);
  expect(
    sim.command({
      type: "placeBelts",
      points: [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
      ],
      direction: 0,
    }).ok,
  ).toBe(true);
  const plain = structureKey(sim.snapshot());
  const id = sim.snapshot().belts[0].id;
  expect(sim.command({ type: "rotateDivert", beltId: id }).ok).toBe(true);
  const diverted = structureKey(sim.snapshot());
  expect(diverted).not.toBe(plain);
  expect(sim.command({ type: "switchDivert", beltId: id }).ok).toBe(true);
  expect(structureKey(sim.snapshot())).not.toBe(diverted);
});

it("keeps dynamic factory contracts out of the structural fingerprint", () => {
  const sim = new Simulation(fixture);
  expect(
    sim.command({
      type: "placeFactory",
      x: 24,
      y: 22,
      width: 10,
      height: 10,
    }).ok,
  ).toBe(true);

  const base = sim.snapshot(),
    dynamic = structuredClone(base);
  dynamic.factories[0].contract.throughput = {
    state: "stable",
    cycleTicks: 120,
    inputs: [
      {
        materialId: "ferrite",
        units: 6,
        cycleTicks: 120,
        unitsPerMinute: 30,
      },
    ],
    outputs: [
      {
        materialId: "plates",
        units: 18,
        cycleTicks: 120,
        unitsPerMinute: 90,
      },
    ],
  };
  dynamic.factories[0].contract.statusCounts.processing = 1;

  expect(structureKey(dynamic)).toBe(structureKey(base));

  dynamic.factories[0].width += 1;
  expect(structureKey(dynamic)).not.toBe(structureKey(base));
});

it("keeps roof open/closed state outside the authoritative simulation", () => {
  const sim = new Simulation(fixture);
  const placed = sim.command({
    type: "placeFactory",
    x: 24,
    y: 22,
    width: 10,
    height: 10,
  });
  expect(placed.ok).toBe(true);
  const before = sim.serialize();

  const opened = toggleFactoryOpen(
    { ...DEFAULT_MODE, selected: placed.id! },
    placed.id!,
  );
  expect(opened.openFactories).toEqual([placed.id]);
  expect(sim.serialize()).toEqual(before);

  const closed = toggleFactoryOpen(opened, placed.id!);
  expect(closed.openFactories).toEqual([]);
  expect(sim.serialize()).toEqual(before);
});

it("invalidates belt topology when loading different positions with reused IDs", () => {
  const first = new Simulation(fixture),
    second = new Simulation(fixture);
  expect(
    first.command({
      type: "placeBelts",
      points: [{ x: 20, y: 20 }],
      direction: 0,
    }).ok,
  ).toBe(true);
  expect(
    second.command({
      type: "placeBelts",
      points: [{ x: 22, y: 20 }],
      direction: 0,
    }).ok,
  ).toBe(true);
  expect(first.snapshot().belts[0].id).toBe(second.snapshot().belts[0].id);
  expect(structureKey(first.snapshot())).not.toBe(
    structureKey(second.snapshot()),
  );
});

it("builds directed pipe turns and respects the rotation of a single pipe", () => {
  const s = new Simulation(fixture).snapshot();
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "pipe", direction: 3 },
      s,
      { x: 10, y: 10 },
      null,
    ),
  ).toEqual({
    type: "placePipes",
    containmentProfileId: "standard",
    points: [{ x: 10, y: 10, inlet: 1, outlet: 3 }],
  });
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "pipe" },
      s,
      { x: 12, y: 11 },
      { x: 10, y: 10 },
    ),
  ).toEqual({
    type: "placePipes",
    containmentProfileId: "standard",
    points: [
      { x: 10, y: 10, inlet: 2, outlet: 0 },
      { x: 11, y: 10, inlet: 2, outlet: 0 },
      { x: 12, y: 10, inlet: 2, outlet: 1 },
      { x: 12, y: 11, inlet: 3, outlet: 1 },
    ],
  });
});
it("builds and selects a distinct pressure path with stable geometry invalidation", () => {
  const sim = new Simulation(fixture),
    before = sim.snapshot();
  const command = buildCommand(
    { ...DEFAULT_MODE, tool: "pressure-line", direction: 3 },
    before,
    { x: 10, y: 10 },
    null,
  );
  expect(command).toEqual({
    type: "placePressureLines",
    points: [{ x: 10, y: 10, inlet: 1, outlet: 3 }],
  });
  expect(sim.command(command!).ok).toBe(true);
  expect(structureKey(sim.snapshot())).not.toBe(structureKey(before));
  expect(hitTest(sim.snapshot(), { x: 10, y: 10 }, [])).toBe(
    sim.snapshot().pressureLines[0].id,
  );
});

it("passes the selected profile across a liquid drag and rotation", () => {
  const s = new Simulation(fixture).snapshot();
  for (const tool of ["pipe", "tank", "pump"] as const) {
    const mode = {
      ...DEFAULT_MODE,
      tool,
      containmentProfileId: "lined",
      direction: 1,
    };
    expect(
      buildCommand(
        mode,
        s,
        { x: 12, y: 12 },
        tool === "pipe" ? { x: 10, y: 12 } : null,
      ),
    ).toMatchObject({ containmentProfileId: "lined" });
    expect(
      buildCommand({ ...mode, direction: 2 }, s, { x: 12, y: 12 }, null),
    ).toMatchObject({ containmentProfileId: "lined" });
  }
});


it("builds, selects, and fingerprints underground routes without treating cargo as topology", () => {
  const snapshot = new Simulation(fixture).snapshot();
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "underground-solid" },
      snapshot,
      { x: 14, y: 12 },
      { x: 10, y: 10 },
    ),
  ).toEqual({
    type: "placeUndergroundSolid",
    entry: { x: 10, y: 10 },
    exit: { x: 14, y: 10 },
  });
  expect(
    buildCommand(
      {
        ...DEFAULT_MODE,
        tool: "underground-liquid",
        containmentProfileId: "lined",
      },
      snapshot,
      { x: 12, y: 16 },
      { x: 10, y: 10 },
    ),
  ).toEqual({
    type: "placeUndergroundLiquid",
    entry: { x: 10, y: 10 },
    exit: { x: 10, y: 16 },
    containmentProfileId: "lined",
  });

  const sim = new Simulation(fixture);
  const placed = sim.command({
    type: "placeUndergroundSolid",
    entry: { x: 10, y: 10 },
    exit: { x: 15, y: 10 },
  });
  expect(placed.ok).toBe(true);
  expect(hitTest(sim.snapshot(), { x: 10, y: 10 }, [])).toBe(placed.id);
  expect(hitTest(sim.snapshot(), { x: 15, y: 10 }, [])).toBe(placed.id);

  const base = sim.snapshot();
  const key = structureKey(base);
  const cargoOnly = structuredClone(base);
  cargoOnly.undergroundSolids[0].cargo = {
    materialId: "plates",
    remainingSteps: 2,
  };
  expect(structureKey(cargoOnly)).toBe(key);

  const movedPortal = structuredClone(base);
  movedPortal.undergroundSolids[0].exit.x += 1;
  expect(structureKey(movedPortal)).not.toBe(key);
});


it("builds, selects, and fingerprints elevated gantries without treating cargo as topology", () => {
  expect(TOOL_HOTKEYS["elevated-solid"]).toBe("E");
  const snapshot = new Simulation(fixture).snapshot();
  expect(
    buildCommand(
      { ...DEFAULT_MODE, tool: "elevated-solid" },
      snapshot,
      { x: 14, y: 12 },
      { x: 10, y: 10 },
    ),
  ).toEqual({
    type: "placeElevatedSolid",
    entry: { x: 10, y: 10 },
    exit: { x: 14, y: 10 },
  });

  const sim = new Simulation(fixture);
  const placed = sim.command({
    type: "placeElevatedSolid",
    entry: { x: 10, y: 10 },
    exit: { x: 15, y: 10 },
  });
  expect(placed.ok).toBe(true);
  expect(hitTest(sim.snapshot(), { x: 10, y: 10 }, [])).toBe(placed.id);
  expect(hitTest(sim.snapshot(), { x: 15, y: 10 }, [])).toBe(placed.id);

  const base = sim.snapshot(),
    key = structureKey(base),
    cargoOnly = structuredClone(base);
  cargoOnly.elevatedSolids[0].cargo = {
    materialId: "plates",
    remainingSteps: 2,
  };
  expect(structureKey(cargoOnly)).toBe(key);

  const movedDeck = structuredClone(base);
  movedDeck.elevatedSolids[0].exit.x += 1;
  expect(structureKey(movedDeck)).not.toBe(key);
});
