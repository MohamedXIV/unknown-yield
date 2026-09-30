import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  type GameCommand,
} from "../src/index";

function build(simulation: Simulation, command: GameCommand) {
  const result = simulation.command(command);
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

function buildGranulesCrushLine(simulation: Simulation) {
  const factory = build(simulation, {
    type: "placeFactory",
    x: 24,
    y: 33,
    width: 10,
    height: 10,
  });
  for (const x of [24, 33])
    build(simulation, {
      type: "placePort",
      factoryId: factory,
      x,
      y: 37,
      direction: 0,
    });
  const extractor = build(simulation, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 36,
    direction: 0,
  });
  const processor = build(simulation, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 36,
    direction: 0,
  });
  build(simulation, path(20, 37, 26, 37));
  build(simulation, path(29, 37, 37, 37, 3));
  build(simulation, path(37, 36, 37, 28, 0));
  return { factory, extractor, processor };
}

function addSealedGranulesLine(simulation: Simulation, factoryId: string) {
  for (const x of [24, 33])
    build(simulation, {
      type: "placePort",
      factoryId,
      x,
      y: 40,
      direction: 0,
    });
  const extractor = build(simulation, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 39,
    direction: 0,
  });
  const processor = build(simulation, {
    type: "placeMachine",
    definitionId: "sealed-furnace",
    x: 27,
    y: 39,
    direction: 0,
  });
  build(simulation, path(20, 40, 26, 40));
  // Join the already-built terminal trunk at 37,37 without replacing cargo.
  build(simulation, path(29, 40, 37, 38, 3));
  return { extractor, processor };
}

function buildConstructionDiversion(simulation: Simulation) {
  const factory = build(simulation, {
    type: "placeFactory",
    x: 24,
    y: 22,
    width: 10,
    height: 10,
  });
  for (const x of [24, 33])
    build(simulation, {
      type: "placePort",
      factoryId: factory,
      x,
      y: 27,
      direction: 0,
    });
  const extractor = build(simulation, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 26,
    direction: 0,
  });
  const processor = build(simulation, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 26,
    direction: 0,
  });
  build(simulation, path(20, 27, 26, 27));
  build(simulation, path(29, 27, 37, 27, 0));
  return { extractor, processor };
}

function granulesListing(simulation: Simulation) {
  return simulation
    .snapshot()
    .exchange.find((entry) => entry.materialId === "granules");
}

