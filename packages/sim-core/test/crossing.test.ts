import { historicalFixture } from "./historical-content";
import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import { Simulation, auditLedger } from "../src/index";
import { transport } from "../src/production";

function make() {
  const sim = new Simulation(fixture);
  for (const [x, y, direction] of [
    [20, 20, 0],
    [19, 20, 0],
    [21, 20, 0],
    [20, 19, 1],
    [20, 21, 1],
  ])
    expect(
      sim.command({ type: "placeBelts", points: [{ x, y }], direction }).ok,
    ).toBe(true);
  const id = sim.snapshot().belts.find((b) => b.x === 20 && b.y === 20)!.id;
  expect(
    sim.command({
      type: "configureJunction",
      beltId: id,
      definitionId: "crossing",
      direction: 0,
      branch: 1,
    }).ok,
  ).toBe(true);
  return { sim, id, s: sim.serialize() };
}
function fill(s: ReturnType<Simulation["serialize"]>, cell: string) {
  s.stock.plates--;
  s.belts[cell].cargo = "plates";
}
describe("controlled crossing", () => {
  it("keeps two axes separate and reserves only one physical slot", () => {
    const { s } = make();
    fill(s, "19,20");
    fill(s, "20,19");
    transport(fixture, s);
    expect(s.belts["19,20"].cargo).toBe(null);
    expect(s.belts["20,19"].cargo).toBe("plates");
    expect(s.belts["20,20"].cargo).toBe("plates");
    transport(fixture, s);
    expect(s.belts["21,20"].cargo).toBe("plates");
    expect(s.belts["20,21"].cargo).toBe(null);
    expect(auditLedger(fixture, s).ok).toBe(true);
  });
  it("gives an empty axis its entire window and switches only on the next empty-start update", () => {
    const { s } = make();
    const n = fixture.junctions.find((d) => d.id === "crossing")!.windowSteps!;
    const signal = () => s.belts["20,20"].junction!.crossing!;
    expect(signal()).toEqual({
      axis: 0,
      remaining: n,
      pending: null,
      held: null,
    });
    for (let i = 0; i < n; i++) transport(fixture, s);
    expect(signal()).toEqual({ axis: 0, remaining: 0, pending: 1, held: null });
    transport(fixture, s);
    expect(signal()).toEqual({
      axis: 1,
      remaining: n - 1,
      pending: null,
      held: null,
    });
  });
  it("holds its original route through a blocked pending switch, then clears before the other axis opens", () => {
    const { sim, s } = make();
    fill(s, "19,20");
    fill(s, "20,19");
    fill(s, "21,20");
    const n = fixture.junctions.find((d) => d.id === "crossing")!.windowSteps!;
    for (let i = 0; i < n + 2; i++) transport(fixture, s);
    expect(s.belts["20,20"].junction!.crossing).toMatchObject({
      axis: 0,
      pending: 1,
      held: 0,
      remaining: 0,
    });
    expect(sim.load(s).ok).toBe(true);
    const restored = sim.serialize();
    for (const state of [s, restored]) {
      state.belts["21,20"].cargo = null;
      state.stock.plates++;
      transport(fixture, state);
      expect(state.belts["20,20"].junction!.crossing).toMatchObject({
        pending: 1,
        held: null,
      });
      transport(fixture, state);
      expect(state.belts["20,20"].junction!.crossing).toMatchObject({
        axis: 1,
        pending: null,
        held: 1,
      });
      expect(state.belts["21,20"].cargo).toBe("plates");
      expect(auditLedger(fixture, state).ok).toBe(true);
    }
    expect(restored).toEqual(s);
  });
});
it("rejects impossible phase/route states atomically", () => {
  const { sim, s } = make();
  const before = sim.serialize();
  for (const patch of [
    { remaining: 0 },
    { remaining: 999 },
    { remaining: -1 },
    { remaining: 1.5 },
    { pending: 0, remaining: 0 },
    { pending: 1, remaining: 2 },
    { held: 0 },
  ]) {
    const bad = structuredClone(s);
    Object.assign(bad.belts["20,20"].junction!.crossing!, patch);
    expect(sim.load(bad).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
  }
  const loaded = structuredClone(s);
  fill(loaded, "20,20");
  for (const held of [null, 1]) {
    loaded.belts["20,20"].junction!.crossing!.held = held as 1 | null;
    expect(sim.load(loaded).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
  }
  const legacy = structuredClone(s);
  legacy.schemaVersion = 12;
  expect(sim.load(legacy).ok).toBe(false);
  const missing = structuredClone(s);
  delete missing.belts["20,20"].junction!.crossing;
  expect(sim.load(missing).ok).toBe(false);
  const t = structuredClone(s);
  t.belts["20,20"].junction!.definitionId = "splitter";
  expect(sim.load(t).ok).toBe(false);
});
it("migrates schema 12 T fairness without inventing crossing state", () => {
  const sim = new Simulation(historicalFixture);
  sim.command({ type: "placeBelts", points: [{ x: 20, y: 20 }], direction: 0 });
  const id = sim.snapshot().belts[0].id;
  sim.command({
    type: "configureJunction",
    beltId: id,
    definitionId: "splitter",
    direction: 0,
    branch: -1,
  });
  const s = sim.serialize();
  s.schemaVersion = 12;
  s.belts["20,20"].junction!.cursor = 1;
  const expected = structuredClone(s);
  expected.schemaVersion = 23;
  expect(sim.load(s).ok).toBe(true);
  expect(sim.serialize()).toEqual(expected);
});
it("refuses loaded edits and preserves the signal across empty rotation", () => {
  const { sim, id, s } = make();
  fill(s, "20,20");
  s.belts["20,20"].junction!.crossing!.held = 0;
  expect(sim.load(s).ok).toBe(true);
  const before = sim.serialize();
  for (const definitionId of [null, "splitter", "crossing"]) {
    expect(
      sim.command({
        type: "configureJunction",
        beltId: id,
        definitionId,
        direction: 1,
        branch: -1,
      }).ok,
    ).toBe(false);
    expect(sim.serialize()).toEqual(before);
  }
  expect(sim.command({ type: "dismantle", id }).ok).toBe(false);
  const empty = make();
  transport(fixture, empty.s);
  expect(empty.sim.load(empty.s).ok).toBe(true);
  const signal = structuredClone(empty.s.belts["20,20"].junction!.crossing);
  expect(
    empty.sim.command({
      type: "configureJunction",
      beltId: empty.id,
      definitionId: "crossing",
      direction: 2,
      branch: -1,
    }).ok,
  ).toBe(true);
  expect(empty.sim.serialize().belts["20,20"].junction!.crossing).toEqual(
    signal,
  );
  const stock = empty.sim.snapshot().stock.plates;
  expect(
    empty.sim.command({
      type: "configureJunction",
      beltId: empty.id,
      definitionId: null,
      direction: 2,
      branch: 1,
    }).ok,
  ).toBe(true);
  expect(empty.sim.snapshot().stock.plates).toBe(
    stock + fixture.junctions.find((d) => d.id === "crossing")!.cost,
  );
  expect(auditLedger(fixture, empty.sim.serialize()).ok).toBe(true);
});
it("routes both materials through every rotation and branch without changing identity", () => {
  for (const direction of [0, 1, 2, 3])
    for (const branch of [-1, 1] as const) {
      const sim = new Simulation(fixture);
      for (const [x, y] of [
        [20, 20],
        [19, 20],
        [21, 20],
        [20, 19],
        [20, 21],
      ])
        sim.command({ type: "placeBelts", points: [{ x, y }], direction: 0 });
      const id = sim.snapshot().belts.find((b) => b.x === 20 && b.y === 20)!.id;
      sim.command({
        type: "configureJunction",
        beltId: id,
        definitionId: "crossing",
        direction,
        branch,
      });
      const s = sim.serialize(),
        center = s.belts["20,20"];
      const side = (direction + (branch === 1 ? 1 : 3)) % 4;
      const outlets =
        direction % 2 === 0 ? [direction, side] : [side, direction];
      const vectors = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ];
      const cell = (d: number) => {
        const [dx, dy] = vectors[d];
        return 20 + dx + "," + (20 + dy);
      };
      for (let axis = 0; axis < 2; axis++) {
        const input = (outlets[axis] + 2) % 4;
        s.belts[cell(input)].direction = outlets[axis];
        s.belts[cell(outlets[axis])].direction = outlets[axis];
        const material = axis === 0 ? "ferrite" : "raw";
        const deposit = fixture.site.deposits.find(
          (d) => d.material === material,
        )!;
        s.deposits[deposit.id]--;
        s.belts[cell(input)].cargo = material;
      }
      const n = fixture.junctions.find(
        (d) => d.id === "crossing",
      )!.windowSteps!;
      for (let i = 0; i < n + 2; i++) transport(fixture, s);
      expect(s.belts[cell(outlets[0])].cargo).toBe("ferrite");
      expect(s.belts[cell(outlets[1])].cargo).toBe("raw");
      expect(center.cargo).toBe(null);
      expect(auditLedger(fixture, s).ok).toBe(true);
    }
});
it("advances only on transport ticks; reads and zero steps keep scheduling still", () => {
  const { sim } = make();
  const before = sim.serialize();
  sim.snapshot();
  sim.serialize();
  sim.step(0);
  expect(sim.serialize()).toEqual(before);
  sim.step(fixture.tickMs * (fixture.site.transportEveryTicks - 1));
  expect(sim.serialize().belts["20,20"].junction!.crossing!.remaining).toBe(
    before.belts["20,20"].junction!.crossing!.remaining,
  );
  sim.step(fixture.tickMs);
  expect(sim.serialize().belts["20,20"].junction!.crossing!.remaining).toBe(
    before.belts["20,20"].junction!.crossing!.remaining - 1,
  );
});

it("starts a fresh authored window when changing the crossing definition", () => {
  const content = structuredClone(fixture);
  content.junctions.push({
    ...content.junctions.find((d) => d.kind === "crossing")!,
    id: "short-crossing",
    windowSteps: 2,
  });
  const sim = new Simulation(content);
  sim.command({ type: "placeBelts", points: [{ x: 20, y: 20 }], direction: 0 });
  const id = sim.snapshot().belts[0].id;
  sim.command({
    type: "configureJunction",
    beltId: id,
    definitionId: "crossing",
    direction: 0,
    branch: 1,
  });
  sim.step(content.tickMs * content.site.transportEveryTicks);
  expect(sim.serialize().belts["20,20"].junction!.crossing!.remaining).toBe(3);
  expect(
    sim.command({
      type: "configureJunction",
      beltId: id,
      definitionId: "short-crossing",
      direction: 0,
      branch: 1,
    }).ok,
  ).toBe(true);
  expect(sim.serialize().belts["20,20"].junction!.crossing).toEqual({
    axis: 0,
    remaining: 2,
    pending: null,
    held: null,
  });
  expect(sim.load(sim.serialize()).ok).toBe(true);
});
