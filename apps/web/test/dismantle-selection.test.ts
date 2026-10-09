import { expect, it } from "vitest";
import { fixture } from "@site/content";
import { Simulation, type PlayerSnapshot } from "@site/sim-core";
import * as interaction from "../game/interaction";

type SelectionApi = {
  classifyDismantleEntity: (snapshot: PlayerSnapshot, id: string) => unknown;
  selectDismantleCandidates: (
    snapshot: PlayerSnapshot,
    request: Record<string, unknown>,
  ) => {
    area: { x: number; y: number; width: number; height: number } | null;
    anchor: { exactType: string; family: string } | null;
    invalidAnchorReason: string | null;
    candidates: { id: string; exactType: string; family: string }[];
    ignored: { id: string; reason: string }[];
  };
};

const api = interaction as unknown as SelectionApi;

function freshSnapshot() {
  return structuredClone(new Simulation(fixture).snapshot());
}

function addBelt(
  snapshot: PlayerSnapshot,
  id: string,
  x: number,
  y: number,
) {
  snapshot.belts.push({
    id,
    x,
    y,
    direction: 0,
    cargo: null,
    alternate: null,
    switched: false,
  });
}

it("classifies junction belts as transport lines and keeps machine IDs dynamic", () => {
  const sim = new Simulation(fixture);
  const beltPlacement = sim.command({
    type: "placeBelts",
    points: [{ x: 50, y: 50 }],
    direction: 0,
  });
  expect(beltPlacement.ok, beltPlacement.message).toBe(true);
  const machinePlacement = sim.command({
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 26,
    direction: 0,
  });
  expect(machinePlacement.ok, machinePlacement.message).toBe(true);

  const snapshot = sim.snapshot();
  snapshot.belts[0] = {
    ...snapshot.belts[0],
    junction: { definitionId: "splitter", branch: 1, cursor: 0 },
  };
  snapshot.machines[0].definitionId = "runtime-pack-smelter-z9";

  expect(api.classifyDismantleEntity).toBeTypeOf("function");
  expect(api.classifyDismantleEntity(snapshot, snapshot.belts[0].id)).toMatchObject({
    kind: "player-built",
    entity: {
      id: snapshot.belts[0].id,
      exactType: "belt",
      family: "transport-lines",
    },
  });
  expect(api.classifyDismantleEntity(snapshot, snapshot.machines[0].id)).toMatchObject({
    kind: "player-built",
    entity: {
      id: snapshot.machines[0].id,
      exactType: "machine:runtime-pack-smelter-z9",
      family: "production-machines",
    },
  });
});

