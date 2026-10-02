import { describe, it, expect } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  type GameCommand,
} from "../src/index";

const make = () => new Simulation(fixture);
function build(s: Simulation, c: GameCommand) {
  const r = s.command(c);
  expect(r.ok, r.message).toBe(true);
  return r.id!;
}
function path(x: number, y: number, endX: number, endY: number, direction = 0) {
  const points = [{ x, y }];
  while (x !== endX) {
    x += Math.sign(endX - x);
    points.push({ x, y });
  }
  while (y !== endY) {
    y += Math.sign(endY - y);
    points.push({ x, y });
  }
  return { type: "placeBelts" as const, points, direction };
}
function auditOk(s: Simulation) {
  const report = auditLedger(fixture, s.serialize());
  expect(report.mismatches).toEqual([]);
  expect(report.ok).toBe(true);
}
function beltAt(s: Simulation, x: number, y: number) {
  const b = s.snapshot().belts.find((b) => b.x === x && b.y === y)!;
  expect(b).toBeTruthy();
  return b.id;
}
// One extractor feed splits at (19,26): primary east into depot A at
// (22,24), alternate south into depot B at (16,31).
function fork(s = make()) {
  build(s, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 15,
    y: 25,
    direction: 0,
  });
  build(s, {
    type: "placeStorage",
    definitionId: "depot",
    x: 22,
    y: 24,
    direction: 0,
  });
  build(s, {
    type: "placeStorage",
    definitionId: "depot",
    x: 16,
    y: 31,
    direction: 0,
  });
  build(s, path(17, 26, 21, 25, 0));
  build(s, path(19, 27, 15, 32, 0));
  return s;
}

