import { historicalFixture } from "./historical-content";
import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  ensureMarket,
  experimentEvidenceKey,
  refreshMilestones,
  refreshOpportunities,
  terminalCanExport,
} from "../src/index";
import { initialState } from "../src/save";
import { transport } from "../src/production";

const cadenceMs = fixture.tickMs * fixture.economy.marketEveryTicks;

function knownGranulesContent() {
  const content = structuredClone(fixture);
  content.materials.find((material) => material.id === "granules")!.known =
    true;
  return content;
}

function confirmSealedTrial(
  content: typeof fixture,
  state: ReturnType<typeof initialState>,
) {
  const reaction = content.reactions.find(
    (entry) => entry.id === "heat-raw-sealed",
  )!;
  if (!state.knowledge.includes(reaction.id)) state.knowledge.push(reaction.id);
  state.evidence[
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
  ensureMarket(content, state, reaction.output);
}

describe("evidence milestones and terminal handling", () => {
  it("keeps milestone presentation free of hidden product truth", () => {
    const simulation = new Simulation(fixture);
    simulation.step(cadenceMs);

    const snapshot = simulation.snapshot();
    expect(snapshot.milestones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "sealed-study-certified",
          completed: false,
        }),
      ]),
    );
    expect(JSON.stringify(snapshot)).not.toContain('"materialId":"granules"');
    expect(JSON.stringify(snapshot.milestones)).not.toContain(
      "heat-raw-sealed",
    );
    expect(JSON.stringify(snapshot.milestones)).not.toContain("granules");
  });

  it("keeps blocked exports staged with no reward, order progress, or ledger export", () => {
    const content = knownGranulesContent();
    const state = initialState(content);
    state.tick = content.economy.marketEveryTicks;
    refreshOpportunities(content, state);
    state.staging.granules = 4;
    state.flows.produced.granules = 4;
    state.policies.granules = "export";
    const beforeFuel = state.fuel;

    expect(terminalCanExport(content, state, "granules")).toBe(false);
    transport(content, state);

    expect(state.staging.granules).toBe(4);
    expect(state.exported).toBe(0);
    expect(state.flows.exported.granules ?? 0).toBe(0);
    expect(state.market.granules.saturationBps).toBe(0);
    expect(state.opportunities["granules-procurement"].progress).toBe(0);
    expect(state.fuel).toBe(beforeFuel);
    expect(auditLedger(content, state).ok).toBe(true);
  });

  it("lets locked staging fill and backpressure the terminal approach", () => {
    const content = knownGranulesContent();
    const state = initialState(content);
    state.staging.granules = content.site.stagingCapacity;
    state.flows.produced.granules = content.site.stagingCapacity + 1;
    state.policies.granules = "export";
    state.stock[content.site.buildMaterial] -= content.site.beltCost;
    state.belts["37,26"] = {
      id: "b1",
      x: 37,
      y: 26,
      direction: 0,
      cargo: "granules",
      alternate: null,
      switched: false,
    };

    expect(auditLedger(content, state).ok).toBe(true);

    transport(content, state);

    expect(state.staging.granules).toBe(content.site.stagingCapacity);
    expect(state.belts["37,26"].cargo).toBe("granules");
    expect(state.exported).toBe(0);
    expect(state.flows.exported.granules ?? 0).toBe(0);
    expect(auditLedger(content, state).ok).toBe(true);
  });

  it("unlocks handling from confirmed sealed-trial evidence and then allows the physical export path", () => {
    const content = knownGranulesContent();
    const state = initialState(content);
    state.tick = content.economy.marketEveryTicks;
    refreshOpportunities(content, state);
    confirmSealedTrial(content, state);
    refreshMilestones(content, state);

    expect(state.milestones["sealed-study-certified"]).toEqual({
      completedAt: state.tick,
    });
    expect(terminalCanExport(content, state, "granules")).toBe(true);

    state.staging.granules = 4;
    state.flows.produced.granules = 4;
    state.policies.granules = "export";
    const beforeExportFuel = state.fuel;

    transport(content, state);

    expect(state.staging.granules ?? 0).toBe(0);
    expect(state.exported).toBe(4);
    expect(state.flows.exported.granules).toBe(4);
    expect(state.opportunities["granules-procurement"]).toMatchObject({
      status: "completed",
      progress: 4,
    });
    expect(state.fuel).toBe(beforeExportFuel + 4 * 12 + 24);
    expect(auditLedger(content, state).ok).toBe(true);
  });

  it("unlocks after the directive expires if the sealed trial is later confirmed", () => {
    const state = initialState(fixture);
    state.tick = fixture.economy.marketEveryTicks;
    refreshOpportunities(fixture, state);
    const directive = state.opportunities["sealed-thermal-study"];
    if (!directive) throw new Error("Expected sealed thermal directive offer");
    expect(directive.status).toBe("offered");

    state.tick = directive.expiresAt;
    refreshOpportunities(fixture, state);
    expect(state.opportunities["sealed-thermal-study"].status).toBe("expired");

    confirmSealedTrial(fixture, state);
    refreshMilestones(fixture, state);

    expect(state.milestones["sealed-study-certified"]).toEqual({
      completedAt: state.tick,
    });
    expect(terminalCanExport(fixture, state, "granules")).toBe(true);
  });

  it("unlocks from a confirmed sealed trial that happened before any directive offer", () => {
    const state = initialState(fixture);
    expect(state.opportunities["sealed-thermal-study"]).toBeUndefined();

    confirmSealedTrial(fixture, state);
    refreshMilestones(fixture, state);

    expect(state.opportunities["sealed-thermal-study"]).toBeUndefined();
    expect(state.milestones["sealed-study-certified"]).toEqual({
      completedAt: 0,
    });
    expect(terminalCanExport(fixture, state, "granules")).toBe(true);
  });

  it("migrates schema 9 from prior confirmed trial evidence without directive completion", () => {
    const legacy = initialState(historicalFixture);
    legacy.tick = historicalFixture.economy.marketEveryTicks;
    confirmSealedTrial(historicalFixture, legacy);
    expect(legacy.opportunities["sealed-thermal-study"]).toBeUndefined();

    const input = JSON.parse(JSON.stringify(legacy));
    input.schemaVersion = 9;
    delete input.milestones;

    const restored = new Simulation(historicalFixture);
    expect(restored.load(input).ok).toBe(true);
    expect(restored.serialize().schemaVersion).toBe(26);
    expect(
      restored.serialize().opportunities["sealed-thermal-study"],
    ).toBeUndefined();
    expect(restored.serialize().milestones["sealed-study-certified"]).toEqual({
      completedAt: legacy.tick,
    });
    expect(
      restored
        .snapshot()
        .exchange.find((listing) => listing.materialId === "granules")
        ?.handling,
    ).toEqual({
      nameKey: "terminal.capability.sealed-sample-outbound.name",
      unlocked: true,
    });
  });
});
