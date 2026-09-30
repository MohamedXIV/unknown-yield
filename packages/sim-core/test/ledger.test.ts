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
  expect(
    s.snapshot().milestones.find((entry) => entry.id === "sealed-study-certified")
      ?.completed,
  ).toBe(true);
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
function line(s = make(), alien = false, heat = false) {
  const fy = alien ? 33 : 22,
    my = alien ? 36 : 26,
    by = my + 1;
  const factory = build(s, {
    type: "placeFactory",
    x: 24,
    y: fy,
    width: 10,
    height: 10,
  });
  for (const x of [24, 33])
    build(s, { type: "placePort", factoryId: factory, x, y: by, direction: 0 });
  const extractor = build(s, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: my,
    direction: 0,
  });
  const processor = build(s, {
    type: "placeMachine",
    definitionId: heat ? "furnace" : "crusher",
    x: 27,
    y: my,
    direction: 0,
  });
  build(s, path(20, by, 26, by));
  if (!heat) {
    build(s, path(29, by, 37, by, alien ? 3 : 0));
    if (alien) build(s, path(37, by - 1, 37, 28, 0));
  }
  return { s, factory, extractor, processor };
}
function auditOk(s: Simulation) {
  const report = auditLedger(fixture, s.serialize());
  expect(report.mismatches).toEqual([]);
  expect(report.ok).toBe(true);
  return report;
}

describe("material ledger", () => {
  it("balances on a fresh expedition with zeroed flows", () => {
    const s = new Simulation(fixture);
    const report = auditLedger(fixture, s.serialize());
    expect(report.ok).toBe(true);
    expect(report.mismatches).toEqual([]);
    expect(s.serialize().flows).toEqual({
      consumed: {},
      produced: {},
      exported: {},
      discarded: {},
    });
  });

  it("conserves extracted material through blocked belts and full buffers", () => {
    const s = make();
    build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    });
    auditOk(s);
    build(s, path(17, 26, 20, 26));
    s.step(60000);
    const save = s.serialize();
    expect(save.deposits["ferrite-field"]).toBeLessThan(
      fixture.site.deposits[0].units,
    );
    // Extraction outputs are sourced via deposits, never double-counted.
    expect(save.flows.produced).toEqual({});
    auditOk(s);
    expect(s.snapshot().belts.every((b) => b.cargo === "ferrite")).toBe(true);
  });

  it("accounts transformations without flagging material ID changes", () => {
    const { s } = line();
    s.step(120000);
    const save = s.serialize();
    // press-ferrite ran: 2 ferrite in, 6 plates out per batch.
    expect(save.flows.produced.plates ?? 0).toBeGreaterThan(0);
    expect(save.flows.consumed.ferrite ?? 0).toBeGreaterThan(0);
    expect((save.flows.produced.plates ?? 0) % 6).toBe(0);
    expect((save.flows.consumed.ferrite ?? 0) % 2).toBe(0);
    auditOk(s);
  });

  it("reconciles extraction, transit, processing and export end to end", () => {
    const { s } = line(withGranuleHandling(), true);
    s.step(30000);
    expect(s.serialize().flows.produced.granules ?? 0).toBeGreaterThan(0);
    auditOk(s);
    s.step(60000);
    const save = s.serialize();
    expect(save.exported).toBeGreaterThan(0);
    expect(save.flows.exported.granules ?? 0).toBe(save.exported);
    auditOk(s);
  });

  it("covers in-flight batches and output-full escrow mid-run", () => {
    const { s } = line();
    s.step(5355);
    expect(
      Object.values(s.serialize().machines).some((m) => m.job !== null),
    ).toBe(true);
    auditOk(s);
  });

  it("still reconciles historical discards from pre-removal saves", () => {
    const s = make();
    const id = build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    });
    s.step(10000);
    const save = s.serialize();
    const buffered = { ...save.machines[id].output };
    expect(Object.values(buffered).reduce((a, b) => a + b, 0)).toBeGreaterThan(
      0,
    );
    // Simulate a save written while discard existed: move buffered output
    // into the retired sink instead of deleting it.
    save.machines[id].output = {};
    for (const [material, n] of Object.entries(buffered))
      save.flows.discarded[material] = (save.flows.discarded[material] ?? 0) + n;
    const b = make();
    expect(b.load(JSON.parse(JSON.stringify(save))).ok).toBe(true);
    expect(b.serialize().flows.discarded).toEqual(buffered);
    auditOk(b);
  });

  it("keeps construction embodied plates audit-neutral across reclaim", () => {
    const s = make(),
      before = s.snapshot().stock.plates;
    const f = build(s, {
      type: "placeFactory",
      x: 24,
      y: 22,
      width: 10,
      height: 10,
    });
    const m = build(s, {
      type: "placeMachine",
      definitionId: "crusher",
      x: 27,
      y: 26,
      direction: 0,
    });
    auditOk(s);
    expect(s.command({ type: "dismantle", id: m }).ok).toBe(true);
    auditOk(s);
    expect(s.command({ type: "dismantle", id: f }).ok).toBe(true);
    expect(s.snapshot().stock.plates).toBe(before);
    auditOk(s);
  });

  it("preserves identical ledger totals across a save/load round trip", () => {
    const { s: a } = line();
    a.step(5355);
    const before = auditLedger(fixture, a.serialize());
    expect(before.ok).toBe(true);
    const b = make();
    expect(b.load(JSON.parse(JSON.stringify(a.serialize()))).ok).toBe(true);
    expect(b.serialize()).toEqual(a.serialize());
    expect(auditLedger(fixture, b.serialize())).toEqual(before);
  });

  it("detects and diagnoses silently created or removed material", () => {
    const { s } = line();
    s.step(20000);
    auditOk(s);
    const created = structuredClone(s.serialize());
    created.stock.plates += 5;
    const createdReport = auditLedger(fixture, created);
    expect(createdReport.ok).toBe(false);
    expect(createdReport.mismatches).toHaveLength(1);
    expect(createdReport.mismatches[0]).toMatchObject({
      material: "plates",
      delta: 5,
    });

    const removed = structuredClone(s.serialize());
    const loaded = Object.values(removed.belts).find((b) => b.cargo);
    expect(loaded?.cargo).toBeTruthy();
    const cargo = loaded!.cargo!;
    loaded!.cargo = null;
    const removedReport = auditLedger(fixture, removed);
    expect(removedReport.ok).toBe(false);
    expect(
      removedReport.mismatches.find((r) => r.material === cargo)?.delta,
    ).toBe(-1);
  });
});

