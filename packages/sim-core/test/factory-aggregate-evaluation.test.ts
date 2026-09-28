import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  type FactoryThroughputView,
  type GameCommand,
  type Save,
} from "../src/index";

const CERTIFICATION_LIMIT_TICKS = 2000;
const EQUIVALENCE_INTERVAL_MS = 2 * 60 * 1000;
const BENCHMARK_INTERVAL_MS = 5 * 60 * 1000;
const BENCHMARK_SAMPLES = 3;
const FACTORY_EQUIVALENT_LOADS = [1, 8, 32] as const;

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

function representativeOutputPath() {
  const points = [];
  for (let x = 29; x <= 37; x++) points.push({ x, y: 36 });
  for (let y = 35; y >= 26; y--) points.push({ x: 37, y });
  return {
    type: "placeBelts" as const,
    points,
    // The final belt at (37,26) enters the terminal footprint at (38,26).
    direction: 0,
  };
}

function makeRepresentativeFactory() {
  const sim = new Simulation(fixture);
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
  build(sim, representativeOutputPath());
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
  throw new Error("Representative factory did not certify");
}

function load(seed: Save) {
  const sim = new Simulation(fixture);
  const result = sim.load(structuredClone(seed));
  expect(result.ok, result.message).toBe(true);
  return sim;
}

function stepTicks(sim: Simulation, durationMs: number) {
  const ticks = Math.floor(durationMs / fixture.tickMs);
  for (let i = 0; i < ticks; i++) sim.step(fixture.tickMs);
}

function auditOk(sim: Simulation) {
  const report = auditLedger(fixture, sim.serialize());
  expect(report.mismatches).toEqual([]);
  expect(report.ok).toBe(true);
}

function stableContract(view: FactoryThroughputView) {
  expect(view.state).toBe("stable");
  if (view.state !== "stable") throw new Error("Expected a stable contract");
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

function median(values: number[]) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.floor(ordered.length / 2)];
}

describe("Phase 3 factory abstraction evaluation", () => {
  it("keeps the representative detailed factory deterministic, conservative and save/load stable", () => {
    const { sim, factoryId } = makeRepresentativeFactory();
    const certifiedBeforeSave = stableContract(certify(sim, factoryId));
    auditOk(sim);

    const seed = sim.serialize();
    const first = load(seed);
    const second = load(seed);

    expect(throughput(first, factoryId)).toEqual({
      state: "measuring",
      cycleTicks: null,
      inputs: [],
      outputs: [],
    });
    expect(throughput(second, factoryId)).toEqual({
      state: "measuring",
      cycleTicks: null,
      inputs: [],
      outputs: [],
    });

    stepTicks(first, EQUIVALENCE_INTERVAL_MS);
    stepTicks(second, EQUIVALENCE_INTERVAL_MS);

    expect(second.serialize()).toEqual(first.serialize());
    auditOk(first);
    auditOk(second);

    expect(stableContract(throughput(first, factoryId))).toEqual(
      certifiedBeforeSave,
    );
    expect(stableContract(throughput(second, factoryId))).toEqual(
      certifiedBeforeSave,
    );
  });

  it("reports a reproducible detailed baseline at several factory-equivalent loads", () => {
    const { sim, factoryId } = makeRepresentativeFactory();
    stableContract(certify(sim, factoryId));
    const seed = sim.serialize();

    const loads = FACTORY_EQUIVALENT_LOADS.map((copies) => {
      const samples: number[] = [];
      for (let sample = 0; sample < BENCHMARK_SAMPLES; sample++) {
        const simulations = Array.from({ length: copies }, () => load(seed));
        const start = performance.now();
        const ticks = Math.floor(BENCHMARK_INTERVAL_MS / fixture.tickMs);
        for (let tick = 0; tick < ticks; tick++)
          for (const candidate of simulations) candidate.step(fixture.tickMs);
        samples.push(performance.now() - start);

        const reference = simulations[0].serialize();
        for (const candidate of simulations) {
          expect(candidate.serialize()).toEqual(reference);
          auditOk(candidate);
        }
      }

      const medianWallMs = median(samples);
      const aggregateSimulatedMs = BENCHMARK_INTERVAL_MS * copies;
      return {
        copies,
        samplesMs: samples.map((value) => Number(value.toFixed(3))),
        medianWallMs: Number(medianWallMs.toFixed(3)),
        aggregateSimulatedMs,
        aggregateSimulatedToWallRatio: Number(
          (aggregateSimulatedMs / medianWallMs).toFixed(2),
        ),
      };
    });

    const report = {
      schema: 1,
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      tickMs: fixture.tickMs,
      simulatedMsPerCopy: BENCHMARK_INTERVAL_MS,
      samplesPerLoad: BENCHMARK_SAMPLES,
      loads,
    };

    console.info("FACTORY_ABSTRACTION_EVALUATION " + JSON.stringify(report));
  });
});