describe("Phase 5 integrated company progression exit", () => {
  it("connects discovery, market pressure, company opportunities, progression and recovery in one physical world", () => {
    let simulation = new Simulation(fixture);
    const fresh = simulation.snapshot();

    expect(fresh.exchange).toEqual([]);
    expect(fresh.opportunities).toEqual([]);
    expect(fresh.materials.some((material) => material.id === "granules")).toBe(
      false,
    );
    expect(JSON.stringify(fresh)).not.toContain("crush-raw");
    expect(JSON.stringify(fresh)).not.toContain("heat-raw-sealed");
    expect(auditLedger(fixture, simulation.serialize()).ok).toBe(true);

    const crush = buildGranulesCrushLine(simulation);
    for (
      let i = 0;
      i < 2500 &&
      (!simulation.serialize().knowledge.includes("crush-raw") ||
        (simulation.snapshot().staging.granules ?? 0) < 4 ||
        !simulation.serialize().opportunities["granules-procurement"] ||
        !simulation.serialize().opportunities["sealed-thermal-study"]);
      i++
    )
      simulation.step(100);

    expect(simulation.serialize().knowledge).toContain("crush-raw");
    expect(granulesListing(simulation)).toMatchObject({
      compensationPerUnit: 12,
      saturationBps: 0,
      handling: {
        nameKey: "terminal.capability.sealed-sample-outbound.name",
        unlocked: false,
      },
    });
    expect(simulation.snapshot().staging.granules ?? 0).toBeGreaterThanOrEqual(4);
    expect(simulation.snapshot().exported).toBe(0);
    expect(
      simulation.serialize().opportunities["granules-procurement"],
    ).toMatchObject({ status: "offered", progress: 0 });
    expect(
      simulation.serialize().opportunities["sealed-thermal-study"],
    ).toMatchObject({ status: "offered", progress: 0 });
    expect(JSON.stringify(simulation.snapshot())).not.toContain(
      "heat-raw-sealed",
    );
    expect(auditLedger(fixture, simulation.serialize()).ok).toBe(true);

    const lockedCheckpoint = simulation.serialize();
    const lockedRestored = new Simulation(fixture);
    expect(
      lockedRestored.load(JSON.parse(JSON.stringify(lockedCheckpoint))).ok,
    ).toBe(true);
    expect(lockedRestored.serialize()).toEqual(lockedCheckpoint);
    simulation = lockedRestored;

    // The Directive redirects world production: preserve the Crush line, stop
    // feeding it, and add a separate Sealed Heat line instead of deleting it.
    expect(
      simulation.command({
        type: "setEnabled",
        machineId: crush.extractor,
        enabled: false,
      }).ok,
    ).toBe(true);
    expect(
      simulation.command({
        type: "setEnabled",
        machineId: crush.processor,
        enabled: false,
      }).ok,
    ).toBe(true);
    const sealed = addSealedGranulesLine(simulation, crush.factory);

    for (
      let i = 0;
      i < 2500 &&
      (!simulation.serialize().knowledge.includes("heat-raw-sealed") ||
        simulation.serialize().opportunities["sealed-thermal-study"]?.status !==
          "completed" ||
        !simulation
          .snapshot()
          .milestones.find(
            (entry) => entry.id === "sealed-study-certified",
          )?.completed);
      i++
    )
      simulation.step(100);

    expect(simulation.serialize().knowledge).toContain("heat-raw-sealed");
    expect(
      simulation.serialize().opportunities["sealed-thermal-study"],
    ).toMatchObject({ status: "completed", progress: 1 });
    expect(
      simulation
        .snapshot()
        .milestones.find((entry) => entry.id === "sealed-study-certified"),
    ).toMatchObject({ completed: true });
    expect(granulesListing(simulation)?.handling?.unlocked).toBe(true);
    expect(
      simulation.snapshot().machines.find((entry) => entry.id === crush.processor)
        ?.enabled,
    ).toBe(false);

    for (
      let i = 0;
      i < 2500 &&
      simulation.serialize().opportunities["granules-procurement"]?.status !==
        "completed";
      i++
    )
      simulation.step(100);

    expect(
      simulation.serialize().opportunities["granules-procurement"],
    ).toMatchObject({ status: "completed", progress: 4 });
    expect(simulation.snapshot().exported).toBeGreaterThanOrEqual(4);
    expect(simulation.serialize().flows.exported.granules).toBeGreaterThanOrEqual(
      4,
    );
    expect(granulesListing(simulation)?.saturationBps).toBeGreaterThan(0);
    expect(granulesListing(simulation)?.compensationPerUnit).toBeLessThan(12);
    expect(auditLedger(fixture, simulation.serialize()).ok).toBe(true);

    for (
      let i = 0;
      i < 3000 && (granulesListing(simulation)?.saturationBps ?? 0) < 10000;
      i++
    )
      simulation.step(100);

    const saturated = granulesListing(simulation)!;
    expect(saturated.saturationBps).toBe(10000);
    expect(saturated.compensationPerUnit).toBe(
      fixture.economy.exchange[0].floorCompensation,
    );

    expect(
      simulation.command({
        type: "setPolicy",
        materialId: "granules",
        policy: "keep",
      }).ok,
    ).toBe(true);
    for (const machineId of [sealed.extractor, sealed.processor])
      expect(
        simulation.command({
          type: "setEnabled",
          machineId,
          enabled: false,
        }).ok,
      ).toBe(true);

    const construction = buildConstructionDiversion(simulation);
    const platesBeforeDiversion = simulation.snapshot().stock.plates;
    const compensationAtDiversion =
      granulesListing(simulation)!.compensationPerUnit;
    for (
      let i = 0;
      i < 400 &&
      (simulation.snapshot().stock.plates <= platesBeforeDiversion ||
        granulesListing(simulation)!.compensationPerUnit <=
          compensationAtDiversion);
      i++
    )
      simulation.step(1000);

    expect(simulation.snapshot().stock.plates).toBeGreaterThan(
      platesBeforeDiversion,
    );
    expect(granulesListing(simulation)!.compensationPerUnit).toBeGreaterThan(
      compensationAtDiversion,
    );
    expect(
      simulation.snapshot().machines.find((entry) => entry.id === sealed.processor)
        ?.enabled,
    ).toBe(false);
    expect(auditLedger(fixture, simulation.serialize()).ok).toBe(true);

    // Let the diversified construction line consume operating allocation
    // naturally. This is the integrated economic-collapse boundary; no save
    // mutation or debug fuel injection is used.
    for (
      let i = 0;
      i < 700 && !simulation.snapshot().assistance[0].eligible;
      i++
    )
      simulation.step(1000);

    expect(simulation.snapshot().fuel).toBeLessThan(
      fixture.economy.assistancePackages[0].fuelBelow,
    );
    expect(simulation.snapshot().assistance[0].eligible).toBe(true);
    expect(simulation.snapshot().debt).toBe(0);
    expect(simulation.snapshot().company.standing).toBe("clear");

    expect(
      simulation.command({
        type: "assistance",
        packageId: "emergency-fuel",
      }).ok,
    ).toBe(true);
    expect(simulation.snapshot()).toMatchObject({
      debt: 36,
      company: {
        standing: "recovery",
        interventionStreak: 1,
        recoveryNetFuel: 0,
      },
    });

    for (const machineId of [construction.extractor, construction.processor])
      expect(
        simulation.command({
          type: "setEnabled",
          machineId,
          enabled: false,
        }).ok,
      ).toBe(true);
    for (const machineId of [sealed.extractor, sealed.processor])
      expect(
        simulation.command({
          type: "setEnabled",
          machineId,
          enabled: true,
        }).ok,
      ).toBe(true);
    expect(
      simulation.command({
        type: "setPolicy",
        materialId: "granules",
        policy: "export",
      }).ok,
    ).toBe(true);

    const obligationCheckpoint = simulation.serialize();
    expect(auditLedger(fixture, obligationCheckpoint).ok).toBe(true);
    const obligationRestored = new Simulation(fixture);
    expect(
      obligationRestored.load(
        JSON.parse(JSON.stringify(obligationCheckpoint)),
      ).ok,
    ).toBe(true);
    expect(obligationRestored.serialize()).toEqual(obligationCheckpoint);
    simulation = obligationRestored;

    const exportsBeforeRecovery = simulation.snapshot().exported;
    let sawDebtRepayment = false,
      assistanceAllocations = 1,
      previousDebt = simulation.snapshot().debt;

    for (
      let i = 0;
      i < 30000 && simulation.snapshot().company.standing !== "clear";
      i++
    ) {
      const snapshot = simulation.snapshot();
      if (snapshot.debt < previousDebt) sawDebtRepayment = true;
      if (
        snapshot.fuel <
          fixture.economy.assistancePackages[0].fuelBelow &&
        snapshot.assistance[0].eligible
      ) {
        const debtBefore = snapshot.debt,
          streakBefore = snapshot.company.interventionStreak;
        expect(
          simulation.command({
            type: "assistance",
            packageId: "emergency-fuel",
          }).ok,
        ).toBe(true);
        assistanceAllocations++;
        if (debtBefore > 0)
          expect(simulation.snapshot().company.interventionStreak).toBe(
            streakBefore,
          );
      }
      previousDebt = simulation.snapshot().debt;
      simulation.step(100);
    }

    expect(sawDebtRepayment).toBe(true);
    expect(assistanceAllocations).toBeGreaterThanOrEqual(1);
    expect(simulation.snapshot().exported).toBeGreaterThan(
      exportsBeforeRecovery,
    );
    expect(simulation.snapshot().debt).toBe(0);
    expect(simulation.snapshot().company).toEqual({
      standing: "clear",
      interventionStreak: 0,
      recoveryNetFuel: 0,
      recoveryPackageId: null,
      recoveryTargetNetFuel: 0,
    });
    expect(
      simulation.serialize().opportunities["sealed-thermal-study"].status,
    ).toBe("completed");
    expect(
      simulation.serialize().opportunities["granules-procurement"].status,
    ).toBe("completed");
    expect(auditLedger(fixture, simulation.serialize()).ok).toBe(true);

    const finalSave = simulation.serialize();
    const finalRestored = new Simulation(fixture);
    expect(
      finalRestored.load(JSON.parse(JSON.stringify(finalSave))).ok,
    ).toBe(true);
    expect(finalRestored.serialize()).toEqual(finalSave);
    expect(finalRestored.snapshot().opportunities).toEqual([]);
    expect(
      finalRestored
        .snapshot()
        .milestones.find((entry) => entry.id === "sealed-study-certified"),
    ).toMatchObject({ completed: true });
    expect(granulesListing(finalRestored)?.handling?.unlocked).toBe(true);
    expect(auditLedger(fixture, finalRestored.serialize()).ok).toBe(true);
  });
});