describe("belt diverter", () => {
  it("rotates the alternate exit through non-primary directions, then clears", () => {
    const s = fork();
    const id = beltAt(s, 19, 26);
    expect(s.command({ type: "rotateDivert", beltId: "nope" }).ok).toBe(false);
    const before = s.serialize();
    expect(s.preview({ type: "rotateDivert", beltId: id }).ok).toBe(true);
    expect(s.serialize()).toEqual(before);
    for (const want of [1, 2, 3]) {
      expect(s.command({ type: "rotateDivert", beltId: id }).ok).toBe(true);
      const belt = s.snapshot().belts.find((b) => b.id === id)!;
      expect(belt.alternate).toBe(want);
      expect(belt.switched).toBe(false);
    }
    expect(s.command({ type: "rotateDivert", beltId: id }).ok).toBe(true);
    const cleared = s.snapshot().belts.find((b) => b.id === id)!;
    expect(cleared.alternate).toBeNull();
    auditOk(s);
  });

  it("switches only with an alternate set and preserves state on refusal", () => {
    const s = fork();
    const id = beltAt(s, 19, 26);
    const before = s.serialize();
    expect(s.command({ type: "switchDivert", beltId: id }).ok).toBe(false);
    expect(s.command({ type: "switchDivert", beltId: "nope" }).ok).toBe(false);
    expect(s.serialize()).toEqual(before);
    expect(s.command({ type: "rotateDivert", beltId: id }).ok).toBe(true);
    expect(s.command({ type: "switchDivert", beltId: id }).ok).toBe(true);
    expect(s.snapshot().belts.find((b) => b.id === id)?.switched).toBe(true);
    expect(s.command({ type: "switchDivert", beltId: id }).ok).toBe(true);
    expect(s.snapshot().belts.find((b) => b.id === id)?.switched).toBe(false);
    auditOk(s);
  });

  it("redirects one feed between two depots without touching either", () => {
    const s = fork();
    const id = beltAt(s, 19, 26);
    s.step(30000);
    const depotA = () =>
      Object.values(s.serialize().storages).find(
        (t) => t.x === 22 && t.y === 24,
      )!.inventory;
    const depotB = () =>
      Object.values(s.serialize().storages).find(
        (t) => t.x === 16 && t.y === 31,
      )!.inventory;
    expect(Object.values(depotA()).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(Object.values(depotB()).reduce((a, b) => a + b, 0)).toBe(0);
    auditOk(s);
    // Cargo already past the diverter on line A still arrives there.
    const residual = ["20,26", "21,26", "21,25"].filter(
      (k) => s.serialize().belts[k]?.cargo,
    ).length;
    // Point the alternate south and switch: new cargo flows to depot B.
    expect(s.command({ type: "rotateDivert", beltId: id }).ok).toBe(true);
    expect(s.command({ type: "switchDivert", beltId: id }).ok).toBe(true);
    const aBefore = Object.values(depotA()).reduce((a, b) => a + b, 0);
    s.step(30000);
    expect(Object.values(depotB()).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(Object.values(depotA()).reduce((a, b) => a + b, 0)).toBe(
      aBefore + residual,
    );
    auditOk(s);
    // Switch back: the feed returns to depot A.
    expect(s.command({ type: "switchDivert", beltId: id }).ok).toBe(true);
    s.step(20000);
    expect(Object.values(depotA()).reduce((a, b) => a + b, 0)).toBeGreaterThan(
      aBefore,
    );
    auditOk(s);
  });

  it("keeps in-transit cargo exact across switches", () => {
    const s = fork();
    const id = beltAt(s, 19, 26);
    expect(s.command({ type: "rotateDivert", beltId: id }).ok).toBe(true);
    s.step(15000);
    // Every extracted unit is either still held somewhere physical or sunk
    // into placed structures; the ledger proves the rest.
    const held = (sv: ReturnType<Simulation["serialize"]>) =>
      Object.values(sv.belts).filter((b) => b.cargo).length +
      Object.values(sv.machines).reduce(
        (n, m) =>
          n +
          Object.values(m.input).reduce((a, b) => a + b, 0) +
          Object.values(m.output).reduce((a, b) => a + b, 0) +
          (m.job ? 1 : 0),
        0,
      ) +
      Object.values(sv.storages).reduce(
        (n, t) => n + Object.values(t.inventory).reduce((a, b) => a + b, 0),
        0,
      ) +
      Object.values(sv.staging).reduce((a, b) => a + b, 0) +
      Object.values(sv.stock).reduce((a, b) => a + b, 0);
    const sources = (sv: ReturnType<Simulation["serialize"]>) =>
      Object.values(sv.deposits).reduce((a, b) => a + b, 0);
    for (let i = 0; i < 6; i++) {
      s.step(5000);
      expect(s.command({ type: "switchDivert", beltId: id }).ok).toBe(true);
      const sv = s.serialize();
      // Embodied plates: extractor 18 + depots 30 + 30 + 16 belt cells.
      expect(held(sv) + sources(sv) + 94).toBe(600 + 12000);
      auditOk(s);
    }
  });

  it("preserves routing state across save/load with identical behavior", () => {
    const s = fork();
    const id = beltAt(s, 19, 26);
    expect(s.command({ type: "rotateDivert", beltId: id }).ok).toBe(true);
    expect(s.command({ type: "switchDivert", beltId: id }).ok).toBe(true);
    s.step(20000);
    const a = s.serialize(),
      b = make();
    expect(b.load(JSON.parse(JSON.stringify(a))).ok).toBe(true);
    expect(b.serialize()).toEqual(a);
    const belt = b.snapshot().belts.find((x) => x.id === id)!;
    expect([belt.alternate, belt.switched]).toEqual([1, true]);
    s.step(15000);
    b.step(15000);
    expect(b.serialize()).toEqual(s.serialize());
    auditOk(b);
  });

  it("migrates schema-4 saves with plain belts intact", () => {
    const s = fork();
    s.step(10000);
    const old = JSON.parse(JSON.stringify(s.serialize()));
    expect(old.schemaVersion).toBe(14);
    old.schemaVersion = 4;
    delete old.evidence;
    for (const machine of Object.values(old.machines) as Array<Record<string, unknown>>)
      delete machine.incident;
    for (const belt of Object.values(old.belts)) {
      delete (belt as Record<string, unknown>).alternate;
      delete (belt as Record<string, unknown>).switched;
    }
    const b = make();
    expect(b.load(old).ok).toBe(true);
    expect(b.serialize().schemaVersion).toBe(14);
    for (const belt of Object.values(b.serialize().belts)) {
      expect(belt.alternate).toBeNull();
      expect(belt.switched).toBe(false);
    }
    auditOk(b);
  });

  it("blocks arrival deterministically on the alternate branch when full", () => {
    const s = fork();
    const id = beltAt(s, 19, 26);
    expect(s.command({ type: "rotateDivert", beltId: id }).ok).toBe(true);
    expect(s.command({ type: "switchDivert", beltId: id }).ok).toBe(true);
    for (let i = 0; i < 40; i++) {
      s.step(20000);
      const b = Object.values(s.serialize().storages).find(
        (t) => t.x === 16 && t.y === 31,
      )!;
      if (Object.values(b.inventory).reduce((a, b) => a + b, 0) >= 40) break;
    }
    const full = s.serialize();
    expect(
      Object.values(
        Object.values(full.storages).find((t) => t.x === 16 && t.y === 31)!
          .inventory,
      ).reduce((a, b) => a + b, 0),
    ).toBe(40);
    auditOk(s);
    // Let the backup propagate through every downstream buffer until the
    // extractor itself stalls, then assert an exact deterministic freeze.
    const physical = (s: Simulation) => {
      const snap = s.serialize();
      return {
        deposits: snap.deposits,
        stock: snap.stock,
        staging: snap.staging,
        machines: snap.machines,
        belts: snap.belts,
        storages: snap.storages,
        exported: snap.exported,
        fuel: snap.fuel,
      };
    };
    let prev = JSON.stringify(physical(s));
    for (let i = 0; i < 30; i++) {
      s.step(20000);
      const cur = JSON.stringify(physical(s));
      if (cur === prev) break;
      prev = cur;
    }
    const frozen = physical(s);
    s.step(20000);
    expect(physical(s)).toEqual(frozen);
    expect(
      Object.values(frozen.storages)
        .find((t) => t.x === 16 && t.y === 31)!
        .inventory,
    ).toEqual({ ferrite: 40 });
    auditOk(s);
  });

  it("keeps diverter belts under conservative reclaim rules", () => {
    const s = fork();
    const id = beltAt(s, 19, 26);
    expect(s.command({ type: "rotateDivert", beltId: id }).ok).toBe(true);
    for (let i = 0; i < 20; i++) {
      s.step(1000);
      if (s.snapshot().belts.find((b) => b.id === id)?.cargo) break;
    }
    const loaded = s.snapshot().belts.find((b) => b.id === id && b.cargo);
    expect(loaded?.cargo).toBe("ferrite");
    const before = s.serialize();
    expect(s.command({ type: "dismantle", id }).ok).toBe(false);
    expect(s.serialize()).toEqual(before);
    auditOk(s);
  });

  it("refuses diverter alternates on factory wall belts, never bypassing ports", () => {
    const s = make();
    const factory = build(s, {
      type: "placeFactory",
      x: 24,
      y: 33,
      width: 10,
      height: 10,
    });
    build(s, { type: "placePort", factoryId: factory, x: 24, y: 37, direction: 0 });
    build(s, path(22, 37, 26, 37));
    // Interior belts keep working; the wall/port cell refuses.
    const inside = beltAt(s, 26, 37);
    expect(s.command({ type: "rotateDivert", beltId: inside }).ok).toBe(true);
    const wallId = beltAt(s, 24, 37);
    const before = s.serialize();
    expect(s.command({ type: "rotateDivert", beltId: wallId }).ok).toBe(false);
    expect(s.preview({ type: "rotateDivert", beltId: wallId }).ok).toBe(false);
    expect(s.serialize()).toEqual(before);
    auditOk(s);
    // A crafted wall alternate is rejected at the load boundary too.
    const tampered = structuredClone(before);
    const key = Object.keys(tampered.belts).find(
      (k) => tampered.belts[k].id === wallId,
    )!;
    tampered.belts[key].alternate = 1;
    const b = make();
    expect(b.load(JSON.parse(JSON.stringify(tampered))).ok).toBe(false);
    expect(b.serialize().belts).toEqual({});
  });
});
