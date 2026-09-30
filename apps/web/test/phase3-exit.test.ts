import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  experimentEvidenceKey,
  initializeKnownMarkets,
  parseFactoryBlueprint,
  serializeFactoryBlueprint,
  type FactoryThroughputView,
  type GameCommand,
} from "@site/sim-core";
import { factoryContractPresentation } from "../game/factory-presentation";
import { DEFAULT_MODE, toggleFactoryOpen } from "../game/interaction";

const CERTIFICATION_LIMIT_TICKS = 2000;

function withGranuleHandling() {
  const sim = new Simulation(fixture),
    save = sim.serialize(),
    reaction = fixture.reactions.find((entry) => entry.id === "heat-raw-sealed")!;
  save.knowledge.push(reaction.id);
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
  initializeKnownMarkets(fixture, save);
  const loaded = sim.load(save);
  expect(loaded.ok, loaded.message).toBe(true);
  expect(
    sim.snapshot().milestones.find((entry) => entry.id === "sealed-study-certified")
      ?.completed,
  ).toBe(true);
  expect(
    sim.snapshot().exchange.find((entry) => entry.materialId === "granules")
      ?.handling?.unlocked,
  ).toBe(true);
  return sim;
}

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

function horizontalPath(
  startX: number,
  y: number,
  endX: number,
  direction = 0,
) {
  const points = [{ x: startX, y }];
  let x = startX;
  while (x !== endX) {
    x += Math.sign(endX - x);
    points.push({ x, y });
  }
  return { type: "placeBelts" as const, points, direction };
}

function terminalOutputPath() {
  const points = [];
  for (let x = 29; x <= 37; x++) points.push({ x, y: 36 });
  for (let y = 35; y >= 26; y--) points.push({ x: 37, y });
  return {
    type: "placeBelts" as const,
    points,
    direction: 0,
  };
}

function makePhase3World() {
  const sim = withGranuleHandling();
  const factoryId = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 33,
    width: 10,
    height: 10,
  });

  build(sim, {
    type: "placePort",
    factoryId,
    x: 24,
    y: 36,
    direction: 0,
  });
  build(sim, {
    type: "placePort",
    factoryId,
    x: 33,
    y: 36,
    direction: 0,
  });
  build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 17,
    y: 35,
    direction: 0,
  });
  build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 35,
    direction: 0,
  });
  build(sim, horizontalPath(19, 36, 26));
  build(sim, terminalOutputPath());

  return { sim, factoryId };
}

function throughput(sim: Simulation, factoryId: string) {
  return sim
    .snapshot()
    .factories.find((factory) => factory.id === factoryId)!.contract.throughput;
}

function certify(sim: Simulation, factoryId: string) {
  for (let i = 0; i < CERTIFICATION_LIMIT_TICKS; i++) {
    sim.step(fixture.tickMs);
    const view = throughput(sim, factoryId);
    if (view.state === "stable") return view;
  }
  throw new Error("Phase 3 representative factory did not certify");
}

function stable(view: FactoryThroughputView) {
  expect(view.state).toBe("stable");
  if (view.state !== "stable") throw new Error("Expected a stable contract");
  expect(view.cycleTicks).toBeGreaterThan(0);
  expect(view.inputs).toEqual([
    expect.objectContaining({
      materialId: "raw",
      units: expect.any(Number),
      unitsPerMinute: expect.any(Number),
    }),
  ]);
  expect(view.outputs).toEqual([
    expect.objectContaining({
      materialId: "granules",
      units: expect.any(Number),
      unitsPerMinute: expect.any(Number),
    }),
  ]);
  return view;
}

function materialName(id: string) {
  if (id === "raw") return "Veined ore";
  if (id === "granules") return "Conductive granules";
  return id;
}

function auditOk(sim: Simulation) {
  const report = auditLedger(fixture, sim.serialize());
  expect(report.mismatches).toEqual([]);
  expect(report.ok).toBe(true);
}

