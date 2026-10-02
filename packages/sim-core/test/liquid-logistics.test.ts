import { describe, expect, it } from "vitest";
import { fixture, validateContent } from "@site/content";
import { Simulation, auditLedger } from "../src/index";
import { transportLiquids } from "../src/liquids";

function seed() {
  const draft = structuredClone(fixture);
  draft.materials.find((m) => m.id === "raw")!.handlingState = "liquid";
  for (const m of draft.machines) {
    m.inputStates = ["solid", "liquid"];
    m.outputStates = ["solid", "liquid"];
  }
  const content = validateContent(draft),
    state = new Simulation(content).serialize();
  state.pipes = {
    "19,11": {
      id: "l1",
      x: 19,
      y: 11,
      inlet: 2,
      outlet: 0,
      materialId: "raw",
      quantity: 3,
    },
    "20,11": {
      id: "l2",
      x: 20,
      y: 11,
      inlet: 2,
      outlet: 0,
      materialId: null,
      quantity: 0,
    },
  };
  return { content, state };
}
describe("directed liquid quantity transport", () => {
  it("moves at most one edge using pre-step quantities", () => {
    const { content, state } = seed();
    transportLiquids(content, state);
    expect(state.pipes["19,11"].quantity).toBe(2);
    expect(state.pipes["20,11"].quantity).toBe(1);
    transportLiquids(content, state);
    expect(state.pipes["20,11"].quantity).toBe(2);
  });
  it("retains quantity when a full outlet blocks", () => {
    const { content, state } = seed();
    state.pipes["20,11"].materialId = "raw";
    state.pipes["20,11"].quantity = 4;
    const before = structuredClone(state);
    transportLiquids(content, state);
    expect(state).toEqual(before);
  });
  it("drains admitted liquid with a disabled source pump and spends no fuel", () => {
    const { content, state } = seed();
    state.tanks = {
      t3: {
        id: "t3",
        x: 16,
        y: 10,
        direction: 0,
        materialId: "raw",
        quantity: 8,
      },
      t4: {
        id: "t4",
        x: 21,
        y: 10,
        direction: 0,
        materialId: null,
        quantity: 0,
      },
    };
    state.pumps = {
      u5: { id: "u5", x: 18, y: 11, direction: 0, enabled: false },
    };
    state.pipes["20,11"].materialId = "raw";
    state.pipes["20,11"].quantity = 1;
    const fuel = state.fuel;
    transportLiquids(content, state);
    expect(state.tanks.t3.quantity).toBe(8);
    expect(state.tanks.t4.quantity).toBe(1);
    expect(state.fuel).toBe(fuel);
  });
  it("charges fuel only for successful source admission", () => {
    const { content, state } = seed();
    state.tanks = {
      t3: {
        id: "t3",
        x: 16,
        y: 10,
        direction: 0,
        materialId: "raw",
        quantity: 8,
      },
    };
    state.pumps = {
      u5: { id: "u5", x: 18, y: 11, direction: 0, enabled: true },
    };
    const fuel = state.fuel;
    transportLiquids(content, state);
    expect(state.tanks.t3.quantity).toBe(7);
    expect(state.pipes["19,11"].quantity).toBe(3);
    expect(state.fuel).toBe(fuel - 1);
    state.pipes["19,11"].quantity = 4;
    transportLiquids(content, state);
    expect(state.tanks.t3.quantity).toBe(7);
    expect(state.fuel).toBe(fuel - 1);
  });
  it("is independent of record insertion order", () => {
    const { content, state } = seed(),
      reversed = structuredClone(state);
    reversed.pipes = Object.fromEntries(
      Object.entries(reversed.pipes).reverse(),
    );
    transportLiquids(content, state);
    transportLiquids(content, reversed);
    expect(reversed).toEqual(state);
  });
});

describe("liquid construction", () => {
  it("places atomically, refuses overlaps and reconciles construction refunds", () => {
    const sim = new Simulation(fixture);
    const before = sim.serialize();
    expect(
      sim.command({
        type: "placePipes",
        points: [
          { x: 10, y: 10, inlet: 2, outlet: 0 },
          { x: 10, y: 10, inlet: 2, outlet: 0 },
        ],
      }).ok,
    ).toBe(false);
    expect(sim.serialize()).toEqual(before);
    const result = sim.command({
      type: "placePipes",
      points: [
        { x: 10, y: 10, inlet: 2, outlet: 0 },
        { x: 11, y: 10, inlet: 2, outlet: 0 },
      ],
    });
    expect(result.ok).toBe(true);
    expect(
      sim.command({
        type: "placeBelts",
        points: [{ x: 10, y: 10 }],
        direction: 0,
      }).ok,
    ).toBe(false);
    expect(
      sim.command({ type: "dismantle", id: sim.serialize().pipes["10,10"].id })
        .ok,
    ).toBe(true);
    expect(sim.serialize().stock.plates).toBe(
      before.stock.plates - fixture.liquidLogistics!.pipe.cost,
    );
  });
  it("places tank/pump, toggles source feed and saves exact infrastructure", () => {
    const sim = new Simulation(fixture);
    expect(
      sim.command({ type: "placeTank", x: 10, y: 10, direction: 0 }).ok,
    ).toBe(true);
    const pump = sim.command({ type: "placePump", x: 12, y: 11, direction: 0 });
    expect(pump.ok).toBe(true);
    expect(
      sim.command({ type: "setPumpEnabled", id: pump.id, enabled: false }).ok,
    ).toBe(true);
    const save = sim.serialize(),
      restored = new Simulation(fixture);
    expect(restored.load(save).ok).toBe(true);
    expect(restored.serialize()).toEqual(save);
  });
});

