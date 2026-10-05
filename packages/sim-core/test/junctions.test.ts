import { historicalFixture } from "./historical-content";
import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import { Simulation, auditLedger, beltArms } from "../src/index";
import { transport } from "../src/production";

function make(kind = "splitter") {
  const sim = new Simulation(fixture);
  for (const [x, y, direction] of [
    [20, 20, 0],
    [19, 20, 0],
    [21, 20, 0],
    [20, 21, 3],
  ])
    expect(
      sim.command({ type: "placeBelts", points: [{ x, y }], direction }).ok,
    ).toBe(true);
  const id = sim.snapshot().belts.find((b) => b.x === 20 && b.y === 20)!.id;
  expect(
    sim.command({
      type: "configureJunction",
      beltId: id,
      definitionId: kind,
      direction: 0,
      branch: 1,
    }).ok,
  ).toBe(true);
  return { sim, id, state: sim.serialize() };
}
function fill(s: ReturnType<Simulation["serialize"]>, cell: string) {
  s.stock.plates--;
  s.belts[cell].cargo = "plates";
}
describe("directed T junctions", () => {
  it("splits successful dispatches fairly and skips a blocked preferred arm", () => {
    const { state: s } = make();
    fill(s, "20,20");
    transport(fixture, s);
    expect(s.belts["21,20"].cargo).toBe("plates");
    expect(s.belts["20,20"].junction!.cursor).toBe(1);
    fill(s, "20,20");
    transport(fixture, s);
    expect(s.belts["20,21"].cargo).toBe("plates");
    expect(s.belts["20,20"].junction!.cursor).toBe(0);
    fill(s, "20,20");
    const before = structuredClone(s);
    transport(fixture, s);
    expect(s).toEqual(before);
    expect(auditLedger(fixture, s).ok).toBe(true);
    s.belts["20,21"].cargo = null;
    s.stock.plates++;
    transport(fixture, s);
    expect(s.belts["20,21"].cargo).toBe("plates");
    expect(s.belts["20,20"].junction!.cursor).toBe(0);
  });
  it("merges both continuously available inlets without row-order starvation", () => {
    const { state: s } = make("merger");
    fill(s, "19,20");
    fill(s, "20,21");
    transport(fixture, s);
    expect(s.belts["19,20"].cargo).toBe(null);
    expect(s.belts["20,21"].cargo).toBe("plates");
    expect(s.belts["20,20"].junction!.cursor).toBe(1);
    fill(s, "19,20");
    transport(fixture, s);
    expect(s.belts["19,20"].cargo).toBe("plates");
    s.belts["21,20"].cargo = null;
    s.stock.plates++;
    transport(fixture, s);
    expect(s.belts["20,21"].cargo).toBe(null);
    expect(s.belts["19,20"].cargo).toBe("plates");
    expect(auditLedger(fixture, s).ok).toBe(true);
  });
  it("refuses loaded changes/removal atomically and refunds empty upgrades conservatively", () => {
    const { sim, id, state: s } = make();
    fill(s, "20,20");
    sim.load(s);
    const before = sim.serialize();
    expect(
      sim.command({
        type: "configureJunction",
        beltId: id,
        definitionId: "merger",
        direction: 1,
        branch: -1,
      }).ok,
    ).toBe(false);
    expect(sim.command({ type: "dismantle", id }).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
    const empty = make();
    const stock = empty.sim.snapshot().stock.plates;
    expect(
      empty.sim.command({
        type: "configureJunction",
        beltId: empty.id,
        definitionId: null,
        direction: 0,
        branch: 1,
      }).ok,
    ).toBe(true);
    expect(empty.sim.snapshot().stock.plates).toBe(
      stock + fixture.junctions.find((d) => d.id === "splitter")!.cost,
    );
    expect(auditLedger(fixture, empty.sim.serialize()).ok).toBe(true);
  });
  it("restores contention deterministically and migrates schema 11 without changing belts", () => {
    const { state: s } = make("merger");
    fill(s, "19,20");
    fill(s, "20,21");
    const a = new Simulation(fixture),
      b = new Simulation(fixture);
    expect(a.load(s).ok).toBe(true);
    expect(b.load(s).ok).toBe(true);
    for (let i = 0; i < 10; i++) {
      a.step(200);
      b.step(200);
      expect(b.serialize()).toEqual(a.serialize());
    }
    const legacy = new Simulation(historicalFixture).serialize();
    legacy.schemaVersion = 11;
    legacy.contentVersion = historicalFixture.version;
    const old = new Simulation(historicalFixture);
    expect(old.load(legacy).ok).toBe(true);
    expect(old.serialize().schemaVersion).toBe(26);
    const bad = structuredClone(s);
    bad.belts["20,20"].junction!.cursor = 2 as 0;
    const before = b.serialize();
    expect(b.load(bad).ok).toBe(false);
    expect(b.serialize()).toEqual(before);
  });
});

describe("T configuration boundary", () => {
  it("rotates ordered arms without resetting the saved fairness cursor", () => {
    for (const kind of ["splitter", "merger"]) {
      const { sim, id, state } = make(kind);
      state.belts["20,20"].junction!.cursor = 1;
      expect(sim.load(state).ok).toBe(true);
      for (const branch of [1, -1] as const)
        for (let direction = 0; direction < 4; direction++) {
          expect(
            sim.command({
              type: "configureJunction",
              beltId: id,
              definitionId: kind,
              direction,
              branch,
            }).ok,
          ).toBe(true);
          const b = sim.snapshot().belts.find((b) => b.id === id)!;
          const arms = beltArms(fixture, b);
          const side = (direction + (branch === 1 ? 1 : 3)) % 4;
          expect(arms.inlets).toEqual(
            kind === "splitter"
              ? [(direction + 2) % 4]
              : [(direction + 2) % 4, side],
          );
          expect(arms.outlets).toEqual(
            kind === "splitter" ? [direction, side] : [direction],
          );
          expect(b.junction!.cursor).toBe(1);
          expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
        }
    }
  });
  it("rejects unknown definitions, malformed topology and legacy junctions atomically", () => {
    const { sim, id, state } = make();
    const before = sim.serialize();
    expect(
      sim.command({
        type: "configureJunction",
        beltId: id,
        definitionId: "missing",
        direction: 0,
        branch: 1,
      }).ok,
    ).toBe(false);
    expect(sim.serialize()).toEqual(before);
    for (const invalid of [
      { ...state, schemaVersion: 11 },
      {
        ...state,
        belts: {
          ...state.belts,
          "20,20": { ...state.belts["20,20"], alternate: 1 },
        },
      },
      {
        ...state,
        belts: {
          ...state.belts,
          "20,20": {
            ...state.belts["20,20"],
            junction: { definitionId: "missing", branch: 1, cursor: 0 },
          },
        },
      },
    ]) {
      expect(sim.load(invalid).ok).toBe(false);
      expect(sim.serialize()).toEqual(before);
    }
  });
});

describe("T admission and conservation regressions", () => {
  it("retries the other splitter arm after a reservation conflict", () => {
    const { sim } = make();
    expect(
      sim.command({
        type: "placeBelts",
        points: [{ x: 21, y: 19 }],
        direction: 1,
      }).ok,
    ).toBe(true);
    const s = sim.serialize();
    fill(s, "20,20");
    fill(s, "21,19");
    transport(fixture, s);
    expect(s.belts["21,20"].cargo).toBe("plates");
    expect(s.belts["20,21"].cargo).toBe("plates");
    expect(s.belts["20,20"].cargo).toBe(null);
    expect(s.belts["20,20"].junction!.cursor).toBe(0);
    expect(auditLedger(fixture, s).ok).toBe(true);
  });
  it("accepts only the configured inlet sides in all orientations", () => {
    for (const kind of ["splitter", "merger"])
      for (const branch of [1, -1] as const)
        for (let direction = 0; direction < 4; direction++) {
          const sim = new Simulation(fixture);
          const vectors = [
            [1, 0],
            [0, 1],
            [-1, 0],
            [0, -1],
          ];
          for (const [side, [dx, dy]] of vectors.entries())
            expect(
              sim.command({
                type: "placeBelts",
                points: [{ x: 20 + dx, y: 20 + dy }],
                direction: (side + 2) % 4,
              }).ok,
            ).toBe(true);
          expect(
            sim.command({
              type: "placeBelts",
              points: [{ x: 20, y: 20 }],
              direction,
            }).ok,
          ).toBe(true);
          const id = sim
            .snapshot()
            .belts.find((b) => b.x === 20 && b.y === 20)!.id;
          expect(
            sim.command({
              type: "configureJunction",
              beltId: id,
              definitionId: kind,
              direction,
              branch,
            }).ok,
          ).toBe(true);
          const s = sim.serialize();
          for (const [dx, dy] of vectors) fill(s, 20 + dx + "," + (20 + dy));
          transport(fixture, s);
          const first = (direction + 2) % 4;
          const [dx, dy] = vectors[first];
          expect(s.belts[20 + dx + "," + (20 + dy)].cargo).toBe(null);
          expect(s.belts["20,20"].cargo).toBe("plates");
          expect(Object.values(s.belts).filter((b) => b.cargo)).toHaveLength(4);
          expect(auditLedger(fixture, s).ok).toBe(true);
        }
  });
  it.each(["machine", "storage"])(
    "arbitrates a %s emitter against a belt without starvation",
    (kind) => {
      const sim = new Simulation(fixture);
      const result = sim.command(
        kind === "machine"
          ? {
              type: "placeMachine",
              definitionId: "extractor",
              x: 18,
              y: 26,
              direction: 0,
            }
          : {
              type: "placeStorage",
              definitionId: "depot",
              x: 17,
              y: 19,
              direction: 0,
            },
      );
      expect(result.ok, result.message).toBe(true);
      const cy = kind === "machine" ? 27 : 20;
      for (const [x, y, direction] of [
        [20, cy, 0],
        [20, cy + 1, 3],
        [21, cy, 0],
      ])
        expect(
          sim.command({ type: "placeBelts", points: [{ x, y }], direction }).ok,
        ).toBe(true);
      const id = sim.snapshot().belts.find((b) => b.x === 20 && b.y === cy)!.id;
      expect(
        sim.command({
          type: "configureJunction",
          beltId: id,
          definitionId: "merger",
          direction: 0,
          branch: 1,
        }).ok,
      ).toBe(true);
      const s = sim.serialize();
      const inventory =
        kind === "machine"
          ? s.machines[result.id!].output
          : s.storages[result.id!].inventory;
      let fromEmitter = 0,
        fromBelt = 0;
      for (let i = 0; i < 20; i++) {
        if (!inventory.plates) {
          inventory.plates = 1;
          s.stock.plates--;
        }
        if (!s.belts["20," + (cy + 1)].cargo) fill(s, "20," + (cy + 1));
        const count = inventory.plates;
        transport(fixture, s);
        if ((inventory.plates ?? 0) < count) fromEmitter++;
        else fromBelt++;
        expect(s.belts["20," + cy].junction!.cursor).toBe(i % 2 === 0 ? 1 : 0);
        transport(fixture, s);
        expect(s.belts["20," + cy].cargo).toBe(null);
        expect(s.belts["21," + cy].cargo).toBe("plates");
        s.belts["21," + cy].cargo = null;
        s.stock.plates++;
        expect(auditLedger(fixture, s).ok).toBe(true);
      }
      expect([fromEmitter, fromBelt]).toEqual([10, 10]);
    },
  );
  it("restores a non-initial fairness cursor with held cargo to the same future trace", () => {
    const { state: s } = make("merger");
    fill(s, "19,20");
    fill(s, "20,21");
    transport(fixture, s);
    const a = new Simulation(fixture),
      b = new Simulation(fixture);
    expect(a.load(s).ok).toBe(true);
    expect(b.load(JSON.parse(JSON.stringify(s))).ok).toBe(true);
    for (let i = 0; i < 20; i++) {
      a.step(200);
      b.step(200);
      expect(b.serialize()).toEqual(a.serialize());
      expect(auditLedger(fixture, a.serialize()).ok).toBe(true);
    }
  });
  it("rejects unaffordable conversion and wall-port upgrades without changing state", () => {
    const sim = new Simulation({
      ...fixture,
      site: { ...fixture.site, startStock: fixture.site.beltCost },
    });
    expect(
      sim.command({
        type: "placeBelts",
        points: [{ x: 20, y: 20 }],
        direction: 0,
      }).ok,
    ).toBe(true);
    const id = sim.snapshot().belts[0].id,
      before = sim.serialize();
    expect(
      sim.command({
        type: "configureJunction",
        beltId: id,
        definitionId: "splitter",
        direction: 0,
        branch: 1,
      }).ok,
    ).toBe(false);
    expect(sim.serialize()).toEqual(before);
    const wallSim = new Simulation(fixture);
    const f = wallSim.command({
      type: "placeFactory",
      x: 24,
      y: 22,
      width: 6,
      height: 6,
    });
    expect(f.ok).toBe(true);
    expect(
      wallSim.command({
        type: "placePort",
        factoryId: f.id!,
        x: 24,
        y: 25,
        direction: 0,
      }).ok,
    ).toBe(true);
    expect(
      wallSim.command({
        type: "placeBelts",
        points: [{ x: 24, y: 25 }],
        direction: 0,
      }).ok,
    ).toBe(true);
    const wall = wallSim.snapshot().belts[0],
      old = wallSim.serialize();
    expect(
      wallSim.command({
        type: "configureJunction",
        beltId: wall.id,
        definitionId: "splitter",
        direction: 0,
        branch: 1,
      }).ok,
    ).toBe(false);
    expect(wallSim.serialize()).toEqual(old);
  });
});
