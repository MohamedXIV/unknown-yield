import { historicalFixture } from "./historical-content";
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
function withConfirmedKnowledge(reactionId: string) {
  const s = make(),
    save = s.serialize(),
    reaction = fixture.reactions.find((r) => r.id === reactionId)!;
  if (!save.knowledge.includes(reactionId)) save.knowledge.push(reactionId);
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
function line(
  s = make(),
  alien = false,
  heat = false,
  processorDefinitionId?: string,
) {
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
    definitionId: processorDefinitionId ?? (heat ? "furnace" : "crusher"),
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
describe("world construction", () => {
  it("starts with map, deposits and stock, no prebuilt machines", () => {
    const s = make().snapshot();
    expect(s.map.width).toBe(80);
    expect(s.map.height).toBe(60);
    expect(s.machines).toEqual([]);
    expect(s.stock.plates).toBeGreaterThan(0);
  });
  it("previews and invalid placements never mutate", () => {
    const s = make(),
      before = s.serialize();
    expect(
      s.preview({ type: "placeFactory", x: 24, y: 22, width: 10, height: 10 })
        .ok,
    ).toBe(true);
    for (const c of [
      {
        type: "placeMachine",
        definitionId: "extractor",
        x: 0,
        y: 0,
        direction: 0,
      },
      { type: "placeFactory", x: 79, y: 55, width: 8, height: 8 },
      { type: "placeFactory", x: 24, y: 22, width: 5, height: 8 },
      {
        type: "placeMachine",
        definitionId: "crusher",
        x: 24,
        y: 25,
        direction: 0,
      },
    ])
      expect(s.command(c).ok).toBe(false);
    expect(s.serialize()).toEqual(before);
  });
  it("multiple instances operate independently and cannot overlap", () => {
    const s = make();
    const a = build(s, {
        type: "placeMachine",
        definitionId: "extractor",
        x: 15,
        y: 25,
        direction: 0,
      }),
      b = build(s, {
        type: "placeMachine",
        definitionId: "extractor",
        x: 18,
        y: 28,
        direction: 1,
      });
    expect(a).not.toBe(b);
    expect(
      s.command({
        type: "placeMachine",
        definitionId: "extractor",
        x: 16,
        y: 26,
        direction: 0,
      }).ok,
    ).toBe(false);
    s.command({ type: "setEnabled", machineId: a, enabled: false });
    s.step(1000);
    expect(s.snapshot().machines.find((m) => m.id === a)?.job).toBeNull();
    expect(s.snapshot().machines.find((m) => m.id === b)?.job).not.toBeNull();
  });
  it("requires directional wall ports and cardinal paths atomically", () => {
    const s = make();
    const f = build(s, {
      type: "placeFactory",
      x: 24,
      y: 22,
      width: 10,
      height: 10,
    });
    const before = s.serialize();
    expect(s.command(path(23, 27, 26, 27)).ok).toBe(false);
    expect(s.serialize()).toEqual(before);
    expect(
      s.command({
        type: "placeBelts",
        points: [
          { x: 3, y: 3 },
          { x: 4, y: 4 },
        ],
        direction: 0,
      }).ok,
    ).toBe(false);
    expect(
      s.command({ type: "placePort", factoryId: f, x: 24, y: 27, direction: 1 })
        .ok,
    ).toBe(false);
    build(s, { type: "placePort", factoryId: f, x: 24, y: 27, direction: 0 });
    build(s, path(23, 27, 26, 27));
    expect(s.command(path(23, 27, 26, 27, 1)).ok).toBe(false);
  });
  it("refunds exact costs and refuses occupied factory removal", () => {
    const s = make(),
      before = s.snapshot().stock.plates;
    const f = build(s, {
        type: "placeFactory",
        x: 24,
        y: 22,
        width: 10,
        height: 10,
      }),
      m = build(s, {
        type: "placeMachine",
        definitionId: "crusher",
        x: 27,
        y: 26,
        direction: 0,
      });
    expect(s.command({ type: "dismantle", id: f }).ok).toBe(false);
    expect(s.command({ type: "dismantle", id: m }).ok).toBe(true);
    expect(s.command({ type: "dismantle", id: f }).ok).toBe(true);
    expect(s.snapshot().stock.plates).toBe(before);
  });
  it("rejects inherited IDs without throwing or mutation", () => {
    const s = make(),
      before = s.serialize();
    for (const id of ["__proto__", "constructor", "toString", "missing"])
      for (const c of [
        { type: "setEnabled", machineId: id, enabled: true },
        { type: "setOperation", machineId: id, operation: "crush" },
        { type: "dismantle", id },
      ])
        expect(s.command(c).ok).toBe(false);
    expect(s.serialize()).toEqual(before);
  });
});
describe("automatic industry", () => {
  it("produces local construction materials and builds expansion", () => {
    const { s } = line(),
      stock = s.snapshot().stock.plates;
    s.step(120000);
    expect(s.snapshot().stock.plates).toBeGreaterThan(stock);
    build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 28,
      direction: 0,
    });
  });
  it("reserves output and charges batches exactly once", () => {
    const s = make(),
      id = build(s, {
        type: "placeMachine",
        definitionId: "extractor",
        x: 15,
        y: 25,
        direction: 0,
      });
    s.step(100);
    const fuel = s.snapshot().fuel;
    s.step(500);
    expect(s.snapshot().fuel).toBe(fuel);
    const before = s.serialize();
    expect(s.command({ type: "dismantle", id }).ok).toBe(false);
    expect(s.serialize()).toEqual(before);
    s.step(30000);
    const blocked = s.snapshot();
    s.step(10000);
    expect(s.snapshot().fuel).toBe(blocked.fuel);
    expect(s.snapshot().machines[0].status).toBe("output-full");
    expect(
      Object.values(s.snapshot().machines[0].output).reduce((a, b) => a + b, 0),
    ).toBeGreaterThan(0);
    s.command({ type: "setEnabled", machineId: id, enabled: false });
    // Buffered output blocks reclaim without moving anything implicitly.
    const refused = s.serialize();
    expect(s.command({ type: "dismantle", id }).ok).toBe(false);
    expect(s.serialize()).toEqual(refused);
    expect(s.snapshot().stock.ferrite).toBeUndefined();
    expect(s.snapshot().staging).toEqual({});
  });
  it("cargo moves at most one belt edge per update; loaded belts are not silently reclaimed", () => {
    const s = make();
    build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    });
    build(s, path(17, 26, 22, 26));
    s.step(2200);
    const loaded = s.snapshot().belts.filter((b) => b.cargo);
    expect(loaded.length).toBeGreaterThan(0);
    expect(loaded.every((b) => b.x < 20)).toBe(true);
    // Loaded non-construction cargo blocks belt removal; nothing vanishes
    // and nothing teleports to staging.
    const before = s.serialize();
    expect(s.command({ type: "dismantle", id: loaded[0].id }).ok).toBe(false);
    expect(s.serialize()).toEqual(before);
    expect(s.snapshot().staging).toEqual({});
    // An empty belt still reclaims its exact build cost.
    const empty = s.snapshot().belts.find((b) => !b.cargo)!;
    const plates = s.snapshot().stock.plates;
    expect(s.command({ type: "dismantle", id: empty.id }).ok).toBe(true);
    expect(s.snapshot().stock.plates).toBe(plates + 1);
  });
  it("keeps discovered granules staged while terminal handling is locked", () => {
    const s = make(),
      initial = JSON.stringify(s.snapshot());
    expect(initial).not.toContain("Conductive granules");
    expect(initial).not.toContain("crush-raw");
    const { processor } = line(s, true);

    s.step(60000);
    expect(
      s.snapshot().observations.some((o) => o.outputId === "granules"),
    ).toBe(true);
    expect(s.snapshot().exported).toBe(0);
    expect(s.snapshot().staging.granules ?? 0).toBeGreaterThan(0);
    expect(
      s.snapshot().exchange.find((entry) => entry.materialId === "granules")
        ?.handling?.unlocked,
    ).toBe(false);
    expect(s.snapshot().machines.find((m) => m.id === processor)?.enabled).toBe(
      true,
    );
  });

  it("confirms the sealed trial through normal commands and then exports", () => {
    const { s } = line(make(), true, true, "sealed-furnace");

    for (
      let ticks = 0;
      ticks < 500 && !s.serialize().knowledge.includes("heat-raw-sealed");
      ticks++
    )
      s.step(100);

    expect(s.serialize().knowledge).toContain("heat-raw-sealed");
    expect(
      s
        .snapshot()
        .milestones.find((entry) => entry.id === "sealed-study-certified")
        ?.completed,
    ).toBe(true);
    expect(
      s.snapshot().exchange.find((entry) => entry.materialId === "granules")
        ?.handling?.unlocked,
    ).toBe(true);
    expect(s.snapshot().exported).toBe(0);

    build(s, path(29, 37, 37, 37, 3));
    build(s, path(37, 36, 37, 28, 0));
    s.step(30000);

    expect(s.snapshot().exported).toBeGreaterThan(0);
    expect(s.snapshot().milestone).toBe(true);
  });

  it("retains waste with an informative failed heat observation", () => {
    const { s, processor } = line(make(), true, true);
    s.step(20000);
    expect(
      s
        .snapshot()
        .observations.some(
          (o) => o.textKey === "reaction.heat-raw.observation",
        ),
    ).toBe(true);
    expect(
      s.snapshot().machines.find((m) => m.id === processor)?.output.residue,
    ).toBeGreaterThan(0);
  });
  it("resolves hidden heat outcomes from exact machine conditions across save/load", () => {
    for (const [definitionId, reactionId, outputId] of [
      ["furnace", "heat-raw", "residue"],
      ["sealed-furnace", "heat-raw-sealed", "granules"],
    ]) {
      const { s, processor } = line(make(), true, true, definitionId);
      const before = JSON.stringify(s.snapshot());
      expect(before).not.toContain(reactionId);
      expect(before).not.toContain(`"outputId":"${outputId}"`);

      for (
        let ticks = 0;
        ticks < 200 && !s.serialize().machines[processor].job;
        ticks++
      )
        s.step(100);
      const save = s.serialize();
      expect(save.machines[processor].definitionId).toBe(definitionId);
      expect(save.machines[processor].job?.reaction).toBe(reactionId);
      expect(save.knowledge).not.toContain(reactionId);
      expect(save.schemaVersion).toBe(24);
      expect(save.contentVersion).toBe("world-01-v13");

      const restored = make(),
        repeated = make();
      expect(restored.load(JSON.parse(JSON.stringify(save))).ok).toBe(true);
      expect(repeated.load(JSON.parse(JSON.stringify(save))).ok).toBe(true);
      restored.step(3500);
      repeated.step(3500);
      expect(repeated.serialize()).toEqual(restored.serialize());

      const machine = restored
        .snapshot()
        .machines.find((m) => m.id === processor)!;
      expect(machine.output[outputId]).toBeGreaterThan(0);
      expect(
        restored
          .snapshot()
          .observations.some(
            (observation) => observation.outputId === outputId,
          ),
      ).toBe(true);
      expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
    }
  });
  it("persists hinted evidence without leaking output and promotes it once on completion", () => {
    const { s, processor } = line(make(), true, true, "furnace");
    for (
      let ticks = 0;
      ticks < 200 && !s.serialize().machines[processor].job;
      ticks++
    )
      s.step(100);

    const hinted = s
      .snapshot()
      .knowledgeEntries.find(
        (entry) =>
          entry.operationId === "heat" &&
          entry.inputId === "raw" &&
          entry.state === "hinted",
      );
    expect(hinted).toMatchObject({
      state: "hinted",
      operationId: "heat",
      inputId: "raw",
      setupNameKey: "machine.furnace.name",
      initial: false,
    });
    expect(hinted).not.toHaveProperty("outputId");
    expect(hinted).not.toHaveProperty("textKey");
    expect(JSON.stringify(hinted)).not.toContain("residue");
    expect(JSON.stringify(hinted)).not.toContain("reaction.heat-raw");

    const saved = s.serialize();
    expect(saved.schemaVersion).toBe(24);
    expect(saved.evidence[hinted!.id].state).toBe("hinted");

    const restored = make();
    expect(restored.load(JSON.parse(JSON.stringify(saved))).ok).toBe(true);
    expect(
      restored
        .snapshot()
        .knowledgeEntries.find((entry) => entry.id === hinted!.id)?.state,
    ).toBe("hinted");

    restored.step(3500);
    const confirmed = restored
      .snapshot()
      .knowledgeEntries.find((entry) => entry.id === hinted!.id)!;
    expect(confirmed).toMatchObject({
      state: "confirmed",
      outputId: "residue",
      textKey: "reaction.heat-raw.observation",
    });
    expect(restored.serialize().evidence[hinted!.id].state).toBe("confirmed");
    expect(
      restored
        .snapshot()
        .knowledgeEntries.filter((entry) => entry.id === hinted!.id),
    ).toHaveLength(1);

    const confirmedSave = restored.serialize();
    const reloaded = make();
    expect(reloaded.load(JSON.parse(JSON.stringify(confirmedSave))).ok).toBe(
      true,
    );
    expect(
      reloaded
        .snapshot()
        .knowledgeEntries.find((entry) => entry.id === hinted!.id),
    ).toMatchObject({
      state: "confirmed",
      outputId: "residue",
      textKey: "reaction.heat-raw.observation",
    });

    restored.step(10000);
    expect(
      restored
        .snapshot()
        .knowledgeEntries.filter((entry) => entry.id === hinted!.id),
    ).toHaveLength(1);
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
  });

  it("migrates schema-5 knowledge and active experiments into evidence", () => {
    const { s, processor } = line(
      new Simulation(historicalFixture),
      true,
      true,
      "sealed-furnace",
    );
    for (
      let ticks = 0;
      ticks < 200 && !s.serialize().machines[processor].job;
      ticks++
    )
      s.step(100);

    const legacy = JSON.parse(JSON.stringify(s.serialize()));
    legacy.schemaVersion = 5;
    legacy.contentVersion = historicalFixture.version;
    delete legacy.evidence;
    for (const machine of Object.values(legacy.machines) as Array<
      Record<string, unknown>
    >)
      delete machine.incident;

    const restored = new Simulation(historicalFixture);
    expect(restored.load(legacy).ok).toBe(true);
    expect(restored.serialize().schemaVersion).toBe(24);
    const hinted = restored
      .snapshot()
      .knowledgeEntries.find(
        (entry) =>
          entry.operationId === "heat" &&
          entry.inputId === "raw" &&
          entry.state === "hinted",
      );
    expect(hinted).toMatchObject({
      setupNameKey: "machine.sealed-furnace.name",
    });
    expect(hinted).not.toHaveProperty("outputId");
    expect(hinted).not.toHaveProperty("textKey");
  });

  it("unlocks the oversealed furnace only after confirmed sealed-Heat knowledge and preserves it across reload", () => {
    const fresh = make();
    const initialCapability = fresh
      .snapshot()
      .definitions.find((d) => d.id === "oversealed-furnace")!;
    expect(initialCapability.unlock).toEqual({
      unlocked: false,
      hintKey: "machine.oversealed-furnace.unlock-hint",
    });
    expect(JSON.stringify(initialCapability)).not.toContain("heat-raw-sealed");
    expect(
      fresh.command({
        type: "placeMachine",
        definitionId: "oversealed-furnace",
        x: 27,
        y: 26,
        direction: 0,
      }),
    ).toMatchObject({
      ok: false,
      message: "Capability locked by unconfirmed knowledge",
    });
    expect(fresh.serialize().stock.plates).toBeGreaterThan(30);
    expect(fresh.serialize().fuel).toBeGreaterThan(0);

    const { s, factory } = line(make(), true, true, "sealed-furnace");
    for (
      let ticks = 0;
      ticks < 500 && !s.serialize().knowledge.includes("heat-raw-sealed");
      ticks++
    )
      s.step(100);
    expect(s.serialize().knowledge).toContain("heat-raw-sealed");
    expect(
      s.snapshot().definitions.find((d) => d.id === "oversealed-furnace")
        ?.unlock,
    ).toEqual({
      unlocked: true,
      hintKey: "machine.oversealed-furnace.unlock-hint",
    });

    const unlocked = s.command({
      type: "placeMachine",
      definitionId: "oversealed-furnace",
      x: 30,
      y: 36,
      direction: 0,
    });
    expect(unlocked.ok, unlocked.message).toBe(true);
    expect(s.serialize().machines[unlocked.id!]).toMatchObject({
      definitionId: "oversealed-furnace",
      factoryId: factory,
    });

    const saved = s.serialize(),
      restored = make();
    expect(restored.load(JSON.parse(JSON.stringify(saved))).ok).toBe(true);
    expect(
      restored.snapshot().definitions.find((d) => d.id === "oversealed-furnace")
        ?.unlock,
    ).toEqual({
      unlocked: true,
      hintKey: "machine.oversealed-furnace.unlock-hint",
    });
    expect(
      restored.preview({
        type: "placeMachine",
        definitionId: "oversealed-furnace",
        x: 30,
        y: 39,
        direction: 0,
      }).ok,
    ).toBe(true);
  });

  it("triggers an explainable oversealed blowout, preserves material, and recovers explicitly", () => {
    const { s, processor } = line(
      withConfirmedKnowledge("heat-raw-sealed"),
      true,
      true,
      "oversealed-furnace",
    );

    let sawActiveBatch = false;
    for (
      let ticks = 0;
      ticks < 500 && !s.serialize().machines[processor].incident;
      ticks++
    ) {
      s.step(100);
      if (
        s.serialize().machines[processor].job &&
        !s.serialize().machines[processor].incident
      ) {
        sawActiveBatch = true;
        const hidden = JSON.stringify(s.snapshot());
        expect(hidden).not.toContain("chamber-blowout");
        expect(hidden).not.toContain("hazard.chamber-blowout");
      }
    }
    expect(sawActiveBatch).toBe(true);

    const incidentSave = s.serialize();
    const machine = incidentSave.machines[processor];
    expect(machine).toMatchObject({
      definitionId: "oversealed-furnace",
      enabled: false,
      incident: "chamber-blowout",
      job: null,
    });
    expect(machine.output.residue).toBeGreaterThan(0);
    expect(s.snapshot().machines.find((m) => m.id === processor)).toMatchObject(
      {
        status: "incident",
        incident: {
          nameKey: "hazard.chamber-blowout.name",
          textKey: "hazard.chamber-blowout.observation",
        },
      },
    );
    expect(
      s
        .snapshot()
        .knowledgeEntries.some(
          (entry) =>
            entry.state === "confirmed" &&
            entry.operationId === "heat" &&
            entry.inputId === "raw" &&
            entry.setupNameKey === "machine.oversealed-furnace.name" &&
            entry.outputId === "residue",
        ),
    ).toBe(true);
    expect(auditLedger(fixture, incidentSave).ok).toBe(true);

    const restored = make();
    expect(restored.load(JSON.parse(JSON.stringify(incidentSave))).ok).toBe(
      true,
    );
    expect(restored.serialize()).toEqual(incidentSave);
    expect(
      restored.snapshot().machines.find((m) => m.id === processor)?.status,
    ).toBe("incident");

    for (const sim of [s, restored]) {
      const recovery = sim.command({
        type: "setEnabled",
        machineId: processor,
        enabled: true,
      });
      expect(recovery).toMatchObject({
        ok: true,
        message: "Incident acknowledged; automatic operation enabled",
      });
      expect(sim.serialize().machines[processor]).toMatchObject({
        enabled: true,
        incident: null,
      });
    }
    s.step(5000);
    restored.step(5000);
    expect(restored.serialize()).toEqual(s.serialize());
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);

    const safe = line(make(), true, true, "sealed-furnace");
    for (
      let ticks = 0;
      ticks < 500 && !safe.s.serialize().knowledge.includes("heat-raw-sealed");
      ticks++
    )
      safe.s.step(100);
    expect(safe.s.serialize().machines[safe.processor].incident).toBeNull();
    expect(
      safe.s.snapshot().machines.find((m) => m.id === safe.processor)?.status,
    ).not.toBe("incident");
    expect(auditLedger(fixture, safe.s.serialize()).ok).toBe(true);

    const repeated = line(
      withConfirmedKnowledge("heat-raw-sealed"),
      true,
      true,
      "oversealed-furnace",
    );
    for (
      let ticks = 0;
      ticks < 500 &&
      !repeated.s.serialize().machines[repeated.processor].incident;
      ticks++
    )
      repeated.s.step(100);
    expect(repeated.s.serialize().machines[repeated.processor].incident).toBe(
      "chamber-blowout",
    );
  });

  it("migrates schema-6 machines with no incident through schema 11", () => {
    const s = new Simulation(historicalFixture);
    const machineId = build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    });
    const legacy = JSON.parse(JSON.stringify(s.serialize()));
    legacy.schemaVersion = 6;
    legacy.contentVersion = historicalFixture.version;
    delete legacy.machines[machineId].incident;

    const restored = new Simulation(historicalFixture);
    expect(restored.load(legacy).ok).toBe(true);
    expect(restored.serialize().schemaVersion).toBe(24);
    expect(restored.serialize().machines[machineId].incident).toBeNull();
  });

  it("provides recovery but rejects consecutive grants", () => {
    const c = structuredClone(fixture);
    c.economy.startFuel = 0;
    const s = new Simulation(c);
    expect(s.command({ type: "assistance" }).ok).toBe(true);
    expect(s.command({ type: "assistance" }).ok).toBe(false);
    expect(s.snapshot().debt).toBe(
      c.economy.assistancePackages[0].baseObligationFuel,
    );
    expect(s.snapshot().company).toMatchObject({
      standing: "recovery",
      interventionStreak: 1,
    });
  });
});
describe("save boundary", () => {
  it("continues jobs, cargo and fractional ticks identically", () => {
    const { s: a } = line();
    a.step(5355);
    const b = make();
    expect(b.load(JSON.parse(JSON.stringify(a.serialize()))).ok).toBe(true);
    a.step(11245);
    b.step(10000);
    b.step(1245);
    expect(b.serialize()).toEqual(a.serialize());
  });
  it("rejects old versions, impossible output and topology atomically", () => {
    const { s, processor } = line(),
      before = s.serialize();
    const cases = [
      { ...before, schemaVersion: 1 },
      { ...before, fuel: -1 },
      { ...before, contentVersion: "other" },
      { ...before, remainder: 9999 },
    ];
    const wrong = structuredClone(before);
    wrong.machines[processor].output.ferrite = 1;
    cases.push(wrong);
    const moved = structuredClone(before);
    moved.machines[processor].x = 0;
    cases.push(moved);
    for (const save of cases) {
      expect(s.load(save).ok).toBe(false);
      expect(s.serialize()).toEqual(before);
    }
  });
  it("rejects saves from the previous content version without replacing state", () => {
    const s = make(),
      before = s.serialize();
    expect(s.load({ ...before, contentVersion: "world-01-v4" }).ok).toBe(false);
    expect(s.serialize()).toEqual(before);
  });
  it("rejects invalid time and prevents snapshot mutation", () => {
    const s = make(),
      before = s.serialize();
    for (const dt of [-1, NaN, Infinity]) expect(() => s.step(dt)).toThrow();
    s.snapshot().stock.plates = 999;
    expect(s.serialize()).toEqual(before);
  });
});

