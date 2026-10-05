import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  experimentEvidenceKey,
  initializeKnownMarkets,
  type GameCommand,
} from "../src/index";

function build(s: Simulation, command: GameCommand) {
  const result = s.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
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

function heatLine(definitionId: "furnace" | "sealed-furnace" | "oversealed-furnace") {
  const s = new Simulation(fixture);
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
  const processor = build(s, {
    type: "placeMachine",
    definitionId,
    x: 27,
    y: 36,
    direction: 0,
  });
  build(s, path(20, 37, 26, 37));
  return { s, processor };
}

function confirmedKnowledge(reactionId: string) {
  const s = new Simulation(fixture),
    save = s.serialize(),
    reaction = fixture.reactions.find((r) => r.id === reactionId)!;
  save.knowledge.push(reactionId);
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

function auditOk(s: Simulation) {
  const report = auditLedger(fixture, s.serialize());
  expect(report.mismatches).toEqual([]);
  expect(report.ok).toBe(true);
}

describe("Phase 2 experimentation/discovery exit gate", () => {
  it("keeps authored truth hidden through a partial experiment and preserves evidence across save/load", () => {
    const { s, processor } = heatLine("furnace");
    const before = JSON.stringify(s.snapshot());
    expect(before).not.toContain("heat-raw");
    expect(before).not.toContain('"outputId":"residue"');

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
          entry.setupNameKey === "machine.furnace.name",
      );
    expect(hinted).toMatchObject({
      state: "hinted",
      initial: false,
      operationId: "heat",
      inputId: "raw",
    });
    expect(hinted).not.toHaveProperty("outputId");
    expect(hinted).not.toHaveProperty("textKey");
    expect(JSON.stringify(hinted)).not.toContain("residue");
    expect(s.serialize().knowledge).not.toContain("heat-raw");
    auditOk(s);

    const partial = s.serialize(),
      restored = new Simulation(fixture);
    expect(restored.load(JSON.parse(JSON.stringify(partial))).ok).toBe(true);
    expect(restored.serialize()).toEqual(partial);
    expect(
      restored
        .snapshot()
        .knowledgeEntries.find((entry) => entry.id === hinted!.id),
    ).toMatchObject({ state: "hinted" });
    auditOk(restored);

    s.step(3500);
    restored.step(3500);
    expect(restored.serialize()).toEqual(s.serialize());
    expect(restored.serialize().knowledge).toContain("heat-raw");
    expect(
      restored.snapshot().observations,
    ).toContainEqual(
      expect.objectContaining({
        operationId: "heat",
        inputId: "raw",
        outputId: "residue",
      }),
    );
    expect(restored.serialize().machines[processor].output.residue).toBeGreaterThan(
      0,
    );
    auditOk(restored);
  });

  it("changes one explicit condition into a different deterministic result and unlocks the knowledge-gated capability", () => {
    const ambient = heatLine("furnace"),
      sealed = heatLine("sealed-furnace");

    for (
      let ticks = 0;
      ticks < 500 &&
      (!ambient.s.serialize().knowledge.includes("heat-raw") ||
        !sealed.s.serialize().knowledge.includes("heat-raw-sealed"));
      ticks++
    ) {
      ambient.s.step(100);
      sealed.s.step(100);
    }

    expect(ambient.s.serialize().knowledge).toContain("heat-raw");
    expect(sealed.s.serialize().knowledge).toContain("heat-raw-sealed");
    expect(
      ambient.s.serialize().machines[ambient.processor].output.residue,
    ).toBeGreaterThan(0);
    expect(
      sealed.s.serialize().machines[sealed.processor].output.granules,
    ).toBeGreaterThan(0);
    expect(
      ambient.s.snapshot().definitions.find((d) => d.id === "oversealed-furnace")
        ?.unlock,
    ).toMatchObject({ unlocked: false });
    expect(
      sealed.s.snapshot().definitions.find((d) => d.id === "oversealed-furnace")
        ?.unlock,
    ).toEqual({
      unlocked: true,
      hintKey: "machine.oversealed-furnace.unlock-hint",
    });
    expect(
      JSON.stringify(
        sealed.s.snapshot().definitions.find(
          (d) => d.id === "oversealed-furnace",
        ),
      ),
    ).not.toContain("heat-raw-sealed");
    auditOk(ambient.s);
    auditOk(sealed.s);

    const saved = sealed.s.serialize(),
      restored = new Simulation(fixture);
    expect(restored.load(JSON.parse(JSON.stringify(saved))).ok).toBe(true);
    expect(
      restored
        .snapshot()
        .definitions.find((d) => d.id === "oversealed-furnace")?.unlock,
    ).toMatchObject({ unlocked: true });
    auditOk(restored);
  });

  it("persists the explainable hazardous consequence and recovers the same physical machine without violating conservation", () => {
    const s = confirmedKnowledge("heat-raw-sealed");
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
    const processor = build(s, {
      type: "placeMachine",
      definitionId: "oversealed-furnace",
      x: 27,
      y: 36,
      direction: 0,
    });
    build(s, path(20, 37, 26, 37));

    for (
      let ticks = 0;
      ticks < 200 && !s.serialize().machines[processor].job;
      ticks++
    )
      s.step(100);
    expect(s.serialize().machines[processor].job).not.toBeNull();
    const beforeIncident = JSON.stringify(s.snapshot());
    expect(beforeIncident).not.toContain("chamber-blowout");
    expect(beforeIncident).not.toContain("hazard.chamber-blowout");

    for (
      let ticks = 0;
      ticks < 500 && !s.serialize().machines[processor].incident;
      ticks++
    )
      s.step(100);

    const incident = s.serialize();
    expect(incident.machines[processor]).toMatchObject({
      id: processor,
      definitionId: "oversealed-furnace",
      enabled: false,
      incident: "chamber-blowout",
      job: null,
    });
    expect(incident.machines[processor].output.residue).toBeGreaterThan(0);
    expect(
      s.snapshot().machines.find((machine) => machine.id === processor),
    ).toMatchObject({
      status: "incident",
      incident: {
        classId: "pressure-expansion",
        classNameKey: "hazard.class.pressure-expansion.name",
        nameKey: "hazard.chamber-blowout.name",
        textKey: "hazard.chamber-blowout.observation",
      },
    });
    auditOk(s);

    const restored = new Simulation(fixture);
    expect(restored.load(JSON.parse(JSON.stringify(incident))).ok).toBe(true);
    expect(restored.serialize()).toEqual(incident);
    expect(
      restored.snapshot().machines.find((machine) => machine.id === processor),
    ).toMatchObject({ status: "incident" });
    auditOk(restored);

    expect(
      restored.command({
        type: "setEnabled",
        machineId: processor,
        enabled: true,
      }),
    ).toMatchObject({
      ok: true,
      message: "Incident acknowledged; automatic operation enabled",
    });
    expect(restored.serialize().machines[processor]).toMatchObject({
      id: processor,
      enabled: true,
      incident: null,
    });
    auditOk(restored);
  });
});
