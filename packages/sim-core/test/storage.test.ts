import { describe, it, expect } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  experimentEvidenceKey,
  initializeKnownMarkets,
  type GameCommand,
} from "../src/index";

const make = () => new Simulation(fixture);
function withGranuleHandling(s = make()) {
  const save = s.serialize(),
    reaction = fixture.reactions.find((entry) => entry.id === "heat-raw-sealed")!;
  if (!save.knowledge.includes(reaction.id)) save.knowledge.push(reaction.id);
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
  expect(s.load(save).ok).toBe(true);
  return s;
}
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
  return report;
}
function depot(s: Simulation, x: number, y: number, direction = 0) {
  return build(s, {
    type: "placeStorage",
    definitionId: "depot",
    x,
    y,
    direction,
  });
}
function extractorAt(s: Simulation, x: number, y: number) {
  return build(s, {
    type: "placeMachine",
    definitionId: "extractor",
    x,
    y,
    direction: 0,
  });
}
function storedUnits(s: Simulation) {
  return Object.values(
    Object.values(s.serialize().storages)[0].inventory,
  ).reduce((a, b) => a + b, 0);
}

describe("physical storage", () => {
  it("places depots on clear ground and validates topology", () => {
    const s = make(),
      before = s.snapshot().stock.plates;
    const id = depot(s, 10, 20);
    expect(id[0]).toBe("s");
    expect(before - s.snapshot().stock.plates).toBe(30);
    expect(s.snapshot().storages).toHaveLength(1);
    expect(s.snapshot().storages[0]).toMatchObject({
      id,
      capacity: 40,
      nameKey: "storage.depot.name",
      width: 3,
      height: 2,
    });
    auditOk(s);
    const preview = s.serialize();
    expect(
      s.preview({
        type: "placeStorage",
        definitionId: "depot",
        x: 10,
        y: 20,
        direction: 0,
      }).ok,
    ).toBe(false);
    for (const cmd of [
      {
        type: "placeStorage",
        definitionId: "nope",
        x: 40,
        y: 40,
        direction: 0,
      },
      {
        type: "placeStorage",
        definitionId: "depot",
        x: 38,
        y: 26,
        direction: 0,
      },
      {
        type: "placeStorage",
        definitionId: "depot",
        x: 15,
        y: 25,
        direction: 0,
      },
    ] as const)
      expect(s.command(cmd).ok).toBe(false);
    expect(s.serialize()).toEqual(preview);
  });

  it("moves belt cargo into storage and back out on withdrawal", () => {
    const s = make();
    extractorAt(s, 15, 25);
    depot(s, 22, 24);
    build(s, path(17, 26, 21, 25, 0));
    s.step(20000);
    // The last belt cell sits on the input socket pointing into the depot.
    expect(storedUnits(s)).toBeGreaterThan(0);
    expect(Object.values(s.serialize().storages)[0].inventory.ferrite).toBe(
      storedUnits(s),
    );
    auditOk(s);
    // Withdraw through the output socket at (25,25).
    build(s, path(25, 25, 28, 25));
    const before = storedUnits(s);
    s.step(5000);
    expect(storedUnits(s)).toBeLessThan(before);
    expect(s.snapshot().belts.some((b) => b.cargo === "ferrite")).toBe(true);
    auditOk(s);
  });

  it("blocks upstream flow deterministically when storage is full", () => {
    const s = make();
    extractorAt(s, 15, 25);
    depot(s, 22, 24);
    build(s, path(17, 26, 21, 25, 0));
    s.step(150000);
    expect(storedUnits(s)).toBe(40);
    auditOk(s);
    const full = s.serialize();
    s.step(20000);
    expect(s.serialize().deposits).toEqual(full.deposits);
    expect(s.serialize().storages).toEqual(full.storages);
    auditOk(s);
  });

  it("refuses to dismantle non-empty storage and reclaims empty storage", () => {
    const s = make(),
      plates = s.snapshot().stock.plates;
    extractorAt(s, 15, 25);
    const id = depot(s, 22, 24);
    build(s, path(17, 26, 21, 25, 0));
    s.step(20000);
    expect(storedUnits(s)).toBeGreaterThan(0);
    const before = s.serialize();
    expect(s.command({ type: "dismantle", id }).ok).toBe(false);
    expect(s.serialize()).toEqual(before);
    auditOk(s);
    const empty = make(),
      emptyPlates = empty.snapshot().stock.plates;
    const emptyId = depot(empty, 10, 20);
    expect(empty.command({ type: "dismantle", id: emptyId }).ok).toBe(true);
    expect(empty.snapshot().stock.plates).toBe(emptyPlates);
    expect(empty.snapshot().storages).toHaveLength(0);
    auditOk(empty);
    expect(plates).toBeGreaterThan(0);
  });

  it("preserves storage and staging across save/load round trips", () => {
    const s = make();
    extractorAt(s, 15, 25);
    depot(s, 22, 24);
    build(s, path(17, 26, 21, 25, 0));
    s.step(30000);
    expect(storedUnits(s)).toBeGreaterThan(0);
    const a = s.serialize(),
      b = make();
    expect(b.load(JSON.parse(JSON.stringify(a))).ok).toBe(true);
    expect(b.serialize()).toEqual(a);
    expect(auditLedger(fixture, b.serialize()).ok).toBe(true);
    const tampered = structuredClone(a);
    const key = Object.keys(tampered.storages)[0];
    tampered.storages[key].inventory.ferrite += 3;
    expect(b.load(tampered).ok).toBe(false);
    expect(b.serialize()).toEqual(a);
  });
});

