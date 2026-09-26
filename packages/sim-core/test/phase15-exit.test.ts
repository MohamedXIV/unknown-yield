import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import { Simulation, auditLedger, type GameCommand } from "../src/index";

function build(s: Simulation, command: GameCommand) {
  const result = s.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

function path(
  x: number,
  y: number,
  endX: number,
  endY: number,
  direction = 0,
) {
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

const total = (inventory: Record<string, number>) =>
  Object.values(inventory).reduce((sum, amount) => sum + amount, 0);

function auditOk(s: Simulation) {
  const report = auditLedger(fixture, s.serialize());
  expect(report.mismatches).toEqual([]);
  expect(report.ok).toBe(true);
}

function buildExitWorld() {
  const s = new Simulation(fixture);

  const factoryA = build(s, {
    type: "placeFactory",
    x: 24,
    y: 22,
    width: 10,
    height: 10,
  });
  build(s, {
    type: "placePort",
    factoryId: factoryA,
    x: 33,
    y: 27,
    direction: 0,
  });
  build(s, {
    type: "placePort",
    factoryId: factoryA,
    x: 26,
    y: 31,
    direction: 3,
  });

  const factoryB = build(s, {
    type: "placeFactory",
    x: 24,
    y: 33,
    width: 10,
    height: 10,
  });
  build(s, {
    type: "placePort",
    factoryId: factoryB,
    x: 24,
    y: 37,
    direction: 0,
  });
  build(s, {
    type: "placePort",
    factoryId: factoryB,
    x: 33,
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
  const lineA = build(s, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 26,
    direction: 0,
  });
  const lineB = build(s, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 36,
    direction: 0,
  });

  // Shared feed: primary east into B, alternate north into A.
  build(s, path(20, 37, 26, 37));
  build(s, {
    type: "placeBelts",
    points: [
      { x: 23, y: 36 },
      { x: 23, y: 35 },
      { x: 23, y: 34 },
      { x: 23, y: 33 },
      { x: 23, y: 32 },
      { x: 24, y: 32 },
      { x: 25, y: 32 },
      { x: 26, y: 32 },
      { x: 26, y: 31 },
      { x: 26, y: 30 },
      { x: 26, y: 29 },
      { x: 26, y: 28 },
      { x: 26, y: 27 },
    ],
    direction: 0,
  });

  // A exports through terminal staging.
  build(s, path(29, 27, 37, 28, 0));

  // B produces into physical storage.
  const depot = build(s, {
    type: "placeStorage",
    definitionId: "depot",
    x: 35,
    y: 45,
    direction: 0,
  });
  build(s, path(29, 37, 34, 46, 0));

  return { s, lineA, lineB, depot };
}

describe("Phase 1.5 exit gate", () => {
  it("preserves physical inventory through storage, suspend, reroute, export, save/load and resume", () => {
    const { s, lineA, lineB, depot } = buildExitWorld();

    // Run the primary B route until discovered product physically reaches storage.
    for (let i = 0; i < 80 && total(s.serialize().storages[depot].inventory) === 0; i++)
      s.step(500);
    expect(total(s.serialize().storages[depot].inventory)).toBeGreaterThan(0);
    expect(
      s.snapshot().observations.some((o) => o.outputId === "granules"),
    ).toBe(true);
    expect(
      s.command({ type: "setPolicy", materialId: "granules", policy: "keep" })
        .ok,
    ).toBe(true);
    auditOk(s);

    // Find a real old-route unit already past the diverter, then suspend B and
    // reroute immediately. That cargo must still reach B; future feed goes A.
    const hasOldRouteCargo = () =>
      Object.values(s.serialize().belts).some(
        (b) => b.y === 37 && b.x > 23 && b.x <= 26 && b.cargo === "raw",
      );
    for (
      let i = 0;
      i < 160 &&
      (s.serialize().machines[lineB].job !== null || !hasOldRouteCargo());
      i++
    )
      s.step(100);

    const beforeReroute = s.serialize();
    expect(beforeReroute.machines[lineB].job).toBeNull();
    expect(hasOldRouteCargo()).toBe(true);
    const oldRouteUnits = Object.values(beforeReroute.belts).filter(
      (b) => b.y === 37 && b.x > 23 && b.x <= 26 && b.cargo === "raw",
    ).length;
    const lineBInputBefore = beforeReroute.machines[lineB].input.raw ?? 0;
    const diverter = Object.values(beforeReroute.belts).find(
      (b) => b.x === 23 && b.y === 37,
    )!.id;

    expect(
      s.command({ type: "setEnabled", machineId: lineB, enabled: false }).ok,
    ).toBe(true);
    for (let i = 0; i < 3; i++)
      expect(s.command({ type: "rotateDivert", beltId: diverter }).ok).toBe(
        true,
      );
    expect(s.command({ type: "switchDivert", beltId: diverter }).ok).toBe(true);

    const oldInputBeltsClear = () =>
      Object.values(s.serialize().belts)
        .filter((b) => b.y === 37 && b.x > 23 && b.x <= 26)
        .every((b) => b.cargo === null);
    const lineAActive = () => {
      const m = s.serialize().machines[lineA];
      return (m.input.raw ?? 0) > 0 || m.job !== null;
    };
    for (
      let i = 0;
      i < 600 && (!oldInputBeltsClear() || !lineAActive());
      i++
    ) {
      s.step(100);
      auditOk(s);
    }

    const rerouted = s.serialize();
    expect(rerouted.machines[lineB].enabled).toBe(false);
    expect(rerouted.machines[lineB].input.raw).toBe(
      lineBInputBefore + oldRouteUnits,
    );
    expect(lineAActive()).toBe(true);
    expect(total(rerouted.storages[depot].inventory)).toBeGreaterThan(0);
    auditOk(s);

    // A now reaches terminal staging. Export some, then Keep again so the
    // save point contains real staged material as well as storage/buffers/belts.
    for (let i = 0; i < 100 && total(s.serialize().staging) === 0; i++)
      s.step(500);
    expect(total(s.serialize().staging)).toBeGreaterThan(0);

    const exportedBefore = s.serialize().exported;
    expect(
      s.command({ type: "setPolicy", materialId: "granules", policy: "export" })
        .ok,
    ).toBe(true);
    for (let i = 0; i < 20 && s.serialize().exported === exportedBefore; i++)
      s.step(300);
    expect(s.serialize().exported).toBeGreaterThan(exportedBefore);

    expect(
      s.command({ type: "setPolicy", materialId: "granules", policy: "keep" })
        .ok,
    ).toBe(true);
    for (
      let i = 0;
      i < 100 &&
      (total(s.serialize().staging) === 0 ||
        !Object.values(s.serialize().belts).some((b) => b.cargo));
      i++
    )
      s.step(300);

    const saved = s.serialize();
    expect(total(saved.staging)).toBeGreaterThan(0);
    expect(total(saved.storages[depot].inventory)).toBeGreaterThan(0);
    expect(total(saved.machines[lineB].input)).toBeGreaterThan(0);
    expect(Object.values(saved.belts).some((b) => b.cargo)).toBe(true);
    auditOk(s);

    const restored = new Simulation(fixture);
    expect(restored.load(JSON.parse(JSON.stringify(saved))).ok).toBe(true);
    expect(restored.serialize()).toEqual(saved);
    auditOk(restored);

    // Deterministic continuation after load.
    s.step(3000);
    restored.step(3000);
    expect(restored.serialize()).toEqual(s.serialize());

    // Resume B without rebuilding: restore the primary feed and enable the same
    // machine identity. Its output must again increase the same physical depot.
    expect(
      restored.command({ type: "switchDivert", beltId: diverter }).ok,
    ).toBe(true);
    expect(
      restored.command({ type: "setEnabled", machineId: lineB, enabled: true })
        .ok,
    ).toBe(true);
    const storedBeforeResume = total(
      restored.serialize().storages[depot].inventory,
    );

    for (
      let i = 0;
      i < 120 &&
      total(restored.serialize().storages[depot].inventory) <=
        storedBeforeResume;
      i++
    )
      restored.step(500);

    const resumed = restored.serialize();
    expect(resumed.machines[lineB].id).toBe(lineB);
    expect(resumed.machines[lineB].enabled).toBe(true);
    expect(total(resumed.storages[depot].inventory)).toBeGreaterThan(
      storedBeforeResume,
    );
    auditOk(restored);
  });
});
