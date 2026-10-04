import { historicalFixture } from "./historical-content";
import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  ensureMarket,
  experimentEvidenceKey,
  opportunityViews,
  recordDirectiveExperiment,
  recordOrderExport,
  refreshOpportunities,
} from "../src/index";
import { completeAndStart } from "../src/production";
import { initialState } from "../src/save";

const cadenceMs = fixture.tickMs * fixture.economy.marketEveryTicks;

function knownGranulesContent() {
  const content = structuredClone(fixture);
  content.materials.find((material) => material.id === "granules")!.known =
    true;
  delete content.economy.exchange[0].requiredTerminalCapabilityId;
  return content;
}

describe("Corporate Orders and Special Directives", () => {
  it("offers an experiment directive without leaking its hidden authored outcome", () => {
    const simulation = new Simulation(fixture);
    simulation.step(cadenceMs);

    const opportunities = simulation.snapshot().opportunities;
    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]).toMatchObject({
      id: "sealed-thermal-study",
      kind: "directive",
      operationId: "heat",
      inputMaterialId: "raw",
      setupNameKey: "machine.sealed-furnace.name",
      rewardFuel: 18,
    });
    expect(JSON.stringify(opportunities)).not.toContain("granules");
    expect(JSON.stringify(opportunities)).not.toContain("heat-raw-sealed");
    expect(opportunities.some((entry) => entry.kind === "order")).toBe(false);
  });

  it("offers the corporate order only after its exchange product becomes known", () => {
    const simulation = new Simulation(fixture);
    const save = simulation.serialize();
    const reaction = fixture.reactions.find(
      (entry) => entry.id === "crush-raw",
    )!;
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
    ensureMarket(fixture, save, "granules");
    save.policies.granules = "export";

    expect(simulation.load(save).ok).toBe(true);
    simulation.step(cadenceMs);

    const order = simulation
      .snapshot()
      .opportunities.find((entry) => entry.kind === "order");
    expect(order).toMatchObject({
      id: "granules-procurement",
      kind: "order",
      materialId: "granules",
      quantity: 4,
      progress: 0,
      rewardFuel: 24,
    });
    expect(JSON.stringify(order)).not.toContain("reactionId");
    expect(JSON.stringify(order)).not.toContain("outputId");
  });

  it("expires an incomplete opportunity deterministically on its authored window", () => {
    const content = structuredClone(fixture);
    content.economy.directives[0].durationTicks =
      content.economy.marketEveryTicks;
    const simulation = new Simulation(content);

    simulation.step(content.tickMs * content.economy.marketEveryTicks);
    expect(
      simulation
        .snapshot()
        .opportunities.some((entry) => entry.id === "sealed-thermal-study"),
    ).toBe(true);

    simulation.step(content.tickMs * content.economy.marketEveryTicks);
    expect(
      simulation
        .snapshot()
        .opportunities.some((entry) => entry.id === "sealed-thermal-study"),
    ).toBe(false);
    expect(
      simulation.serialize().opportunities["sealed-thermal-study"].status,
    ).toBe("expired");
  });

  it("completes a research directive on confirmed process completion and grants its reward once", () => {
    const state = initialState(fixture);
    state.tick = fixture.economy.marketEveryTicks;
    refreshOpportunities(fixture, state);
    const beforeFuel = state.fuel;
    state.machines.m1 = {
      id: "m1",
      x: 0,
      y: 0,
      direction: 0,
      definitionId: "sealed-furnace",
      factoryId: null,
      depositId: null,
      operation: "heat",
      enabled: true,
      incident: null,
      input: {},
      output: {},
      job: { remaining: 1, reaction: "heat-raw-sealed" },
    };

    state.tick += 1;
    completeAndStart(fixture, state, true);
    expect(state.evidence["heat/raw/sealed"]?.state).toBe("confirmed");
    expect(state.opportunities["sealed-thermal-study"]).toMatchObject({
      status: "completed",
      progress: 1,
      completedAt: state.tick,
    });
    expect(state.fuel).toBe(beforeFuel + 18);
    expect(opportunityViews(fixture, state)).not.toContainEqual(
      expect.objectContaining({ id: "sealed-thermal-study" }),
    );

    completeAndStart(fixture, state, true);
    expect(state.fuel).toBe(beforeFuel + 18);
  });

  it("counts only physical terminal exports toward an order and preserves the ledger", () => {
    const content = knownGranulesContent();
    const simulation = new Simulation(content);
    simulation.step(content.tickMs * content.economy.marketEveryTicks);
    const save = simulation.serialize();
    expect(save.opportunities["granules-procurement"].status).toBe("offered");
    save.staging.granules = 4;
    save.flows.produced.granules = 4;
    save.policies.granules = "export";
    const beforeFuel = save.fuel;

    expect(simulation.load(save).ok).toBe(true);
    simulation.step(content.tickMs);

    const after = simulation.serialize();
    expect(after.exported).toBe(4);
    expect(after.flows.exported.granules).toBe(4);
    expect(after.staging.granules ?? 0).toBe(0);
    expect(after.opportunities["granules-procurement"]).toMatchObject({
      status: "completed",
      progress: 4,
    });
    expect(after.fuel).toBe(beforeFuel + 4 * 12 + 24);
    expect(auditLedger(content, after).ok).toBe(true);
  });

  it("allocates each exported unit to at most one active order", () => {
    const content = knownGranulesContent();
    content.economy.orders.push({
      ...content.economy.orders[0],
      id: "granules-procurement-two",
      nameKey: "order.granules-procurement-two.name",
      briefKey: "order.granules-procurement-two.brief",
      quantity: 4,
    });
    const state = initialState(content);
    state.tick = content.economy.marketEveryTicks;
    refreshOpportunities(content, state);

    recordOrderExport(content, state, "granules", 5);
    expect(state.opportunities["granules-procurement"]).toMatchObject({
      status: "completed",
      progress: 4,
    });
    expect(state.opportunities["granules-procurement-two"]).toMatchObject({
      status: "offered",
      progress: 1,
    });
  });

  it("does not create a directive after that experiment has already started", () => {
    const state = initialState(fixture);
    const directive = fixture.economy.directives[0];
    const evidenceId = experimentEvidenceKey(
      directive.operationId,
      directive.inputMaterialId,
      directive.processConditionId ?? null,
    );
    state.evidence[evidenceId] = {
      operationId: directive.operationId,
      inputId: directive.inputMaterialId,
      processConditionId: directive.processConditionId ?? null,
      state: "hinted",
    };
    state.tick = fixture.economy.marketEveryTicks;

    refreshOpportunities(fixture, state);

    expect(state.opportunities["sealed-thermal-study"]).toBeUndefined();
    expect(opportunityViews(fixture, state)).not.toContainEqual(
      expect.objectContaining({ id: "sealed-thermal-study" }),
    );
  });

  it("expires a directive instead of rewarding confirmation after its deadline", () => {
    const state = initialState(fixture);
    const directive = fixture.economy.directives[0];
    state.tick = fixture.economy.marketEveryTicks;
    refreshOpportunities(fixture, state);
    const offered = state.opportunities[directive.id];
    const beforeFuel = state.fuel;
    state.tick = offered.expiresAt;

    recordDirectiveExperiment(
      fixture,
      state,
      directive.operationId,
      directive.inputMaterialId,
      directive.processConditionId ?? null,
    );
    refreshOpportunities(fixture, state);

    expect(state.opportunities[directive.id].status).toBe("expired");
    expect(state.fuel).toBe(beforeFuel);
  });

  it("rejects persisted opportunities that could leak hidden company knowledge", () => {
    const simulation = new Simulation(fixture);
    const before = simulation.serialize();
    const tampered = structuredClone(before);
    tampered.tick = fixture.economy.marketEveryTicks;
    tampered.opportunities["granules-procurement"] = {
      status: "offered",
      offeredAt: tampered.tick,
      expiresAt: tampered.tick + fixture.economy.orders[0].durationTicks,
      progress: 0,
      completedAt: null,
    };

    expect(simulation.load(tampered).ok).toBe(false);
    expect(simulation.serialize()).toEqual(before);
  });

  it("rejects a completed directive without its confirmed experiment evidence", () => {
    const simulation = new Simulation(fixture);
    const before = simulation.serialize();
    const tampered = structuredClone(before);
    tampered.tick = fixture.economy.marketEveryTicks;
    tampered.opportunities["sealed-thermal-study"] = {
      status: "completed",
      offeredAt: 0,
      expiresAt: fixture.economy.directives[0].durationTicks,
      progress: 1,
      completedAt: tampered.tick,
    };

    expect(simulation.load(tampered).ok).toBe(false);
    expect(simulation.serialize()).toEqual(before);
  });

  it("persists partial progress and migrates schema 8 with empty opportunity history", () => {
    const content = knownGranulesContent();
    const source = new Simulation(content);
    source.step(content.tickMs * content.economy.marketEveryTicks);
    const partial = source.serialize();
    recordOrderExport(content, partial, "granules", 2);

    const restored = new Simulation(content);
    expect(restored.load(JSON.parse(JSON.stringify(partial))).ok).toBe(true);
    expect(restored.serialize().schemaVersion).toBe(18);
    expect(restored.serialize().opportunities).toEqual(partial.opportunities);

    const legacy = JSON.parse(
      JSON.stringify(new Simulation(historicalFixture).serialize()),
    );
    legacy.schemaVersion = 8;
    delete legacy.opportunities;
    const migrated = new Simulation(historicalFixture);
    expect(migrated.load(legacy).ok).toBe(true);
    expect(migrated.serialize().schemaVersion).toBe(18);
    expect(migrated.serialize().opportunities).toEqual({});
  });
});
