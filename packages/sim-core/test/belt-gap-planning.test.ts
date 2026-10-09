import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  planBeltPlacement,
  type GameCommand,
  type Save,
} from "../src";

const make = () => new Simulation(fixture);
const place = (sim: Simulation, command: GameCommand) => {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result;
};
const beltAt = (save: Save, x: number, y: number) => save.belts[`${x},${y}`];
const beltPath = (points: { x: number; y: number }[], direction = 0) =>
  ({ type: "placeBelts", points, direction }) as const;
const assertLedger = (sim: Simulation) => {
  expect(auditLedger(fixture, sim.serialize()).mismatches).toEqual([]);
};

describe("gap-aware ground belt placement", () => {
  it("exposes a deterministic pure preflight over an unchanged save", () => {
    const sim = make();
    place(sim, beltPath([{ x: 5, y: 5 }]));
    const save = sim.serialize();
    const route = beltPath([{ x: 5, y: 5 }, { x: 6, y: 5 }]);

    const first = planBeltPlacement(fixture, save, route);
    const second = planBeltPlacement(fixture, save, route);

    expect(first).toEqual(second);
    expect(first).toMatchObject({ newCount: 1, reusedCount: 1, cost: 1 });
    expect(save).toEqual(sim.serialize());
  });

  it("reuses an existing start and charges only for the new end", () => {
    const sim = make();
    place(sim, beltPath([{ x: 10, y: 10 }, { x: 11, y: 10 }]));
    const before = sim.serialize();
    const result = sim.preview(
      beltPath([{ x: 10, y: 10 }, { x: 11, y: 10 }, { x: 12, y: 10 }]),
    );

    expect(result.ok).toBe(true);
    expect(result.cost).toBe(1);
    expect(result).toMatchObject({
      beltPlan: {
        newCount: 1,
        reusedCount: 2,
        cost: 1,
        positions: [
          { kind: "reuse" },
          { kind: "reuse" },
          { kind: "add" },
        ],
      },
    });
    const placed = sim.command(
      beltPath([{ x: 10, y: 10 }, { x: 11, y: 10 }, { x: 12, y: 10 }]),
    );
    expect(placed.ok).toBe(true);
    expect(placed.cost).toBe(1);
    const after = sim.serialize();
    expect(beltAt(after, 10, 10)).toEqual(beltAt(before, 10, 10));
    expect(beltAt(after, 11, 10)).toEqual(beltAt(before, 11, 10));
    expect(beltAt(after, 12, 10)).not.toHaveProperty("kind");
    expect(after.stock.plates).toBe(before.stock.plates - 1);
    assertLedger(sim);
  });

  it("accepts a reused end belt whose outlet continues in another direction", () => {
    const sim = make();
    place(sim, beltPath([{ x: 13, y: 10 }], 1));
    const before = sim.serialize();

    const result = sim.command(beltPath([{ x: 12, y: 10 }, { x: 13, y: 10 }]));

    expect(result.ok).toBe(true);
    expect(result.cost).toBe(1);
    expect(beltAt(sim.serialize(), 13, 10)).toEqual(beltAt(before, 13, 10));
    assertLedger(sim);
  });

  it("fills multiple separate gaps while preserving every reused belt", () => {
    const sim = make();
    for (const [x, direction] of [[20, 0], [22, 0], [24, 1]] as const)
      place(sim, beltPath([{ x, y: 10 }], direction));
    const before = sim.serialize();

    const result = sim.command(
      beltPath(
        [20, 21, 22, 23, 24].map((x) => ({ x, y: 10 })),
      ),
    );

    expect(result.ok).toBe(true);
    expect(result.cost).toBe(2);
    expect(result.beltPlan).toMatchObject({ newCount: 2, reusedCount: 3 });
    const after = sim.serialize();
    for (const x of [20, 22, 24])
      expect(beltAt(after, x, 10)).toEqual(beltAt(before, x, 10));
    assertLedger(sim);
  });

  it("makes repeated all-reused placement an exact zero-cost no-op", () => {
    const sim = make();
    const route = beltPath([
      { x: 30, y: 10 },
      { x: 31, y: 10 },
      { x: 32, y: 10 },
    ]);
    place(sim, route);
    const before = sim.serialize();

    const preview = sim.preview(route);
    const result = sim.command(route);

    expect(preview.ok).toBe(true);
    expect(preview.cost).toBe(0);
    expect(result.ok).toBe(true);
    expect(result.cost).toBe(0);
    expect(result.beltPlan).toMatchObject({ newCount: 0, reusedCount: 3 });
    expect(sim.serialize()).toEqual(before);
    assertLedger(sim);
  });

  it("keeps single-cell placement facing and leaves a reused belt unrotated", () => {
    const sim = make();
    const created = sim.command(beltPath([{ x: 40, y: 10 }], 3));
    expect(created.ok).toBe(true);
    expect(created.cost).toBe(1);
    expect(beltAt(sim.serialize(), 40, 10).direction).toBe(3);
    const before = sim.serialize();

    const reused = sim.command(beltPath([{ x: 40, y: 10 }], 1));

    expect(reused.ok).toBe(true);
    expect(reused.cost).toBe(0);
    expect(beltAt(sim.serialize(), 40, 10)).toEqual(beltAt(before, 40, 10));
  });

  it("blocks a reused interior belt with an incompatible inlet or active outlet", () => {
    const sim = make();
    place(sim, beltPath([{ x: 10, y: 20 }], 2));
    const before = sim.serialize();
    const result = sim.preview(
      beltPath([{ x: 9, y: 20 }, { x: 10, y: 20 }, { x: 11, y: 20 }]),
    );

    expect(result.ok).toBe(false);
    expect(result.beltPlan).toMatchObject({
      newCount: 2,
      reusedCount: 0,
      blockedCount: 1,
      positions: [{ kind: "add" }, { kind: "blocked" }, { kind: "add" }],
    });
    const commit = sim.command(
      beltPath([{ x: 9, y: 20 }, { x: 10, y: 20 }, { x: 11, y: 20 }]),
    );
    expect(commit.ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
  });

  it("follows the selected outlet of a configured diverter without changing it", () => {
    const sim = make();
    place(sim, beltPath([{ x: 20, y: 20 }], 0));
    const original = beltAt(sim.serialize(), 20, 20);
    expect(sim.command({ type: "rotateDivert", beltId: original.id }).ok).toBe(true);
    expect(sim.command({ type: "switchDivert", beltId: original.id }).ok).toBe(true);
    const before = sim.serialize();

    const result = sim.command(
      beltPath([{ x: 20, y: 20 }, { x: 20, y: 21 }]),
    );

    expect(result.ok).toBe(true);
    expect(result.cost).toBe(1);
    expect(beltAt(sim.serialize(), 20, 20)).toEqual(beltAt(before, 20, 20));
    const incompatible = sim.preview(
      beltPath([{ x: 20, y: 20 }, { x: 21, y: 20 }]),
    );
    expect(incompatible.ok).toBe(false);
    expect(incompatible.beltPlan?.positions[0]).toMatchObject({
      kind: "blocked",
      direction: 1,
    });
  });

  it("reuses a configured junction only through its authored inlet and outlet arms", () => {
    const sim = make();
    place(sim, beltPath([{ x: 30, y: 20 }], 0));
    const center = beltAt(sim.serialize(), 30, 20);
    const configured = sim.command({
      type: "configureJunction",
      beltId: center.id,
      definitionId: "splitter",
      direction: 0,
      branch: 1,
    });
    expect(configured.ok, configured.message).toBe(true);
    const before = sim.serialize();

    const compatible = sim.command(
      beltPath([{ x: 29, y: 20 }, { x: 30, y: 20 }, { x: 31, y: 20 }]),
    );

    expect(compatible.ok).toBe(true);
    expect(compatible.cost).toBe(2);
    expect(compatible.beltPlan?.positions[1]).toMatchObject({
      kind: "reuse",
      notice: "splitter-branch-selection",
    });
    expect(beltAt(sim.serialize(), 30, 20)).toEqual(beltAt(before, 30, 20));
    const incompatible = sim.preview(
      beltPath([{ x: 30, y: 19 }, { x: 30, y: 20 }, { x: 30, y: 21 }]),
    );
    expect(incompatible.ok).toBe(false);
    expect(incompatible.beltPlan?.positions[1]).toMatchObject({
      kind: "blocked",
      reason: "The existing belt does not accept entry from the previous cell",
    });
  });

  it("keeps crossing axes straight and distinguishes a temporarily closed gate", () => {
    const sim = make();
    place(sim, beltPath([{ x: 30, y: 30 }], 0));
    const center = beltAt(sim.serialize(), 30, 30);
    const configured = sim.command({
      type: "configureJunction",
      beltId: center.id,
      definitionId: "crossing",
      direction: 0,
      branch: 1,
    });
    expect(configured.ok, configured.message).toBe(true);
    const before = sim.serialize();

    const straight = sim.preview(
      beltPath([{ x: 30, y: 29 }, { x: 30, y: 30 }, { x: 30, y: 31 }]),
    );
    const turn = sim.preview(
      beltPath([{ x: 29, y: 30 }, { x: 30, y: 30 }, { x: 30, y: 31 }]),
    );

    expect(straight.ok).toBe(true);
    expect(straight.beltPlan?.positions[1]).toMatchObject({
      kind: "reuse",
      notice: "crossing-admission-wait",
    });
    expect(turn.ok).toBe(false);
    expect(turn.beltPlan?.positions[1]).toMatchObject({ kind: "blocked" });
    expect(sim.serialize()).toEqual(before);
  });

  it("rejects an unrelated occupied cell atomically with a blocker reason", () => {
    const sim = make();
    place(sim, beltPath([{ x: 10, y: 30 }, { x: 11, y: 30 }]));
    place(sim, {
      type: "placeStorage",
      definitionId: "depot",
      x: 12,
      y: 30,
      direction: 0,
    });
    const before = sim.serialize();

    const result = sim.command(
      beltPath([{ x: 10, y: 30 }, { x: 11, y: 30 }, { x: 12, y: 30 }]),
    );

    expect(result.ok).toBe(false);
    expect(result.beltPlan).toMatchObject({ blockedCount: 1, cost: 0 });
    expect(beltAt(sim.serialize(), 10, 30)).toEqual(beltAt(before, 10, 30));
    expect(sim.serialize()).toEqual(before);
  });

  it("reports the new-only shortfall and makes no partial build", () => {
    const sim = make();
    const snake: { x: number; y: number }[] = [];
    for (let y = 2; y < 20; y++) {
      const row = Array.from({ length: 34 }, (_, i) => ({
        x: y % 2 === 0 ? 2 + i : 35 - i,
        y,
      }));
      snake.push(...row);
    }
    const existing = snake.slice(0, 599);
    place(sim, beltPath(existing, 2));
    expect(sim.serialize().stock.plates).toBe(1);
    const end = existing.at(-1)!;
    const route = beltPath(
      [end, { x: end.x - 1, y: end.y }, { x: end.x - 2, y: end.y }],
      2,
    );
    const before = sim.serialize();

    const result = sim.preview(route);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Not enough structural plates");
    expect(result.cost).toBe(2);
    expect(result.beltPlan).toMatchObject({
      newCount: 2,
      reusedCount: 1,
      cost: 2,
      available: 1,
      shortfall: 1,
    });
    expect(sim.command(route).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
    assertLedger(sim);
  });

  it("preserves cargo in a reused belt while extending a live production route", () => {
    const sim = make();
    place(sim, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    });
    place(
      sim,
      beltPath([
        { x: 17, y: 26 },
        { x: 18, y: 26 },
        { x: 19, y: 26 },
      ]),
    );
    sim.step(30_000);
    const loaded = sim
      .serialize()
      .belts["19,26"];
    expect(loaded?.cargo).not.toBeNull();
    const before = sim.serialize();

    const result = sim.command(
      beltPath([{ x: 19, y: 26 }, { x: 20, y: 26 }]),
    );

    expect(result.ok).toBe(true);
    expect(result.cost).toBe(1);
    const after = sim.serialize();
    expect(beltAt(after, 19, 26)).toEqual(beltAt(before, 19, 26));
    assertLedger(sim);
  });

  it("keeps gap planning deterministic after save and restore", () => {
    const sim = make();
    const route = beltPath([
      { x: 50, y: 10 },
      { x: 51, y: 10 },
      { x: 52, y: 10 },
      { x: 53, y: 10 },
    ]);
    place(sim, route);
    const save = sim.serialize();
    const restored = make();
    expect(restored.load(save).ok).toBe(true);
    const before = restored.serialize();

    const preview = restored.preview(route);
    const result = restored.command(route);

    expect(preview).toMatchObject({ ok: true, cost: 0 });
    expect(result).toMatchObject({ ok: true, cost: 0 });
    expect(restored.serialize()).toEqual(before);
    assertLedger(restored);
  });

  it("revalidates topology at commit after a blocker appears following preview", () => {
    const sim = make();
    const route = beltPath([
      { x: 10, y: 30 },
      { x: 11, y: 30 },
      { x: 12, y: 30 },
    ]);
    expect(sim.preview(route)).toMatchObject({ ok: true, cost: 3 });
    place(sim, {
      type: "placeStorage",
      definitionId: "depot",
      x: 12,
      y: 30,
      direction: 0,
    });
    const beforeCommit = sim.serialize();

    const result = sim.command(route);

    expect(result.ok).toBe(false);
    expect(result.beltPlan?.positions[2]).toMatchObject({ kind: "blocked" });
    expect(sim.serialize()).toEqual(beforeCommit);
  });

  it("rejects repeated and non-adjacent path cells without mutation", () => {
    const sim = make();
    const before = sim.serialize();
    const paths = [
      beltPath([
        { x: 5, y: 40 },
        { x: 6, y: 40 },
        { x: 6, y: 41 },
        { x: 5, y: 41 },
        { x: 5, y: 40 },
      ]),
      beltPath([{ x: 5, y: 43 }, { x: 7, y: 43 }]),
    ];

    for (const route of paths) {
      expect(sim.preview(route).ok).toBe(false);
      expect(sim.command(route).ok).toBe(false);
      expect(sim.serialize()).toEqual(before);
    }
  });
});
