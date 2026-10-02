import { performance } from "node:perf_hooks";
import { cpus, totalmem } from "node:os";
import { expect, it } from "vitest";
import { fixture, validateContent, type Content } from "@site/content";
import {
  Simulation,
  auditLedger,
  type GameCommand,
  type Save,
} from "../src/index";

const SCALES = [1, 8, 32] as const;
const WARMUP_TICKS = 300;
const SAMPLE_TICKS = 300;
const SAMPLES = 3;
function command(sim: Simulation, cmd: GameCommand) {
  const result = sim.command(cmd);
  if (!result.ok) throw new Error(result.message);
  return result.id!;
}
function scenario(cells: number, blocked: boolean) {
  const deposits = Array.from({ length: cells }, (_, i) => {
    const y = 4 + i * 16;
    return [
      {
        id: "ferrite-" + i,
        material: "ferrite",
        x: 2,
        y: y + 4,
        width: 2,
        height: 2,
        units: 1000000,
      },
      {
        id: "raw-" + i,
        material: "raw",
        x: 19,
        y,
        width: 2,
        height: 2,
        units: 1000000,
      },
    ];
  }).flat();
  const content = validateContent({
    ...fixture,
    version: "benchmark-single-world-v1",
    economy: { ...fixture.economy, startFuel: 1000000 },
    storages: fixture.storages.map((s) => ({
      ...s,
      capacity: blocked ? s.capacity : 1000000,
    })),
    site: {
      ...fixture.site,
      width: 80,
      height: cells * 16 + 20,
      startStock: 1000000,
      terminal: { x: 65, y: 0, width: 4, height: 4 },
      deposits,
    },
  });
  const sim = new Simulation(content);
  function path(
    x: number,
    y: number,
    endX: number,
    endY: number,
    direction: number,
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
    command(sim, { type: "placeBelts", points, direction });
  }
  for (let i = 0; i < cells; i++) {
    const y = 4 + i * 16;
    const factoryId = command(sim, {
      type: "placeFactory",
      x: 8,
      y,
      width: 10,
      height: 10,
    });
    for (const x of [8, 17])
      command(sim, { type: "placePort", factoryId, x, y: y + 5, direction: 0 });
    command(sim, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 2,
      y: y + 4,
      direction: 0,
    });
    command(sim, {
      type: "placeMachine",
      definitionId: "crusher",
      x: 11,
      y: y + 4,
      direction: 0,
    });
    command(sim, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 19,
      y,
      direction: 1,
    });
    path(4, y + 5, 10, y + 5, 0);
    path(13, y + 5, 23, y + 5, 0);
    path(14, y + 6, 16, y + 6, 3);
    path(20, y + 2, 20, y + 4, 1);
    path(20, y + 6, 20, y + 8, 1);
    for (const [x, definitionId] of [
      [14, "splitter"],
      [16, "merger"],
      [20, "crossing"],
    ] as const)
      command(sim, {
        type: "configureJunction",
        beltId: sim.snapshot().belts.find((b) => b.x === x && b.y === y + 5)!
          .id,
        definitionId,
        direction: 0,
        branch: 1,
      });
    command(sim, {
      type: "placeStorage",
      definitionId: "depot",
      x: 24,
      y: y + 4,
      direction: 0,
    });
    command(sim, {
      type: "placeStorage",
      definitionId: "depot",
      x: 19,
      y: y + 9,
      direction: 1,
    });
  }
  for (let i = 0; i < WARMUP_TICKS; i++) sim.step(content.tickMs);
  return { content, seed: sim.serialize(), sim };
}
function load(content: Content, seed: Save) {
  const sim = new Simulation(content);
  const result = sim.load(structuredClone(seed));
  expect(result.ok, result.message).toBe(true);
  return sim;
}
function audit(content: Content, sim: Simulation) {
  expect(auditLedger(content, sim.serialize()).mismatches).toEqual([]);
}
it.each(
  SCALES.flatMap((cells) =>
    [false, true].map((blocked) => [cells, blocked] as const),
  ),
)(
  "validates %i cells (blocked=%s), destinations, ledgers and uninterrupted/restore equality",
  (cells, blocked) => {
    const { content, seed, sim: first } = scenario(cells, blocked);
    const second = load(content, seed);
    expect(second.serialize()).toEqual(seed);
    expect(Object.keys(seed.factories)).toHaveLength(cells);
    expect(seed.flows.produced.plates).toBeGreaterThan(0);
    audit(content, first);
    for (let i = 0; i < 30; i++) {
      first.step(content.tickMs);
      second.step(content.tickMs);
      expect(second.serialize()).toEqual(first.serialize());
      audit(content, first);
    }
    const state = first.serialize();
    expect(state.flows.discarded).toEqual({});
    for (const storage of Object.values(state.storages)) {
      const expected = storage.direction === 0 ? "plates" : "raw";
      expect(Object.keys(storage.inventory)).toEqual([expected]);
      expect(storage.inventory[expected]).toBeGreaterThan(0);
    }
    const views = first.snapshot().factories;
    if (blocked)
      expect(views.every((f) => f.contract.throughput.state !== "stable")).toBe(
        true,
      );
  },
  60000,
);
function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) =>
    Number(sorted[Math.ceil(sorted.length * p) - 1].toFixed(6));
  return { medianMs: at(0.5), p95Ms: at(0.95), observations: sorted.length };
}
it.skipIf(process.env.SINGLE_WORLD_BENCHMARK !== "1")(
  "reports step and snapshot latency separately without timing assertions",
  () => {
    const rows = [];
    for (const cells of SCALES)
      for (const blocked of [false, true]) {
        const { content, seed } = scenario(cells, blocked);
        const steps: number[] = [],
          snapshots: number[] = [];
        let counts;
        for (let sample = 0; sample < SAMPLES; sample++) {
          const sim = load(content, seed);
          // Restore resets transient throughput monitors; rewarm outside timing.
          for (let i = 0; i < WARMUP_TICKS; i++) sim.step(content.tickMs);
          for (let i = 0; i < SAMPLE_TICKS; i++) {
            let started = performance.now();
            sim.step(content.tickMs);
            steps.push(performance.now() - started);
            started = performance.now();
            const view = sim.snapshot();
            snapshots.push(performance.now() - started);
            if (i === SAMPLE_TICKS - 1)
              counts = {
                factories: view.factories.length,
                machines: view.machines.length,
                belts: view.belts.length,
                junctions: view.belts.filter((b) => b.junction).length,
                storages: view.storages.length,
                occupiedBelts: view.belts.filter((b) => b.cargo).length,
              };
          }
          audit(content, sim);
        }
        rows.push({
          cells,
          case: blocked ? "backpressured" : "flowing",
          counts,
          step: stats(steps),
          snapshot: stats(snapshots),
        });
      }
    console.log(
      "SINGLE_WORLD_BASELINE " +
        JSON.stringify({
          schema: 1,
          node: process.version,
          platform: process.platform,
          arch: process.arch,
          cpu: cpus()[0]?.model,
          logicalCpus: cpus().length,
          totalMemoryBytes: totalmem(),
          tickMs: fixture.tickMs,
          warmupTicks: WARMUP_TICKS,
          sampleTicks: SAMPLE_TICKS,
          samples: SAMPLES,
          rows,
        }),
    );
  },
  300000,
);