describe("world acceptance regressions", () => {
  it("funds both lines and expands entirely through normal commands", () => {
    const s = withConfirmedKnowledge("heat-raw-sealed");
    line(s);
    line(s, true);
    const afterBuild = s.snapshot().stock.plates;
    expect(afterBuild).toBeGreaterThan(0);
    s.step(120000);
    expect(s.snapshot().stock.plates - afterBuild).toBeGreaterThanOrEqual(18);
    expect(s.snapshot().exported).toBeGreaterThan(0);
    expect(s.snapshot().fuel).toBeGreaterThan(0);
    build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 28,
      direction: 1,
    });
  });
  it("rejects unaffordable construction and whole belt paths without charging", () => {
    const c = structuredClone(fixture);
    c.site.startStock = 2;
    const s = new Simulation(c),
      before = s.serialize();
    expect(
      s.command({ type: "placeFactory", x: 24, y: 22, width: 6, height: 6 }).ok,
    ).toBe(false);
    expect(s.command(path(2, 2, 5, 2)).ok).toBe(false);
    expect(s.serialize()).toEqual(before);
  });
  it("rotates rectangular footprints and input/output sockets", () => {
    const c = structuredClone(fixture);
    c.machines.find((m) => m.id === "extractor")!.width = 3;
    const s = new Simulation(c);
    build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 1,
    });
    expect(s.snapshot().machines[0]).toMatchObject({ width: 2, height: 3 });
    build(s, path(16, 28, 16, 30, 1));
    s.step(2400);
    expect(s.snapshot().belts.some((b) => b.cargo === "ferrite")).toBe(true);
  });
  it("propagates blockage and conserves extracted material across occupied cells", () => {
    const s = make();
    build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    });
    build(s, path(17, 26, 20, 26));
    s.step(60000);
    const before = s.serialize();
    const extracted =
      fixture.site.deposits[0].units - before.deposits["ferrite-field"];
    const stored =
      Object.values(before.machines).reduce(
        (n, m) =>
          n +
          Object.values(m.output).reduce((a, b) => a + b, 0) +
          (m.job ? 1 : 0),
        0,
      ) + Object.values(before.belts).filter((b) => b.cargo).length;
    expect(stored).toBe(extracted);
    expect(s.snapshot().belts.every((b) => b.cargo === "ferrite")).toBe(true);
    s.step(10000);
    expect(s.snapshot().fuel).toBe(before.fuel);
    expect(s.serialize().deposits).toEqual(before.deposits);
  });
  it("exports repay emergency debt before replenishing fuel", () => {
    const c = structuredClone(fixture);
    c.economy.startFuel = 0;
    const s = new Simulation(c),
      save = s.serialize(),
      reaction = c.reactions.find((entry) => entry.id === "heat-raw-sealed")!;
    save.knowledge.push(reaction.id);
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
    initializeKnownMarkets(c, save);
    expect(s.load(save).ok).toBe(true);
    line(s, true);
    build(s, { type: "assistance" });
    s.step(90000);
    expect(s.snapshot().debt).toBe(0);
    expect(s.snapshot().fuel).toBeGreaterThan(0);
    expect(s.snapshot().exported).toBeGreaterThan(3);
  });
  it("reports all simultaneous discoveries at their producing machines and derives batch time", () => {
    const c = structuredClone(fixture);
    c.tickMs = 200;
    const s = new Simulation(c);
    const factory = build(s, {
      type: "placeFactory",
      x: 24,
      y: 33,
      width: 10,
      height: 10,
    });
    for (const [x, y] of [
      [24, 37],
      [33, 37],
      [24, 38],
    ])
      build(s, { type: "placePort", factoryId: factory, x, y, direction: 0 });
    build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 18,
      y: 36,
      direction: 0,
    });
    const crusher = build(s, {
      type: "placeMachine",
      definitionId: "crusher",
      x: 27,
      y: 36,
      direction: 0,
    });
    const furnace = build(s, {
      type: "placeMachine",
      definitionId: "furnace",
      x: 30,
      y: 36,
      direction: 0,
    });
    build(s, path(20, 37, 26, 37));
    build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 35,
      direction: 0,
    });
    // Both processors are belt-fed from dedicated extractors so every input
    // unit arrives through real transport instead of fabricated inventory.
    build(s, {
      type: "placeBelts",
      points: [
        { x: 17, y: 36 },
        { x: 17, y: 37 },
        { x: 17, y: 38 },
        { x: 18, y: 38 },
        { x: 19, y: 38 },
        { x: 20, y: 38 },
        { x: 21, y: 38 },
        { x: 22, y: 38 },
        { x: 23, y: 38 },
        { x: 24, y: 38 },
        { x: 25, y: 38 },
        { x: 26, y: 38 },
        { x: 27, y: 38 },
        { x: 28, y: 38 },
        { x: 29, y: 38 },
        { x: 29, y: 37 },
      ],
      direction: 0,
    });
    expect(s.snapshot().observations).not.toContainEqual(
      expect.objectContaining({ outputId: "residue" }),
    );
    s.step(60000);
    const observed = s.snapshot().observations.filter((o) => !o.initial);
    expect(observed).toHaveLength(2);
    expect(observed.map((o) => o.observedAt)).toEqual(
      expect.arrayContaining([
        { x: 27, y: 36 },
        { x: 30, y: 36 },
      ]),
    );
    expect(
      s.snapshot().machines.find((m) => m.id === crusher)?.durationMs,
    ).toBe(6000);
    expect(
      s.snapshot().machines.find((m) => m.id === furnace)?.durationMs,
    ).toBe(6000);
  });
  it("rejects incompatible active batches, undiscovered cargo and overfull buffers atomically", () => {
    const { s, processor } = line();
    s.step(5300);
    const before = s.serialize();
    const job = structuredClone(before);
    job.machines[processor].job = { remaining: 1, reaction: "heat-raw" };
    const cargo = structuredClone(before);
    Object.values(cargo.belts)[0].cargo = "granules";
    const full = structuredClone(before);
    full.machines[processor].input.ferrite = 100;
    const reserved = structuredClone(before);
    reserved.machines[processor].output.plates = 12;
    reserved.machines[processor].job = {
      remaining: 1,
      reaction: "press-ferrite",
    };
    for (const invalid of [job, cargo, full, reserved]) {
      expect(s.load(invalid).ok).toBe(false);
      expect(s.serialize()).toEqual(before);
    }
  });
});
