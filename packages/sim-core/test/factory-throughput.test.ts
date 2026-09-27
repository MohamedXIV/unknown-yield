import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  type FactoryThroughputView,
  type GameCommand,
} from "../src/index";

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

function path(x: number, y: number, endX: number, direction = 0) {
  const points = [{ x, y }];
  while (x !== endX) {
    x += Math.sign(endX - x);
    points.push({ x, y });
  }
  return { type: "placeBelts" as const, points, direction };
}

function makeLine() {
  const sim = new Simulation(fixture);
  const factoryId = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 22,
    width: 10,
    height: 10,
  });
  build(sim, {
    type: "placePort",
    factoryId,
    x: 24,
    y: 27,
    direction: 0,
  });
  build(sim, {
    type: "placePort",
    factoryId,
    x: 33,
    y: 27,
    direction: 0,
  });
  build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 26,
    direction: 0,
  });
  const processorId = build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 26,
    direction: 0,
  });
  build(sim, path(20, 27, 26));
  build(sim, path(29, 27, 37));
  return { sim, factoryId, processorId };
}

function throughput(sim: Simulation, factoryId: string) {
  return sim
    .snapshot()
    .factories.find((factory) => factory.id === factoryId)!.contract.throughput;
}

function certify(sim: Simulation, factoryId: string) {
  for (let i = 0; i < 700; i++) {
    sim.step(100);
    const view = throughput(sim, factoryId);
    if (view.state === "stable") return view;
  }
  throw new Error("Factory did not reach stable throughput certification");
}

function stable(view: FactoryThroughputView) {
  expect(view.state).toBe("stable");
  expect(view.cycleTicks).toBeGreaterThan(0);
  expect(view.inputs).toEqual([
    expect.objectContaining({
      materialId: "ferrite",
      units: expect.any(Number),
      unitsPerMinute: expect.any(Number),
    }),
  ]);
  expect(view.outputs).toEqual([
    expect.objectContaining({
      materialId: "plates",
      units: expect.any(Number),
      unitsPerMinute: expect.any(Number),
    }),
  ]);
  expect(view.inputs[0].units).toBeGreaterThan(0);
  expect(view.outputs[0].units).toBeGreaterThan(0);
  expect(view.inputs[0].unitsPerMinute).toBeGreaterThan(0);
  expect(view.outputs[0].unitsPerMinute).toBeGreaterThan(0);
}

describe("stable factory throughput contract", () => {
  it("certifies the same actual boundary-flow cycle across deterministic runs and save/load remeasurement", () => {
    const first = makeLine(),
      second = makeLine();
    const a = certify(first.sim, first.factoryId),
      b = certify(second.sim, second.factoryId);

    stable(a);
    expect(b).toEqual(a);
    expect(a.outputs[0].units).toBe(a.inputs[0].units * 3);

    const report = auditLedger(fixture, first.sim.serialize());
    expect(report.ok).toBe(true);
    expect(report.mismatches).toEqual([]);

    const save = first.sim.serialize();
    expect(save.factories[first.factoryId]).not.toHaveProperty("throughput");

    const restored = new Simulation(fixture);
    expect(restored.load(JSON.parse(JSON.stringify(save))).ok).toBe(true);
    expect(throughput(restored, first.factoryId).state).toBe("measuring");

    const afterLoad = certify(restored, first.factoryId);
    expect(afterLoad).toEqual(a);
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
  });

  it("invalidates certification on edits and never certifies disabled or fuel-starved factories", () => {
    const { sim, factoryId, processorId } = makeLine();
    stable(certify(sim, factoryId));

    expect(
      sim.command({
        type: "setEnabled",
        machineId: processorId,
        enabled: false,
      }).ok,
    ).toBe(true);
    expect(throughput(sim, factoryId)).toEqual({
      state: "measuring",
      cycleTicks: null,
      inputs: [],
      outputs: [],
    });
    sim.step(5000);
    expect(throughput(sim, factoryId).state).toBe("measuring");

    expect(
      sim.command({
        type: "setEnabled",
        machineId: processorId,
        enabled: true,
      }).ok,
    ).toBe(true);

    const starved = sim.serialize();
    starved.fuel = 0;
    expect(sim.load(starved).ok).toBe(true);
    sim.step(10000);
    expect(
      sim
        .snapshot()
        .machines.find((machine) => machine.id === processorId)?.status,
    ).toBe("needs-fuel");
    expect(throughput(sim, factoryId).state).toBe("measuring");
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  });
});
