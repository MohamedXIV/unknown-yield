import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  applyExportCompensation,
  auditLedger,
  experimentEvidenceKey,
  initializeKnownMarkets,
  recordDirectiveExperiment,
  recordOrderExport,
  type GameCommand,
} from "../src/index";

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
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

function depletedSimulation(content = fixture) {
  const simulation = new Simulation(content),
    save = simulation.serialize();
  save.fuel = 0;
  expect(simulation.load(save).ok).toBe(true);
  return simulation;
}

function knownGranulesContent() {
  const content = structuredClone(fixture);
  content.materials.find((material) => material.id === "granules")!.known = true;
  return content;
}

describe("corporate assistance and recovery standing", () => {
  it("keeps the pre-#72 assistance fallback visible and functional", () => {
    const legacy = structuredClone(fixture);
    legacy.economy.assistancePackages = [];
    delete legacy.economy.defaultAssistancePackageId;
    legacy.economy.startFuel = 0;

    const simulation = new Simulation(legacy);
    expect(simulation.snapshot().assistance).toEqual([
      expect.objectContaining({
        id: "legacy-emergency",
        nameKey: "assistance.legacy-emergency.name",
        briefKey: "assistance.legacy-emergency.brief",
        grantFuel: legacy.economy.grant,
        nextObligationFuel: legacy.economy.grant,
        eligible: true,
      }),
    ]);
    expect(simulation.command({ type: "assistance" }).ok).toBe(true);
    expect(simulation.snapshot()).toMatchObject({
      fuel: legacy.economy.grant,
      debt: legacy.economy.grant,
      company: {
        standing: "recovery",
        interventionStreak: 1,
        recoveryPackageId: null,
      },
    });
  });

  it("enforces authored eligibility and refuses farming while obligation is open", () => {
    const fresh = new Simulation(fixture);
    const packageView = fresh.snapshot().assistance[0];
    expect(packageView).toMatchObject({
      id: "emergency-fuel",
      grantFuel: 36,
      nextObligationFuel: 36,
      eligible: false,
      reason: "fuel-not-depleted",
    });
    expect(
      fresh.command({ type: "assistance", packageId: "emergency-fuel" }).ok,
    ).toBe(false);
    expect(
      fresh.command({ type: "assistance", packageId: "missing-package" }),
    ).toMatchObject({
      ok: false,
      messageKey: "ui.terminal.assistance.result.unknown",
    });

    const simulation = depletedSimulation();
    const physicalBefore = simulation.serialize();
    expect(
      simulation.command({
        type: "assistance",
        packageId: "emergency-fuel",
      }),
    ).toMatchObject({
      ok: true,
      messageKey: "ui.terminal.assistance.result.approved",
    });
    const physicalAfter = simulation.serialize();
    expect({
      stock: physicalAfter.stock,
      deposits: physicalAfter.deposits,
      machines: physicalAfter.machines,
      factories: physicalAfter.factories,
      belts: physicalAfter.belts,
      storages: physicalAfter.storages,
      staging: physicalAfter.staging,
      flows: physicalAfter.flows,
    }).toEqual({
      stock: physicalBefore.stock,
      deposits: physicalBefore.deposits,
      machines: physicalBefore.machines,
      factories: physicalBefore.factories,
      belts: physicalBefore.belts,
      storages: physicalBefore.storages,
      staging: physicalBefore.staging,
      flows: physicalBefore.flows,
    });
    expect(auditLedger(fixture, physicalAfter).ok).toBe(true);
    expect(simulation.snapshot()).toMatchObject({
      fuel: 36,
      debt: 36,
      company: {
        standing: "recovery",
        interventionStreak: 1,
        recoveryNetFuel: 0,
        recoveryPackageId: "emergency-fuel",
        recoveryTargetNetFuel: 24,
      },
    });
    const before = simulation.serialize();
    expect(
      simulation.command({
        type: "assistance",
        packageId: "emergency-fuel",
      }),
    ).toMatchObject({
      ok: false,
      messageKey: "ui.terminal.assistance.result.obligation-open",
    });
    expect(simulation.serialize()).toEqual(before);
    expect(simulation.snapshot().assistance[0]).toMatchObject({
      eligible: false,
      reason: "obligation-open",
    });

    const restored = new Simulation(fixture);
    expect(
      restored.load(JSON.parse(JSON.stringify(simulation.serialize()))).ok,
    ).toBe(true);
    expect(restored.snapshot().company).toEqual(simulation.snapshot().company);
    expect(restored.snapshot().debt).toBe(36);
  });

  it("preserves existing physical factory, routing and cargo while granting assistance", () => {
    const simulation = new Simulation(fixture);
    build(simulation, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    });
    build(simulation, path(17, 26, 20, 26));
    simulation.step(3000);

    const depleted = simulation.serialize();
    depleted.fuel = 0;
    expect(simulation.load(depleted).ok).toBe(true);
    const before = simulation.serialize();

    expect(simulation.command({ type: "assistance" }).ok).toBe(true);
    const after = simulation.serialize();
    expect({
      stock: after.stock,
      deposits: after.deposits,
      machines: after.machines,
      factories: after.factories,
      belts: after.belts,
      storages: after.storages,
      staging: after.staging,
      policies: after.policies,
      flows: after.flows,
    }).toEqual({
      stock: before.stock,
      deposits: before.deposits,
      machines: before.machines,
      factories: before.factories,
      belts: before.belts,
      storages: before.storages,
      staging: before.staging,
      policies: before.policies,
      flows: before.flows,
    });
    expect(auditLedger(fixture, after).ok).toBe(true);
  });

  it("keeps bonus allocations outside obligation and standing recovery accounting", () => {
    const content = knownGranulesContent();
    const simulation = depletedSimulation(content);
    expect(simulation.command({ type: "assistance" }).ok).toBe(true);
    const save = simulation.serialize();

    save.opportunities["granules-procurement"] = {
      status: "offered",
      offeredAt: 0,
      expiresAt: content.economy.orders[0].durationTicks,
      progress: 0,
      completedAt: null,
    };
    const beforeBonusFuel = save.fuel;
    recordOrderExport(content, save, "granules", 4);
    expect(save.fuel).toBe(beforeBonusFuel + 24);
    expect(save.debt).toBe(36);
    expect(save.company.recoveryNetFuel).toBe(0);

    save.opportunities["sealed-thermal-study"] = {
      status: "offered",
      offeredAt: 0,
      expiresAt: content.economy.directives[0].durationTicks,
      progress: 0,
      completedAt: null,
    };
    save.evidence[experimentEvidenceKey("heat", "raw", "sealed")] = {
      operationId: "heat",
      inputId: "raw",
      processConditionId: "sealed",
      state: "confirmed",
    };
    recordDirectiveExperiment(content, save, "heat", "raw", "sealed");
    expect(save.fuel).toBe(beforeBonusFuel + 24 + 18);
    expect(save.debt).toBe(36);
    expect(save.company.recoveryNetFuel).toBe(0);

    const repayment = applyExportCompensation(
      content,
      save,
      "granules",
      3,
    );
    expect(repayment).toMatchObject({ gross: 36, repaid: 36, net: 0 });
    expect(save.debt).toBe(0);
    expect(save.company.standing).toBe("recovery");
    expect(save.company.recoveryNetFuel).toBe(0);

    let netRecovered = 0;
    for (let i = 0; i < 10 && save.company.standing !== "clear"; i++) {
      const result = applyExportCompensation(content, save, "granules", 1);
      netRecovered += result.net;
    }
    expect(netRecovered).toBeGreaterThanOrEqual(24);
    expect(save.company).toEqual({
      standing: "clear",
      interventionStreak: 0,
      recoveryNetFuel: 0,
      recoveryPackageId: null,
      repaidSinceAssistanceFuel: 0,
    });
  });

  it("allows a bounded repeat intervention with an authored higher obligation", () => {
    const content = knownGranulesContent();
    const simulation = depletedSimulation(content);
    expect(simulation.command({ type: "assistance" }).ok).toBe(true);

    const save = simulation.serialize();
    const repayment = applyExportCompensation(
      content,
      save,
      "granules",
      3,
    );
    expect(repayment.net).toBe(0);
    expect(save.debt).toBe(0);
    expect(save.company.interventionStreak).toBe(1);

    save.fuel = 0;
    save.company.recoveryNetFuel = 7;
    expect(simulation.load(save).ok).toBe(true);
    expect(simulation.snapshot().assistance[0]).toMatchObject({
      eligible: true,
      nextObligationFuel: 48,
    });
    expect(simulation.command({ type: "assistance" }).ok).toBe(true);
    expect(simulation.snapshot()).toMatchObject({
      fuel: 36,
      debt: 48,
      company: {
        standing: "recovery",
        interventionStreak: 2,
        recoveryNetFuel: 7,
      },
    });

    const depletedAgain = simulation.serialize();
    depletedAgain.fuel = 0;
    expect(simulation.load(depletedAgain).ok).toBe(true);
    expect(simulation.snapshot().assistance[0]).toMatchObject({
      eligible: false,
      reason: "obligation-open",
      nextObligationFuel: 12,
    });
    expect(simulation.command({ type: "assistance" }).ok).toBe(false);

    const repaid = simulation.serialize();
    const progress = applyExportCompensation(content, repaid, "granules", 2);
    expect(progress.repaid).toBeGreaterThanOrEqual(12);
    expect(repaid.debt).toBeGreaterThan(0);
    expect(simulation.load(repaid).ok).toBe(true);
    expect(simulation.snapshot().assistance[0]).toMatchObject({
      eligible: true,
      nextObligationFuel: 12,
    });
    const debtBeforeContinuation = simulation.snapshot().debt;
    expect(simulation.command({ type: "assistance" }).ok).toBe(true);
    expect(simulation.snapshot()).toMatchObject({
      fuel: 36,
      debt: debtBeforeContinuation + 12,
      company: {
        standing: "recovery",
        interventionStreak: 2,
      },
    });
    expect(simulation.serialize().company.repaidSinceAssistanceFuel).toBe(0);
  });

  it("recovers a saturated second intervention through repayment-earned continuations", () => {
    const content = structuredClone(fixture),
      simulation = new Simulation(content),
      save = simulation.serialize(),
      reaction = content.reactions.find(
        (entry) => entry.id === "heat-raw-sealed",
      )!,
      expiry = content.economy.directives[0].durationTicks;

    save.tick = expiry;
    save.fuel = 0;
    save.debt = 0;
    save.company = {
      standing: "recovery",
      interventionStreak: 1,
      recoveryNetFuel: 0,
      recoveryPackageId: "emergency-fuel",
      repaidSinceAssistanceFuel: 0,
    };
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
    initializeKnownMarkets(content, save);
    save.market.granules.saturationBps = 10000;
    for (const definition of [
      content.economy.orders[0],
      content.economy.directives[0],
    ])
      save.opportunities[definition.id] = {
        status: "expired",
        offeredAt: 0,
        expiresAt: definition.durationTicks,
        progress: 0,
        completedAt: null,
      };

    expect(simulation.load(save).ok).toBe(true);
    expect(
      simulation.snapshot().exchange.find(
        (entry) => entry.materialId === "granules",
      )?.handling?.unlocked,
    ).toBe(true);
    expect(simulation.snapshot().assistance[0]).toMatchObject({
      eligible: true,
      nextObligationFuel: 48,
    });
    expect(simulation.command({ type: "assistance" }).ok).toBe(true);
    expect(simulation.snapshot()).toMatchObject({
      fuel: 36,
      debt: 48,
      company: {
        standing: "recovery",
        interventionStreak: 2,
      },
    });

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
    build(simulation, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 18,
      y: 36,
      direction: 0,
    });
    build(simulation, {
      type: "placeMachine",
      definitionId: "sealed-furnace",
      x: 27,
      y: 36,
      direction: 0,
    });
    build(simulation, path(20, 37, 26, 37));
    build(simulation, path(29, 37, 37, 37, 3));
    build(simulation, path(37, 36, 37, 28, 0));
    expect(
      simulation.command({
        type: "setPolicy",
        materialId: "granules",
        policy: "export",
      }).ok,
    ).toBe(true);

    for (let i = 0; i < 20000; i++) simulation.step(100);

    expect(simulation.snapshot().fuel).toBe(0);
    expect(simulation.snapshot().debt).toBeGreaterThan(0);
    expect(simulation.snapshot().exported).toBeGreaterThan(0);
    expect(simulation.snapshot().company.interventionStreak).toBe(2);
    expect(simulation.serialize().company.repaidSinceAssistanceFuel).toBeGreaterThanOrEqual(
      12,
    );
    expect(simulation.snapshot().assistance[0]).toMatchObject({
      eligible: true,
      nextObligationFuel: 12,
    });

    const firstContinuationDebt = simulation.snapshot().debt;
    expect(simulation.command({ type: "assistance" }).ok).toBe(true);
    expect(simulation.snapshot().debt).toBe(firstContinuationDebt + 12);
    expect(simulation.snapshot().fuel).toBe(36);
    expect(simulation.snapshot().company.interventionStreak).toBe(2);
    expect(simulation.serialize().company.repaidSinceAssistanceFuel).toBe(0);

    let continuations = 1;
    for (
      let i = 0;
      i < 60000 && simulation.snapshot().company.standing !== "clear";
      i++
    ) {
      const snapshot = simulation.snapshot();
      if (
        snapshot.fuel < content.economy.assistancePackages[0].fuelBelow &&
        snapshot.assistance[0].eligible
      ) {
        const debtBefore = snapshot.debt,
          streak = snapshot.company.interventionStreak;
        expect(simulation.command({ type: "assistance" }).ok).toBe(true);
        if (debtBefore > 0) {
          expect(simulation.snapshot().company.interventionStreak).toBe(streak);
          continuations++;
        } else
          expect(simulation.snapshot().company.interventionStreak).toBe(
            streak + 1,
          );
      }
      simulation.step(100);
    }

    expect(continuations).toBeGreaterThanOrEqual(1);
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
    ).toBe("expired");
    expect(
      simulation.serialize().opportunities["granules-procurement"].status,
    ).toBe("expired");
    expect(auditLedger(content, simulation.serialize()).ok).toBe(true);
  });

  it("migrates schema 10 debt into recovery standing without changing the obligation", () => {
    const source = new Simulation(fixture);
    const legacy = JSON.parse(JSON.stringify(source.serialize()));
    legacy.schemaVersion = 10;
    legacy.fuel = 0;
    legacy.debt = 20;
    delete legacy.company;

    const restored = new Simulation(fixture);
    expect(restored.load(legacy).ok).toBe(true);
    expect(restored.serialize().schemaVersion).toBe(16);
    expect(restored.snapshot()).toMatchObject({
      fuel: 0,
      debt: 20,
      company: {
        standing: "recovery",
        interventionStreak: 1,
        recoveryNetFuel: 0,
        recoveryPackageId: "emergency-fuel",
        recoveryTargetNetFuel: 24,
      },
    });
  });

  it("recovers from zero fuel after an expired Directive through a real sealed trial and legal exports", () => {
    const content = structuredClone(fixture);
    content.economy.startFuel = 0;
    const simulation = new Simulation(content);

    simulation.step(
      content.tickMs *
        (content.economy.marketEveryTicks +
          content.economy.directives[0].durationTicks),
    );
    expect(
      simulation.serialize().opportunities["sealed-thermal-study"]?.status,
    ).toBe("expired");
    expect(simulation.snapshot().fuel).toBe(0);
    expect(simulation.snapshot().assistance[0].eligible).toBe(true);

    build(simulation, {
      type: "assistance",
      packageId: "emergency-fuel",
    });
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
    build(simulation, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 18,
      y: 36,
      direction: 0,
    });
    build(simulation, {
      type: "placeMachine",
      definitionId: "sealed-furnace",
      x: 27,
      y: 36,
      direction: 0,
    });
    build(simulation, path(20, 37, 26, 37));

    for (
      let i = 0;
      i < 600 &&
      !simulation.serialize().knowledge.includes("heat-raw-sealed");
      i++
    )
      simulation.step(100);

    expect(simulation.serialize().knowledge).toContain("heat-raw-sealed");
    expect(
      simulation.snapshot().milestones.find(
        (entry) => entry.id === "sealed-study-certified",
      )?.completed,
    ).toBe(true);
    expect(
      simulation.snapshot().exchange.find(
        (entry) => entry.materialId === "granules",
      )?.handling?.unlocked,
    ).toBe(true);
    expect(
      simulation.serialize().opportunities["sealed-thermal-study"].status,
    ).toBe("expired");

    build(simulation, path(29, 37, 37, 37, 3));
    build(simulation, path(37, 36, 37, 28, 0));

    for (
      let i = 0;
      i < 4000 && simulation.snapshot().company.standing !== "clear";
      i++
    )
      simulation.step(100);

    expect(simulation.snapshot().exported).toBeGreaterThan(0);
    expect(simulation.snapshot().debt).toBe(0);
    expect(simulation.snapshot().company).toEqual({
      standing: "clear",
      interventionStreak: 0,
      recoveryNetFuel: 0,
      recoveryPackageId: null,
      recoveryTargetNetFuel: 0,
    });
    expect(simulation.snapshot().fuel).toBeGreaterThan(0);
    expect(auditLedger(content, simulation.serialize()).ok).toBe(true);
  });
});