it("uses placed-entity taxonomy and protects static or ambiguous IDs", () => {
  const snapshot = freshSnapshot();
  addBelt(snapshot, "belt", 1, 1);
  snapshot.pipes.push({
    id: "pipe",
    x: 2,
    y: 1,
    inlet: 0,
    outlet: 2,
    materialId: null,
    quantity: 0,
    containmentProfileId: "standard",
  });
  snapshot.pressureLines.push({
    id: "pressure-line",
    x: 3,
    y: 1,
    inlet: 0,
    outlet: 2,
    materialId: null,
    quantity: 0,
  });
  snapshot.undergroundSolids.push({
    id: "underground-solid",
    entry: { x: 4, y: 1 },
    exit: { x: 6, y: 1 },
    direction: 0,
    cargo: null,
  });
  snapshot.undergroundLiquids.push({
    id: "underground-liquid",
    entry: { x: 4, y: 2 },
    exit: { x: 6, y: 2 },
    direction: 0,
    containmentProfileId: "standard",
    materialId: null,
    quantity: 0,
    remainingSteps: 0,
  });
  snapshot.elevatedSolids.push({
    id: "elevated-solid",
    entry: { x: 4, y: 3 },
    exit: { x: 6, y: 3 },
    direction: 0,
    cargo: null,
  });
  snapshot.storages.push({
    id: "storage",
    definitionId: "depot",
    x: 7,
    y: 1,
    direction: 0,
    inventory: {},
    nameKey: "storage.depot.name",
    width: 2,
    height: 2,
    capacity: 10,
  });
  snapshot.tanks.push({
    id: "tank",
    x: 9,
    y: 1,
    direction: 0,
    materialId: null,
    quantity: 0,
    containmentProfileId: "standard",
    width: 2,
    height: 2,
    capacity: 10,
  });
  snapshot.pressureVessels.push({
    id: "pressure-vessel",
    x: 11,
    y: 1,
    direction: 0,
    materialId: null,
    quantity: 0,
    width: 2,
    height: 2,
    capacity: 10,
  });
  snapshot.pumps.push({
    id: "pump",
    x: 13,
    y: 1,
    direction: 0,
    enabled: true,
    containmentProfileId: "standard",
    incident: null,
    canRepair: false,
    recoveryDiagnostic: null,
    status: "ready",
  });
  snapshot.compressors.push({
    id: "compressor",
    x: 14,
    y: 1,
    direction: 0,
    enabled: true,
    status: "ready",
  });
  snapshot.atmosphericSources.push({
    id: "atmospheric-plume-a",
    nameKey: "source.atmospheric-plume-a.name",
    x: 68,
    y: 24,
    width: 5,
    height: 5,
    units: 600,
    material: "gas-0",
    remaining: 600,
  });
  // A duplicate ID must become ambiguous even if one collection is a real
  // placed entity; it must never redirect selection to either row.
  addBelt(snapshot, "duplicate", 1, 2);
  snapshot.pipes.push({
    id: "duplicate",
    x: 2,
    y: 2,
    inlet: 0,
    outlet: 2,
    materialId: null,
    quantity: 0,
    containmentProfileId: "standard",
  });

  const classifications = [
    ["belt", "belt", "transport-lines"],
    ["pipe", "pipe", "transport-lines"],
    ["pressure-line", "pressure-line", "transport-lines"],
    ["underground-solid", "underground-solid", "transport-routes"],
    ["underground-liquid", "underground-liquid", "transport-routes"],
    ["elevated-solid", "elevated-solid", "transport-routes"],
    ["storage", "storage:depot", "storage-containment"],
    ["tank", "tank", "storage-containment"],
    ["pressure-vessel", "pressure-vessel", "storage-containment"],
    ["pump", "pump", "transfer-devices"],
    ["compressor", "compressor", "transfer-devices"],
  ] as const;
  for (const [id, exactType, family] of classifications)
    expect(api.classifyDismantleEntity(snapshot, id)).toMatchObject({
      kind: "player-built",
      entity: { id, exactType, family },
    });
  expect(api.classifyDismantleEntity(snapshot, "terminal")).toMatchObject({
    kind: "protected",
    id: "terminal",
    reason: "terminal",
  });
  expect(api.classifyDismantleEntity(snapshot, "ferrite-field")).toMatchObject({
    kind: "protected",
    id: "ferrite-field",
    reason: "deposit",
  });
  expect(
    api.classifyDismantleEntity(snapshot, "atmospheric-plume-a"),
  ).toMatchObject({ kind: "protected", reason: "atmospheric-source" });
  expect(api.classifyDismantleEntity(snapshot, "duplicate")).toMatchObject({
    kind: "unknown",
    reason: "ambiguous-id",
  });
  expect(
    api.selectDismantleCandidates(snapshot, {
      mode: "area-all",
      from: { x: 2, y: 2 },
      to: { x: 2, y: 2 },
    }).ignored,
  ).toContainEqual({ id: "duplicate", reason: "ambiguous-id" });
  expect(api.classifyDismantleEntity(snapshot, "stale-id")).toMatchObject({
    kind: "unknown",
    reason: "unknown-id",
  });
});

it("normalizes inclusive cell bounds and requires full footprints or both route ends", () => {
  const snapshot = freshSnapshot();
  addBelt(snapshot, "belt-a", 2, 2);
  snapshot.pipes.push({
    id: "pipe-a",
    x: 2,
    y: 2,
    inlet: 0,
    outlet: 2,
    materialId: null,
    quantity: 0,
    containmentProfileId: "standard",
  });
  const sim = new Simulation(fixture);
  const machinePlacement = sim.command({
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 26,
    direction: 0,
  });
  expect(machinePlacement.ok, machinePlacement.message).toBe(true);
  const machine = structuredClone(sim.snapshot().machines[0]);
  machine.id = "full-machine";
  machine.x = 4;
  machine.y = 2;
  machine.width = 2;
  machine.height = 2;
  snapshot.machines.push(machine);
  const partialMachine = structuredClone(machine);
  partialMachine.id = "partial-machine";
  partialMachine.x = 5;
  partialMachine.y = 3;
  snapshot.machines.push(partialMachine);
  snapshot.undergroundSolids.push({
    id: "route-inside",
    entry: { x: 1, y: 2 },
    exit: { x: 5, y: 3 },
    direction: 0,
    cargo: null,
  });
  snapshot.undergroundSolids.push({
    id: "route-partial",
    entry: { x: 1, y: 2 },
    exit: { x: 6, y: 3 },
    direction: 0,
    cargo: null,
  });
  const before = structuredClone(snapshot);

  const result = api.selectDismantleCandidates(snapshot, {
    mode: "area-all",
    from: { x: 5, y: 3 },
    to: { x: -1, y: 2 },
    openFactoryIds: [],
  });

  expect(result.area).toEqual({ x: 0, y: 2, width: 6, height: 2 });
  expect(result.candidates.map(({ id }) => id)).toEqual([
    "belt-a",
    "full-machine",
    "pipe-a",
    "route-inside",
  ]);
  expect(result.ignored).toContainEqual({
    id: "partial-machine",
    reason: "partial-footprint",
  });
  expect(result.ignored).toContainEqual({
    id: "route-partial",
    reason: "partial-route",
  });
  expect(snapshot).toEqual(before);
});

