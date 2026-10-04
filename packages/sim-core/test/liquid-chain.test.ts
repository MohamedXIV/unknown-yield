import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import { Simulation, auditLedger, type GameCommand } from "../src/index";

describe("authored liquid discovery chain", () => {
  it("discovers by observed output and conserves a normal-command solid-liquid-solid route", () => {
    const sim = new Simulation(fixture);
    expect(sim.snapshot().materials.some((m) => m.id === "liquid-0")).toBe(
      false,
    );
    const build = (command: GameCommand) => {
      const r = sim.command(
        command.type === "placePipes" ||
          command.type === "placeTank" ||
          command.type === "placePump"
          ? { ...command, containmentProfileId: "lined" }
          : command,
      );
      expect(r.ok, JSON.stringify(command) + ": " + r.message).toBe(true);
      return r;
    };
    const factory = build({
      type: "placeFactory",
      x: 23,
      y: 33,
      width: 20,
      height: 10,
    });
    build({
      type: "placePort",
      factoryId: factory.id!,
      x: 23,
      y: 36,
      direction: 0,
    });
    build({
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 35,
      direction: 0,
    });
    build({
      type: "placeMachine",
      definitionId: "liquefier",
      x: 25,
      y: 35,
      direction: 0,
    });
    build({
      type: "placeBelts",
      points: Array.from({ length: 8 }, (_, i) => ({ x: 17 + i, y: 36 })),
      direction: 0,
    });
    const feed = build({ type: "placePump", x: 27, y: 36, direction: 0 });
    build({
      type: "placePipes",
      points: [28, 29, 30].map((x) => ({ x, y: 36, inlet: 2, outlet: 0 })),
    });
    build({ type: "placeTank", x: 31, y: 35, direction: 0 });
    build({ type: "placePump", x: 33, y: 36, direction: 0 });
    build({
      type: "placePipes",
      points: [34, 35].map((x) => ({ x, y: 36, inlet: 2, outlet: 0 })),
    });
    const processor = build({
      type: "placeMachine",
      definitionId: "precipitator",
      x: 36,
      y: 35,
      direction: 0,
    });
    for (let n = 0; n < 220; n++) {
      sim.step(fixture.tickMs);
      expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
    }
    const save = sim.serialize();
    expect(save.knowledge).toContain("liquefy-raw");
    expect(save.knowledge).toContain("precipitate-liquid-0");
    expect(sim.snapshot().materials.some((m) => m.id === "liquid-0")).toBe(
      true,
    );
    expect(save.machines[processor.id!].output.granules).toBeGreaterThan(0);
    const snapshot = sim.snapshot();
    if (snapshot.pipes.length) snapshot.pipes[0].quantity = 999;
    expect(sim.serialize()).toEqual(save);
    const restored = new Simulation(fixture);
    expect(restored.load(save).ok).toBe(true);
    for (let n = 0; n < 60; n++) {
      sim.step(fixture.tickMs);
      restored.step(fixture.tickMs);
      expect(restored.serialize()).toEqual(sim.serialize());
      expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
    }
    expect(
      sim.command({ type: "setPumpEnabled", id: feed.id!, enabled: false }).ok,
    ).toBe(true);
    for (let n = 0; n < 30; n++) {
      sim.step(fixture.tickMs);
      expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
    }
    const pipe = sim.serialize().pipes["28,36"];
    expect(pipe.quantity).toBe(0);
    const plates = sim.serialize().stock.plates;
    expect(
      sim.command({
        type: "setLiquidContainmentProfile",
        id: pipe.id,
        containmentProfileId: "standard",
      }).ok,
    ).toBe(true);
    expect(sim.serialize().stock.plates).toBe(plates + 2);
    expect(
      sim.command({
        type: "setLiquidContainmentProfile",
        id: pipe.id,
        containmentProfileId: "lined",
      }).ok,
    ).toBe(true);
    expect(
      sim.command({ type: "setPumpEnabled", id: feed.id!, enabled: true }).ok,
    ).toBe(true);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  });
});
