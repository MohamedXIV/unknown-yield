import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import { Simulation, type GameCommand } from "../src/index";

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

function makeFactory() {
  const sim = new Simulation(fixture);
  const factoryId = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 22,
    width: 10,
    height: 10,
  });

  build(sim, {
    type: "placePort",
    factoryId,
    x: 24,
    y: 27,
    direction: 0,
  });
  build(sim, {
    type: "placePort",
    factoryId,
    x: 33,
    y: 27,
    direction: 0,
  });
  build(sim, {
    type: "placePort",
    factoryId,
    x: 28,
    y: 22,
    direction: 1,
  });
  build(sim, {
    type: "placePort",
    factoryId,
    x: 28,
    y: 31,
    direction: 1,
  });

  const machineId = build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 26,
    direction: 0,
  });

  return { sim, factoryId, machineId };
}

describe("factory external contract", () => {
  it("derives port roles and detailed machine status without recipe inference", () => {
    const { sim, factoryId } = makeFactory();
    const factory = sim
      .snapshot()
      .factories.find((candidate) => candidate.id === factoryId)!;

    expect(
      factory.ports.map(({ x, y, direction, role }) => ({
        x,
        y,
        direction,
        role,
      })),
    ).toEqual([
      { x: 24, y: 27, direction: 0, role: "input" },
      { x: 33, y: 27, direction: 0, role: "output" },
      { x: 28, y: 22, direction: 1, role: "input" },
      { x: 28, y: 31, direction: 1, role: "output" },
    ]);
    expect(factory.contract.machineCount).toBe(1);
    expect(factory.contract.statusCounts["needs-input"]).toBe(1);
    expect(factory.contract.statusCounts.processing).toBe(0);

    const serialized = JSON.stringify(factory);
    expect(serialized).not.toContain("heat-raw");
    expect(serialized).not.toContain("reaction.");
    expect(serialized).not.toContain("outputId");
  });

  it("tracks authoritative detailed status and round-trips identically through save/load", () => {
    const { sim, factoryId, machineId } = makeFactory();

    expect(
      sim.command({
        type: "setEnabled",
        machineId,
        enabled: false,
      }).ok,
    ).toBe(true);

    const before = sim
      .snapshot()
      .factories.find((candidate) => candidate.id === factoryId)!;
    expect(before.contract.statusCounts.disabled).toBe(1);
    expect(before.contract.statusCounts["needs-input"]).toBe(0);

    const save = sim.serialize();
    expect(save.factories[factoryId]).not.toHaveProperty("contract");
    expect(save.factories[factoryId].ports[0]).not.toHaveProperty("role");

    const restored = new Simulation(fixture);
    expect(restored.load(JSON.parse(JSON.stringify(save))).ok).toBe(true);

    const after = restored
      .snapshot()
      .factories.find((candidate) => candidate.id === factoryId)!;
    expect(after).toEqual(before);
  });
});
