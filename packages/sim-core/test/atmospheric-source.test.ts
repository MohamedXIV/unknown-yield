import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  experimentEvidenceKey,
  initializeKnownMarkets,
  type GameCommand,
} from "../src/index";

function confirm(sim: Simulation, reactionId: string) {
  const save = sim.serialize();
  const reaction = fixture.reactions.find((entry) => entry.id === reactionId)!;
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
  expect(sim.load(save).ok).toBe(true);
}

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

function discoverAtmosphere(sim: Simulation) {
  confirm(sim, "heat-raw-sealed");
  expect(
    sim.command({
      type: "sense",
      capabilityId: "core-probe",
      x: 70,
      y: 26,
    }),
  ).toMatchObject({ ok: true });
}

describe("non-surface atmospheric resource source", () => {
  it("requires discovery and gas knowledge before physical capture", () => {
    const sim = new Simulation(fixture);
    expect(
      sim.command({
        type: "placeMachine",
        definitionId: "atmospheric-intake",
        x: 69,
        y: 25,
        direction: 2,
      }),
    ).toMatchObject({
      ok: false,
      message: "Capability locked by unconfirmed knowledge",
    });

    discoverAtmosphere(sim);
    expect(sim.snapshot().atmosphericSources).toHaveLength(1);
    expect(
      sim.command({
        type: "placeMachine",
        definitionId: "atmospheric-intake",
        x: 69,
        y: 25,
        direction: 2,
      }),
    ).toMatchObject({
      ok: false,
      message: "Capability locked by unconfirmed knowledge",
    });

    confirm(sim, "vaporize-liquid-0");
    expect(
      sim.preview({
        type: "placeMachine",
        definitionId: "atmospheric-intake",
        x: 69,
        y: 25,
        direction: 2,
      }),
    ).toMatchObject({ ok: true });
  });

  it("captures a finite atmospheric source into the gas chain conservatively", () => {
    const sim = new Simulation(fixture);
    discoverAtmosphere(sim);
    confirm(sim, "vaporize-liquid-0");

    const beforeFuel = sim.snapshot().fuel;
    build(sim, {
      type: "placeMachine",
      definitionId: "atmospheric-intake",
      x: 69,
      y: 25,
      direction: 2,
    });
    const factoryId = build(sim, {
      type: "placeFactory",
      x: 56,
      y: 21,
      width: 10,
      height: 10,
    });
    build(sim, {
      type: "placePort",
      factoryId,
      x: 65,
      y: 26,
      direction: 2,
    });
    build(sim, {
      type: "placeMachine",
      definitionId: "gas-collector",
      x: 62,
      y: 25,
      direction: 2,
    });
    build(sim, {
      type: "placeCompressor",
      x: 68,
      y: 26,
      direction: 2,
    });
    build(sim, {
      type: "placePressureLines",
      points: [
        { x: 67, y: 26, inlet: 0, outlet: 2 },
        { x: 66, y: 26, inlet: 0, outlet: 2 },
        { x: 65, y: 26, inlet: 0, outlet: 2 },
        { x: 64, y: 26, inlet: 0, outlet: 2 },
      ],
    });

    sim.step(fixture.tickMs);
    expect(sim.serialize().atmosphericSources["atmospheric-plume-a"]).toBe(599);
    expect(sim.snapshot().fuel).toBe(beforeFuel - 2);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);

    sim.step(12000);
    const collector = sim
      .snapshot()
      .machines.find((machine) => machine.definitionId === "gas-collector")!;
    expect(collector.output.granules ?? 0).toBeGreaterThan(0);
    expect(
      sim.serialize().atmosphericSources["atmospheric-plume-a"],
    ).toBeLessThan(599);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);

    const saved = sim.serialize();
    const restored = new Simulation(fixture);
    expect(restored.load(JSON.parse(JSON.stringify(saved))).ok).toBe(true);
    expect(restored.serialize()).toEqual(saved);
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
  });

  it("rejects a forged atmospheric intake before its knowledge unlock", () => {
    const locked = new Simulation(fixture);
    discoverAtmosphere(locked);
    const lockedSave = locked.serialize();

    const unlocked = new Simulation(fixture);
    expect(unlocked.load(JSON.parse(JSON.stringify(lockedSave))).ok).toBe(true);
    confirm(unlocked, "vaporize-liquid-0");
    build(unlocked, {
      type: "placeMachine",
      definitionId: "atmospheric-intake",
      x: 69,
      y: 25,
      direction: 2,
    });
    const built = unlocked.serialize();
    const forged = JSON.parse(JSON.stringify(lockedSave));
    forged.machines = built.machines;
    forged.stock = built.stock;
    forged.nextId = built.nextId;

    expect(locked.load(forged)).toMatchObject({
      ok: false,
      message: expect.stringContaining("Machine locked by unconfirmed knowledge"),
    });
    expect(JSON.stringify(locked.snapshot())).not.toContain("gas-0");
  });

  it("rejects forged atmospheric inventory without probe evidence", () => {
    const sim = new Simulation(fixture);
    const forged = sim.serialize();
    forged.atmosphericSources["atmospheric-plume-a"] = 600;
    expect(sim.load(forged).ok).toBe(false);
    expect(JSON.stringify(sim.snapshot())).not.toContain(
      "atmospheric-plume-a",
    );
  });
});