describe("Phase 3 factory-as-function exit gate", () => {
  it("keeps one solved factory readable, serializable, diagnosable and authoritative across roof and save/load", () => {
    const { sim, factoryId } = makePhase3World();

    const certified = stable(certify(sim, factoryId));
    const factory = sim
      .snapshot()
      .factories.find((candidate) => candidate.id === factoryId)!;

    expect(factory.contract.machineCount).toBe(1);
    expect(factory.ports.map((port) => port.role)).toEqual(["input", "output"]);
    expect(factory.contract.throughput).toEqual(certified);

    const presented = factoryContractPresentation(factory, materialName);
    expect(presented.certified).toBe(true);
    expect(presented.inputs).toEqual([
      {
        materialId: "raw",
        name: "Veined ore",
        unitsPerMinute: certified.inputs[0].unitsPerMinute,
      },
    ]);
    expect(presented.outputs).toEqual([
      {
        materialId: "granules",
        name: "Conductive granules",
        unitsPerMinute: certified.outputs[0].unitsPerMinute,
      },
    ]);
    expect(presented.worldText).toBe(
      "CERTIFIED CONTRACT\n" +
        "IN  Veined ore " +
        certified.inputs[0].unitsPerMinute +
        "/min\n" +
        "OUT Conductive granules " +
        certified.outputs[0].unitsPerMinute +
        "/min",
    );

    const blueprintBefore = serializeFactoryBlueprint(
      fixture,
      sim.serialize(),
      factoryId,
    );
    expect(
      JSON.stringify(parseFactoryBlueprint(fixture, blueprintBefore)),
    ).toBe(blueprintBefore);
    expect(blueprintBefore).not.toContain(factoryId);
    expect(blueprintBefore).not.toContain('"cargo"');
    expect(blueprintBefore).not.toContain('"job"');
    expect(blueprintBefore).not.toContain('"fuel"');

    auditOk(sim);

    const beforeRoof = sim.serialize();
    const opened = toggleFactoryOpen(
      { ...DEFAULT_MODE, selected: factoryId },
      factoryId,
    );
    expect(opened.openFactories).toEqual([factoryId]);
    expect(sim.serialize()).toEqual(beforeRoof);

    const closed = toggleFactoryOpen(opened, factoryId);
    expect(closed.openFactories).toEqual([]);
    expect(sim.serialize()).toEqual(beforeRoof);

    const saved = sim.serialize();
    const serializedSave = JSON.stringify(saved);
    expect(serializedSave).not.toContain('"throughput"');
    expect(serializedSave).not.toContain('"contract"');
    expect(serializedSave).not.toContain('"openFactories"');

    const restored = new Simulation(fixture);
    const twin = new Simulation(fixture);
    expect(restored.load(structuredClone(saved)).ok).toBe(true);
    expect(twin.load(structuredClone(saved)).ok).toBe(true);
    expect(restored.serialize()).toEqual(saved);
    expect(twin.serialize()).toEqual(saved);

    const measuringFactory = restored
      .snapshot()
      .factories.find((candidate) => candidate.id === factoryId)!;
    expect(measuringFactory.contract.throughput).toEqual({
      state: "measuring",
      cycleTicks: null,
      inputs: [],
      outputs: [],
    });
    expect(
      factoryContractPresentation(measuringFactory, materialName),
    ).toMatchObject({
      certified: false,
      status: "Contract not certified",
      inputs: [],
      outputs: [],
    });

    expect(
      serializeFactoryBlueprint(fixture, restored.serialize(), factoryId),
    ).toBe(blueprintBefore);

    const recertified = stable(certify(restored, factoryId));
    const twinRecertified = stable(certify(twin, factoryId));
    expect(recertified).toEqual(certified);
    expect(twinRecertified).toEqual(certified);
    expect(twin.serialize()).toEqual(restored.serialize());

    const restoredFactory = restored
      .snapshot()
      .factories.find((candidate) => candidate.id === factoryId)!;
    expect(
      factoryContractPresentation(restoredFactory, materialName).worldText,
    ).toBe(presented.worldText);
    expect(
      serializeFactoryBlueprint(fixture, restored.serialize(), factoryId),
    ).toBe(blueprintBefore);

    auditOk(restored);
    auditOk(twin);
  });
});
