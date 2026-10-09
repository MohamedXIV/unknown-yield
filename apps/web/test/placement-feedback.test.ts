import { fixture } from "@site/content";
import { Simulation } from "@site/sim-core";
import { describe, expect, it } from "vitest";
import { deriveFeedbackEvents } from "../game/feedback";
import { derivePlacementFeedback } from "../game/placement-feedback";

describe("command-owned placement feedback", () => {
  it("emits exactly one heavy cue for a successfully placed machine", () => {
    const sim = new Simulation(fixture);
    const before = sim.snapshot();
    const command = {
      type: "placeMachine" as const,
      definitionId: "extractor",
      x: 18,
      y: 26,
      direction: 0,
    };
    const result = sim.command(command);
    expect(result.ok, result.message).toBe(true);
    const after = sim.snapshot();
    const machine = after.machines.find((m) => m.id === result.id)!;
    expect(derivePlacementFeedback(command, result, before, after)).toEqual([
      {
        kind: "placement-heavy",
        id: machine.id,
        at: {
          x: machine.x + machine.width / 2,
          y: machine.y + machine.height / 2,
        },
        footprint: {
          x: machine.x,
          y: machine.y,
          width: machine.width,
          height: machine.height,
        },
        placedCount: 1,
      },
    ]);
    // Phase-16 status diffs must not misclassify a newly constructed machine.
    expect(
      deriveFeedbackEvents(before, after).some(
        (event) => event.kind === "placement-heavy",
      ),
    ).toBe(false);
  });

  it("coalesces a multi-cell route into one short, positionally accurate cue", () => {
    const before = new Simulation(fixture).snapshot();
    const after = structuredClone(before);
    const points = [
      { x: 10, y: 12 },
      { x: 11, y: 12 },
      { x: 12, y: 12 },
    ];
    after.belts.push(
      ...points.map((point, index) => ({
        id: "new-path-" + index,
        ...point,
        direction: 0,
        cargo: null,
        alternate: null,
        switched: false,
      })),
    );
    const command = { type: "placeBelts" as const, points, direction: 0 };
    expect(
      derivePlacementFeedback(
        command,
        { ok: true, message: "Built" },
        before,
        after,
      ),
    ).toEqual([
      {
        kind: "placement-light",
        id: "new-path-0",
        at: { x: 11.5, y: 12.5 },
        footprint: { x: 10, y: 12, width: 3, height: 1 },
        placedCount: 3,
      },
    ]);
  });

  it("rejects false positives on failure, unchanged state, and non-build commands", () => {
    const before = new Simulation(fixture).snapshot();
    const after = structuredClone(before);
    const cmd = {
      type: "placeBelts" as const,
      points: [{ x: 4, y: 5 }],
      direction: 0,
    };
    after.belts.push({
      id: "blocked-belt",
      x: 4,
      y: 5,
      direction: 0,
      cargo: null,
      alternate: null,
      switched: false,
    });
    expect(
      derivePlacementFeedback(
        cmd,
        { ok: false, message: "blocked" },
        before,
        after,
      ),
    ).toEqual([]);
    expect(
      derivePlacementFeedback(
        cmd,
        { ok: true, message: "no actual change" },
        before,
        before,
      ),
    ).toEqual([]);
    expect(
      derivePlacementFeedback(
        { type: "dispatchShipment" },
        { ok: true, message: "ok" },
        before,
        after,
      ),
    ).toEqual([]);
  });

  it("emits no placement cue for a successful zero-cost belt reuse", () => {
    const sim = new Simulation(fixture);
    const command = {
      type: "placeBelts" as const,
      points: [
        { x: 12, y: 12 },
        { x: 13, y: 12 },
      ],
      direction: 0,
    };
    expect(sim.command(command).ok).toBe(true);
    const before = sim.snapshot();
    const result = sim.command(command);
    const after = sim.snapshot();

    expect(result).toMatchObject({
      ok: true,
      cost: 0,
      beltPlan: { newCount: 0 },
    });
    expect(derivePlacementFeedback(command, result, before, after)).toEqual([]);
  });

  it("emits no cue for successful pipe or pressure-line reuse", () => {
    const sim = new Simulation(fixture),
      profile = fixture.liquidLogistics!.containmentProfiles[0].id,
      pipes = {
        type: "placePipes" as const,
        containmentProfileId: profile,
        points: [{ x: 30, y: 20, inlet: 2, outlet: 0 }],
      },
      pressureLines = {
        type: "placePressureLines" as const,
        points: [{ x: 30, y: 22, inlet: 2, outlet: 0 }],
      };
    expect(sim.command(pipes).ok).toBe(true);
    expect(sim.command(pressureLines).ok).toBe(true);
    const before = sim.snapshot(),
      beforeSave = JSON.stringify(sim.serialize()),
      pipeResult = sim.command(pipes),
      gasResult = sim.command(pressureLines),
      after = sim.snapshot();

    expect(pipeResult).toMatchObject({
      ok: true,
      cost: 0,
      linePlan: { newCount: 0 },
    });
    expect(gasResult).toMatchObject({
      ok: true,
      cost: 0,
      linePlan: { newCount: 0 },
    });
    expect(derivePlacementFeedback(pipes, pipeResult, before, after)).toEqual(
      [],
    );
    expect(
      derivePlacementFeedback(pressureLines, gasResult, before, after),
    ).toEqual([]);
    expect(JSON.stringify(sim.serialize())).toBe(beforeSave);
  });

  it("does not play new build cues when restoring or ticking a snapshot", () => {
    const before = new Simulation(fixture).snapshot();
    const restored = structuredClone(before);
    restored.belts.push({
      id: "saved-belt",
      x: 10,
      y: 12,
      direction: 0,
      cargo: null,
      alternate: null,
      switched: false,
    });
    // Only the explicit command-success path calls derivePlacementFeedback.
    expect(
      deriveFeedbackEvents(before, restored).filter((event) =>
        event.kind.startsWith("placement-"),
      ),
    ).toEqual([]);
    expect(deriveFeedbackEvents(restored, structuredClone(restored))).toEqual(
      [],
    );
  });
});