describe("conservation load boundary", () => {
  it("rejects validation-passing saves with added material and keeps live state", () => {
    const { s } = line();
    s.step(20000);
    const before = s.serialize();
    const created = structuredClone(before);
    created.stock.plates += 5;
    expect(s.load(created).ok).toBe(false);
    expect(s.serialize()).toEqual(before);
  });

  it("rejects validation-passing saves with removed material and keeps live state", () => {
    const { s } = line();
    s.step(20000);
    const before = s.serialize();
    const removed = structuredClone(before);
    const loaded = Object.values(removed.belts).find((b) => b.cargo);
    expect(loaded?.cargo).toBeTruthy();
    loaded!.cargo = null;
    expect(s.load(removed).ok).toBe(false);
    expect(s.serialize()).toEqual(before);
  });

  it("rejects saves where the export total disagrees with ledger history", () => {
    const { s } = line(withGranuleHandling(), true);
    s.step(90000);
    const before = s.serialize();
    expect(before.exported).toBeGreaterThan(0);
    // Ledger itself still reconciles; only the duplicated total is wrong.
    expect(auditLedger(fixture, before).ok).toBe(true);
    const tampered = structuredClone(before);
    tampered.exported += 1;
    expect(s.load(tampered).ok).toBe(false);
    expect(s.serialize()).toEqual(before);
  });

  it("still round-trips a legitimate schema-3 save", () => {
    const { s: a } = line(make(), true);
    a.step(30000);
    const b = make();
    expect(b.load(JSON.parse(JSON.stringify(a.serialize()))).ok).toBe(true);
    expect(b.serialize()).toEqual(a.serialize());
    expect(auditLedger(fixture, b.serialize()).ok).toBe(true);
  });
});