describe("conservative liquid expedition state", () => {
  function expedition() {
    const draft = structuredClone(fixture);
    for (const id of ["raw", "ferrite"])
      draft.materials.find((m) => m.id === id)!.handlingState = "liquid";
    for (const m of draft.machines) {
      m.inputStates = ["solid", "liquid"];
      m.outputStates = ["solid", "liquid"];
    }
    const content = validateContent(draft),
      sim = new Simulation(content);
    const source = sim.command({
      type: "placeTank",
      x: 10,
      y: 10,
      direction: 0,
    });
    const pump = sim.command({ type: "placePump", x: 12, y: 11, direction: 0 });
    expect(source.ok && pump.ok).toBe(true);
    expect(
      sim.command({
        type: "placePipes",
        points: [
          { x: 13, y: 11, inlet: 2, outlet: 0 },
          { x: 14, y: 11, inlet: 2, outlet: 0 },
        ],
      }).ok,
    ).toBe(true);
    const target = sim.command({
      type: "placeTank",
      x: 15,
      y: 10,
      direction: 0,
    });
    expect(target.ok).toBe(true);
    const state = sim.serialize(),
      deposit = content.site.deposits.find((d) => d.material === "raw")!;
    state.deposits[deposit.id] -= 8;
    state.tanks[source.id!].materialId = "raw";
    state.tanks[source.id!].quantity = 8;
    expect(auditLedger(content, state).ok).toBe(true);
    expect(sim.load(state).ok).toBe(true);
    return {
      content,
      sim,
      source: source.id!,
      pump: pump.id!,
      target: target.id!,
    };
  }
  it("conserves every location and resumes exactly after a blocked/disabled save", () => {
    const { content, sim, pump, target } = expedition();
    for (let n = 0; n < 12; n++) {
      sim.step(content.tickMs);
      expect(auditLedger(content, sim.serialize()).ok).toBe(true);
    }
    expect(sim.serialize().tanks[target].quantity).toBeGreaterThan(0);
    expect(
      sim.command({ type: "setPumpEnabled", id: pump, enabled: false }).ok,
    ).toBe(true);
    const restored = new Simulation(content);
    expect(restored.load(sim.serialize()).ok).toBe(true);
    for (let n = 0; n < 15; n++) {
      sim.step(content.tickMs);
      restored.step(content.tickMs);
      expect(restored.serialize()).toEqual(sim.serialize());
      expect(auditLedger(content, sim.serialize()).ok).toBe(true);
    }
  });
  it("refuses loaded tank/pipe edits and dismantling atomically", () => {
    const { sim, source, content } = expedition();
    const before = sim.serialize();
    expect(sim.command({ type: "dismantle", id: source }).ok).toBe(false);
    expect(sim.serialize()).toEqual(before);
    sim.step(content.tickMs * content.site.transportEveryTicks);
    const loaded = sim.serialize(),
      pipe = loaded.pipes["13,11"];
    expect(pipe.quantity).toBeGreaterThan(0);
    expect(
      sim.command({ type: "configurePipe", id: pipe.id, inlet: 2, outlet: 1 })
        .ok,
    ).toBe(false);
    expect(sim.command({ type: "dismantle", id: pipe.id }).ok).toBe(false);
    expect(sim.serialize()).toEqual(loaded);
  });
  it("retains source without fuel and rejects incompatible target identity", () => {
    const { sim, content, source, target } = expedition();
    const state = sim.serialize();
    state.fuel = 0;
    expect(sim.load(state).ok).toBe(true);
    sim.step(content.tickMs * content.site.transportEveryTicks);
    expect(sim.serialize().tanks[source].quantity).toBe(8);
    const nextState = sim.serialize();
    nextState.fuel = 20;
    const ferrite = content.site.deposits.find(
      (d) => d.material === "ferrite",
    )!;
    nextState.deposits[ferrite.id] -= 1;
    nextState.tanks[target].materialId = "ferrite";
    nextState.tanks[target].quantity = 1;
    expect(sim.load(nextState).ok).toBe(true);
    for (let n = 0; n < 30; n++) sim.step(content.tickMs);
    const after = sim.serialize();
    expect(after.tanks[target].materialId).toBe("ferrite");
    expect(after.tanks[target].quantity).toBe(1);
    expect(auditLedger(content, after).ok).toBe(true);
  });
  it("keeps a liquid batch upstream of the dry terminal without loss or export", () => {
    const { sim, content } = expedition();
    expect(
      sim.command({
        type: "placePipes",
        points: [{ x: 37, y: 27, inlet: 2, outlet: 0 }],
      }).ok,
    ).toBe(true);
    const state = sim.serialize(),
      deposit = content.site.deposits.find((d) => d.material === "raw")!;
    state.deposits[deposit.id]--;
    state.pipes["37,27"].materialId = "raw";
    state.pipes["37,27"].quantity = 1;
    expect(sim.load(state).ok).toBe(true);
    for (let i = 0; i < 12; i++) sim.step(content.tickMs);
    const after = sim.serialize();
    expect(after.pipes["37,27"].quantity).toBe(1);
    expect(after.staging.raw ?? 0).toBe(0);
    expect(after.flows.exported.raw ?? 0).toBe(0);
    expect(auditLedger(content, after).ok).toBe(true);
  });
});