it("keeps closed-factory contents hidden until the factory is open", () => {
  const sim = new Simulation(fixture);
  const placement = sim.command({
    type: "placeFactory",
    x: 24,
    y: 22,
    width: 8,
    height: 8,
  });
  expect(placement.ok, placement.message).toBe(true);
  const snapshot = sim.snapshot();
  const factory = snapshot.factories[0];
  const machineSim = new Simulation(fixture);
  const machinePlacement = machineSim.command({
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 26,
    direction: 0,
  });
  expect(machinePlacement.ok, machinePlacement.message).toBe(true);
  const child = structuredClone(machineSim.snapshot().machines[0]);
  child.id = "factory-child";
  child.x = factory.x + 2;
  child.y = factory.y + 2;
  child.factoryId = factory.id;
  snapshot.machines.push(child);
  addBelt(snapshot, "interior-belt", factory.x + 3, factory.y + 3);
  factory.ports.push({
    id: "factory-port",
    x: factory.x,
    y: factory.y + 3,
    direction: 0,
    role: "input",
  });
  expect(api.classifyDismantleEntity(snapshot, factory.id)).toMatchObject({
    kind: "player-built",
    entity: { exactType: "factory", family: "factory-infrastructure" },
  });
  expect(api.classifyDismantleEntity(snapshot, "factory-port")).toMatchObject({
    kind: "player-built",
    entity: { exactType: "factory-port", family: "factory-infrastructure" },
  });
  const request = {
    mode: "area-all",
    from: { x: factory.x, y: factory.y },
    to: { x: factory.x + factory.width - 1, y: factory.y + factory.height - 1 },
  };

  const closed = api.selectDismantleCandidates(snapshot, {
    ...request,
    openFactoryIds: [],
  });
  expect(closed.candidates.map(({ id }) => id)).toEqual([factory.id]);
  expect(closed.ignored).toEqual(
    ["factory-child", "factory-port", "interior-belt"]
      .sort()
      .map((id) => ({ id, reason: "hidden-in-closed-factory" })),
  );
  expect(
    api.selectDismantleCandidates(snapshot, {
      mode: "single",
      anchorId: factory.id,
      openFactoryIds: [],
    }).candidates.map(({ id }) => id),
  ).toEqual([factory.id]);
  expect(
    api.selectDismantleCandidates(snapshot, {
      mode: "single",
      anchorId: child.id,
      openFactoryIds: [],
    }),
  ).toMatchObject({
    invalidAnchorReason: "hidden-in-closed-factory",
    candidates: [],
  });

  const open = api.selectDismantleCandidates(snapshot, {
    ...request,
    openFactoryIds: [factory.id],
  });
  expect(open.candidates.map(({ id }) => id)).toEqual(
    [factory.id, "factory-child", "factory-port", "interior-belt"].sort(),
  );
});

it("freezes exact and family filters at the anchor and never falls back", () => {
  const snapshot = freshSnapshot();
  addBelt(snapshot, "belt-a", 10, 10);
  addBelt(snapshot, "belt-b", 11, 10);
  snapshot.pipes.push({
    id: "pipe-a",
    x: 12,
    y: 10,
    inlet: 0,
    outlet: 2,
    materialId: null,
    quantity: 0,
    containmentProfileId: "standard",
  });
  const region = { from: { x: 10, y: 10 }, to: { x: 12, y: 10 } };
  const exact = api.selectDismantleCandidates(snapshot, {
    mode: "area-exact",
    ...region,
    anchorId: "belt-a",
    openFactoryIds: [],
  });
  expect(exact.anchor).toMatchObject({ exactType: "belt", family: "transport-lines" });
  expect(exact.candidates.map(({ id }) => id)).toEqual(["belt-a", "belt-b"]);
  expect(exact.ignored).toContainEqual({ id: "pipe-a", reason: "filtered" });

  const family = api.selectDismantleCandidates(snapshot, {
    mode: "area-family",
    ...region,
    anchorId: "belt-a",
    openFactoryIds: [],
  });
  expect(family.candidates.map(({ id }) => id)).toEqual(["belt-a", "belt-b", "pipe-a"]);
  expect(
    api.selectDismantleCandidates(snapshot, {
      mode: "single",
      anchorId: "belt-a",
    }).candidates.map(({ id }) => id),
  ).toEqual(["belt-a"]);

  for (const anchorId of ["terminal", "stale-id"]) {
    const invalid = api.selectDismantleCandidates(snapshot, {
      mode: "area-exact",
      ...region,
      anchorId,
      openFactoryIds: [],
    });
    expect(invalid.invalidAnchorReason).not.toBeNull();
    expect(invalid.candidates).toEqual([]);
  }
});