describe("terminal staging", () => {
  function alienLine(s = make(), terminal = true) {
    const factory = build(s, {
      type: "placeFactory",
      x: 24,
      y: 33,
      width: 10,
      height: 10,
    });
    for (const x of [24, 33])
      build(s, {
        type: "placePort",
        factoryId: factory,
        x,
        y: 37,
        direction: 0,
      });
    build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 18,
      y: 36,
      direction: 0,
    });
    build(s, {
      type: "placeMachine",
      definitionId: "crusher",
      x: 27,
      y: 36,
      direction: 0,
    });
    build(s, path(20, 37, 26, 37));
    if (terminal) {
      build(s, path(29, 37, 37, 37, 3));
      build(s, path(37, 36, 37, 28, 0));
    }
    return s;
  }

  it("stages terminal arrivals before export instead of stockpiling them", () => {
    const s = alienLine(withGranuleHandling());
    s.step(60000);
    const save = s.serialize();
    expect(save.exported).toBeGreaterThan(0);
    // Produced materials never enter the magical global stock; only
    // construction plates live there.
    expect(Object.keys(save.stock)).toEqual(["plates"]);
    expect(save.flows.exported.granules ?? 0).toBe(save.exported);
    auditOk(s);
  });

  it("stores, withdraws and exports without touching global stock", () => {
    const s = alienLine(withGranuleHandling(), false);
    const id = depot(s, 10, 20);
    // Divert crusher output out the east port, around the factory and into
    // the depot input socket at (9,21).
    const divert = [{ x: 29, y: 37 }];
    for (let x = 30; x <= 34; x++) divert.push({ x, y: 37 });
    for (let y = 36; y >= 30; y--) divert.push({ x: 34, y });
    for (let x = 33; x >= 9; x--) divert.push({ x, y: 30 });
    for (let y = 29; y >= 21; y--) divert.push({ x: 9, y });
    build(s, { type: "placeBelts", points: divert, direction: 0 });
    s.step(120000);
    const stored = Object.values(s.serialize().storages)[0].inventory;
    expect(stored.granules ?? 0).toBeGreaterThan(0);
    expect(Object.keys(s.serialize().stock)).toEqual(["plates"]);
    expect(s.command({ type: "dismantle", id }).ok).toBe(false);
    auditOk(s);
    // Withdraw eastward out of (13,21) toward terminal staging.
    build(s, path(13, 21, 37, 28, 0));
    const before = s.snapshot().exported;
    s.step(120000);
    expect(s.snapshot().exported).toBeGreaterThan(before);
    expect(Object.keys(s.serialize().stock)).toEqual(["plates"]);
    auditOk(s);
  });

  it("backs terminal arrivals up deterministically when staging is full", () => {
    const s = alienLine();
    expect(
      s.command({ type: "setPolicy", materialId: "granules", policy: "keep" })
        .ok,
    ).toBe(false);
    s.step(30000);
    expect(
      s.command({ type: "setPolicy", materialId: "granules", policy: "keep" })
        .ok,
    ).toBe(true);
    for (let i = 0; i < 30; i++) {
      s.step(20000);
      if (Object.values(s.serialize().staging).reduce((a, b) => a + b, 0) >= 24)
        break;
    }
    const full = s.serialize();
    expect(Object.values(full.staging).reduce((a, b) => a + b, 0)).toBe(24);
    auditOk(s);
    // Let the backup propagate through every downstream buffer until the
    // extractor itself stalls then assert an exact deterministic freeze.
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
    expect(Object.values(frozen.staging).reduce((a, b) => a + b, 0)).toBe(24);
    auditOk(s);
  });
});
