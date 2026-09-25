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
function crusherLine(s = make()) {
  const factory = build(s, {
    type: "placeFactory",
    x: 24,
    y: 22,
    width: 10,
    height: 10,
  });
  build(s, { type: "placePort", factoryId: factory, x: 24, y: 27, direction: 0 });
  build(s, { type: "placePort", factoryId: factory, x: 33, y: 27, direction: 0 });
  const extractor = build(s, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 26,
    direction: 0,
  });
  const crusher = build(s, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 26,
    direction: 0,
  });
  build(s, path(20, 27, 26, 27));
  return { s, factory, extractor, crusher };
}

describe("conservative handling (no generic discard)", () => {
  it("rejects the removed discard command without touching state", () => {
    const s = make();
    const id = build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    });
    s.step(10000);
    const before = s.serialize();
    expect(
      s.command({ type: "discard", machineId: id, buffer: "output" }).ok,
    ).toBe(false);
    expect(
      s.preview({ type: "discard", machineId: id, buffer: "input" }).ok,
    ).toBe(false);
    expect(s.serialize()).toEqual(before);
    auditOk(s);
  });

  it("keeps buffers intact across disable, steps and save/load", () => {
    const { s, extractor, crusher } = crusherLine();
    s.step(30000);
    const feed = s.serialize();
    expect(
      Object.values(feed.machines[crusher].input).reduce((a, b) => a + b, 0) +
        Object.values(feed.machines[crusher].output).reduce((a, b) => a + b, 0),
    ).toBeGreaterThan(0);
    s.command({ type: "setEnabled", machineId: extractor, enabled: false });
    s.command({ type: "setEnabled", machineId: crusher, enabled: false });
    s.step(30000);
    const quiet = s.serialize();
    expect(quiet.machines[crusher].job).toBeNull();
    s.step(20000);
    const settled = s.serialize();
    expect(settled.machines).toEqual(quiet.machines);
    expect(settled.belts).toEqual(quiet.belts);
    expect(settled.fuel).toBe(quiet.fuel);
    const b = make();
    expect(b.load(JSON.parse(JSON.stringify(settled))).ok).toBe(true);
    expect(b.serialize()).toEqual(settled);
    auditOk(b);
  });

  it("refuses machine dismantle with buffered material without moving anything", () => {
    const { s, extractor, crusher } = crusherLine();
    // Stop the source so the drain-down below is deterministic.
    s.command({ type: "setEnabled", machineId: extractor, enabled: false });
    const crafted = s.serialize();
    // Honest post-extraction/post-batch state: 2 ferrite pulled from the
    // deposit sit in input next to 6 plates of batch output.
    crafted.deposits["ferrite-field"] -= 2;
    crafted.machines[crusher].input = { ferrite: 2 };
    crafted.machines[crusher].output = { plates: 6 };
    crafted.flows.produced.plates = 6;
    expect(s.load(crafted).ok).toBe(true);
    const plates = s.snapshot().stock.plates;
    // Far from the terminal, nothing may teleport: refusal is atomic.
    const before = s.serialize();
    expect(s.command({ type: "dismantle", id: crusher }).ok).toBe(false);
    expect(s.serialize()).toEqual(before);
    expect(s.serialize().staging).toEqual({});
    expect(s.snapshot().stock.plates).toBe(plates);
    auditOk(s);
    // The legitimate path: run the batch, drain everything into a depot,
    // then reclaim succeeds with the exact build refund.
    const depot = build(s, {
      type: "placeStorage",
      definitionId: "depot",
      x: 35,
      y: 24,
      direction: 0,
    });
    expect(depot[0]).toBe("s");
    build(s, path(29, 27, 34, 25, 0));
    for (let i = 0; i < 40; i++) {
      s.step(5000);
      const m = s.serialize().machines[crusher];
      if (Object.keys(m.input).length === 0 && Object.keys(m.output).length === 0)
        break;
    }
    const drained = s.serialize();
    expect(drained.machines[crusher].input).toEqual({});
    expect(drained.machines[crusher].output).toEqual({});
    expect(
      Object.values(drained.storages[depot].inventory).reduce((a, b) => a + b, 0),
    ).toBe(12);
    expect(s.command({ type: "dismantle", id: crusher }).ok).toBe(true);
    expect(s.snapshot().stock.plates).toBe(plates - 30 - 8 + 24);
    auditOk(s);
  });

  it("returns plates belt cargo to stock and blocks loaded belts", () => {
    const s = make();
    build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    });
    build(s, path(17, 26, 22, 26));
    s.step(20000);
    // Swap one belt's cargo to plates, keeping the displaced ferrite unit
    // in stock so the crafted state stays ledger-balanced.
    const crafted = s.serialize();
    const cell = Object.keys(crafted.belts).find(
      (k) => crafted.belts[k].cargo === "ferrite",
    )!;
    crafted.belts[cell].cargo = "plates";
    crafted.stock.plates -= 1;
    crafted.stock.ferrite = 1;
    expect(s.load(crafted).ok).toBe(true);
    const plates = s.snapshot().stock.plates;
    expect(s.command({ type: "dismantle", id: crafted.belts[cell].id }).ok).toBe(
      true,
    );
    expect(s.snapshot().stock.plates).toBe(plates + 2);
    expect(s.snapshot().stock.ferrite).toBe(1);
    // A ferrite-loaded belt cannot be dismantled: no teleport, no deletion.
    const loaded = s.snapshot().belts.find((b) => b.cargo === "ferrite")!;
    const held = s.serialize();
    expect(s.command({ type: "dismantle", id: loaded.id }).ok).toBe(false);
    expect(s.serialize()).toEqual(held);
    auditOk(s);
  });

  it("refused belt reclaim preserves the ledger exactly", () => {
    const s = make();
    build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    });
    build(s, path(17, 26, 22, 26));
    s.step(20000);
    const loaded = s.snapshot().belts.find((b) => b.cargo)!;
    const before = s.serialize();
    expect(s.command({ type: "dismantle", id: loaded.id }).ok).toBe(false);
    expect(s.serialize()).toEqual(before);
    const report = auditLedger(fixture, s.serialize());
    expect(report.ok).toBe(true);
    expect(
      report.rows.find((r) => r.material === loaded.cargo)?.belts,
    ).toBeGreaterThan(0);
  });

  it("preserves every buffer through suspend, refused dismantle and reload", () => {
    const { s, extractor, crusher } = crusherLine();
    s.command({ type: "setEnabled", machineId: extractor, enabled: false });
    s.command({ type: "setEnabled", machineId: crusher, enabled: false });
    const crafted = s.serialize();
    // Deterministic suspended state: pulled ore in the crusher input next
    // to finished extractor output, all sourced from the deposit.
    crafted.deposits["ferrite-field"] -= 5;
    crafted.machines[extractor].output = { ferrite: 2 };
    crafted.machines[crusher].input = { ferrite: 3 };
    expect(s.load(crafted).ok).toBe(true);
    s.step(20000);
    const held = s.serialize();
    // The extractor output drains down the connected feed belt into the
    // disabled crusher input; nothing vanishes, nothing is created.
    expect(held.machines[extractor].output).toEqual({});
    expect(held.machines[crusher].input).toEqual({ ferrite: 5 });
    expect(
      Object.values(held.belts).every((b) => b.cargo === null),
    ).toBe(true);
    // Neither buffered machine can be reclaimed, and refusal changes nothing.
    const blocked = s.serialize();
    expect(s.command({ type: "dismantle", id: crusher }).ok).toBe(false);
    expect(s.serialize()).toEqual(blocked);
    expect(s.serialize().staging).toEqual({});
    expect(Object.keys(s.serialize().stock)).toEqual(["plates"]);
    auditOk(s);
    const b = make();
    const snap = JSON.parse(JSON.stringify(s.serialize()));
    expect(b.load(snap).ok).toBe(true);
    expect(b.serialize()).toEqual(snap);
    auditOk(b);
  });
});
