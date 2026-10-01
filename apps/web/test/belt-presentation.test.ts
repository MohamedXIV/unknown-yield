import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import { Simulation, socket, type Belt } from "@site/sim-core";
import { beltPresentations } from "../game/belt-presentation";
const belt = (x: number, y: number, direction: number): Belt => ({
  id: `${x},${y}`,
  x,
  y,
  direction,
  alternate: null,
  switched: false,
  cargo: null,
});
const vectors = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
const world = (belts: Belt[]) => ({
  ...new Simulation(fixture).snapshot(),
  belts,
});
describe("belt topology presentation", () => {
  it("derives all perpendicular bends and straight orientations", () => {
    for (let inlet = 0; inlet < 4; inlet++)
      for (let outlet = 0; outlet < 4; outlet++) {
        if (outlet === inlet) continue;
        const [dx, dy] = vectors[inlet];
        const p = beltPresentations(
          world([
            belt(20 + dx, 20 + dy, (inlet + 2) % 4),
            belt(20, 20, outlet),
          ]),
        ).get("20,20")!;
        expect(p.inlets).toEqual([inlet]);
        expect(p.outlets).toEqual([
          { direction: outlet, active: true, connected: false },
        ]);
      }
  });
  it("shows endpoints and connected outlets without inventing inlets", () => {
    const p = beltPresentations(world([belt(20, 20, 0), belt(21, 20, 0)]));
    expect(p.get("20,20")!.inlets).toEqual([]);
    expect(p.get("20,20")!.outlets[0].connected).toBe(true);
    expect(p.get("21,20")!.outlets[0].connected).toBe(false);
  });
  it("preserves every incoming merge arm", () => {
    const p = beltPresentations(
      world([belt(19, 20, 0), belt(20, 19, 1), belt(20, 20, 0)]),
    );
    expect(p.get("20,20")!.inlets).toEqual([2, 3]);
  });
  it("distinguishes standby/active exits including reverse alternates", () => {
    const center = { ...belt(20, 20, 0), alternate: 2 };
    const s = world([belt(19, 20, 0), center]);
    expect(beltPresentations(s).get(center.id)!.outlets).toEqual([
      { direction: 0, active: true, connected: false },
      { direction: 2, active: false, connected: true },
    ]);
    center.switched = true;
    expect(
      beltPresentations(s)
        .get(center.id)!
        .outlets.map((o) => o.active),
    ).toEqual([false, true]);
    expect(beltPresentations(s).get("19,20")!.inlets).toEqual([0]);
  });
  it("recomputes neighboring switches/removal without mutating snapshots", () => {
    const source = { ...belt(19, 20, 0), alternate: 1, switched: true };
    const s = world([source, belt(20, 20, 1)]),
      before = structuredClone(s);
    expect(beltPresentations(s).get("20,20")!.inlets).toEqual([]);
    expect(s).toEqual(before);
    source.switched = false;
    expect(beltPresentations(s).get("20,20")!.inlets).toEqual([2]);
    s.belts.shift();
    expect(beltPresentations(s).get("20,20")!.inlets).toEqual([]);
  });
  it("recognizes machine/storage sockets in every rotation", () => {
    for (let direction = 0; direction < 4; direction++) {
      const s = world([]),
        definition = fixture.machines.find((m) => m.id === "crusher")!;
      const m = {
        id: "machine",
        definitionId: definition.id,
        x: 20,
        y: 20,
        direction,
        width: direction % 2 ? definition.height : definition.width,
        height: direction % 2 ? definition.width : definition.height,
      };
      const output = socket(m, definition, true),
        input = socket(m, definition, false);
      s.machines = [{ ...m, role: "processor" } as (typeof s.machines)[number]];
      s.belts = [
        belt(output.x, output.y, direction),
        belt(input.x, input.y, direction),
      ];
      const p = beltPresentations(s);
      expect(p.get(`${output.x},${output.y}`)!.inlets).toEqual([
        (direction + 2) % 4,
      ]);
      expect(p.get(`${input.x},${input.y}`)!.outlets[0].connected).toBe(true);
      s.machines = [];
      s.storageDefinitions = [
        {
          ...fixture.storages[0],
          width: definition.width,
          height: definition.height,
        },
      ];
      s.storages = [
        {
          ...m,
          definitionId: fixture.storages[0].id,
          inventory: {},
          capacity: 10,
          nameKey: fixture.storages[0].nameKey,
        },
      ];
      const storage = beltPresentations(s);
      expect(storage.get(`${output.x},${output.y}`)!.inlets).toEqual([
        (direction + 2) % 4,
      ]);
      expect(storage.get(`${input.x},${input.y}`)!.outlets[0].connected).toBe(
        true,
      );
    }
  });
  it("marks terminal arrivals but not a non-socket machine neighbor", () => {
    const s = world([]),
      t = s.map.terminal;
    s.belts = [belt(t.x - 1, t.y, 0)];
    expect(beltPresentations(s).get(s.belts[0].id)!.outlets[0].connected).toBe(
      true,
    );
    s.machines = [
      {
        id: "m",
        definitionId: "crusher",
        x: 20,
        y: 20,
        direction: 0,
        role: "processor",
        width: 3,
        height: 3,
      } as (typeof s.machines)[number],
    ];
    s.belts = [belt(19, 20, 0)];
    expect(beltPresentations(s).get("19,20")!.outlets[0].connected).toBe(false);
  });
});
