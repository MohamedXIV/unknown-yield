import { describe, expect, it } from "vitest";
import { fixture, validateContent } from "@site/content";
import { Simulation, auditLedger } from "../src/index";
import { transportGases, gasCompressorStatus } from "../src/gases";

function seed() {
  const draft = structuredClone(fixture);
  draft.materials.find((m) => m.id === "raw")!.handlingState = "gas";
  for (const m of draft.machines) {
    m.inputStates = ["solid", "liquid", "gas"];
    m.outputStates = ["solid", "liquid", "gas"];
  }
  const content = validateContent(draft),
    state = new Simulation(content).serialize();
  state.pressureLines = {
    "19,11": {
      id: "g1",
      x: 19,
      y: 11,
      inlet: 2,
      outlet: 0,
      materialId: "raw",
      quantity: 3,
    },
    "20,11": {
      id: "g2",
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
describe("directed gas quantity transport", () => {
  it("moves at most one edge using pre-step quantities", () => {
    const { content, state } = seed();
    transportGases(content, state);
    expect(state.pressureLines["19,11"].quantity).toBe(2);
    expect(state.pressureLines["20,11"].quantity).toBe(1);
    transportGases(content, state);
    expect(state.pressureLines["20,11"].quantity).toBe(2);
  });
  it("retains quantity when a full outlet blocks", () => {
    const { content, state } = seed();
    state.pressureLines["20,11"].materialId = "raw";
    state.pressureLines["20,11"].quantity = 4;
    const before = structuredClone(state);
    transportGases(content, state);
    expect(state).toEqual(before);
  });
  it("drains admitted gas with a disabled source pump and spends no fuel", () => {
    const { content, state } = seed();
    state.pressureVessels = {
      v3: {
        id: "v3",
        x: 16,
        y: 10,
        direction: 0,
        materialId: "raw",
        quantity: 8,
      },
      v4: {
        id: "v4",
        x: 21,
        y: 10,
        direction: 0,
        materialId: null,
        quantity: 0,
      },
    };
    state.compressors = {
      c5: { id: "c5", x: 18, y: 11, direction: 0, enabled: false },
    };
    state.pressureLines["20,11"].materialId = "raw";
    state.pressureLines["20,11"].quantity = 1;
    const fuel = state.fuel;
    transportGases(content, state);
    expect(state.pressureVessels.v3.quantity).toBe(8);
    expect(state.pressureVessels.v4.quantity).toBe(1);
    expect(state.fuel).toBe(fuel);
  });
  it("charges fuel only for successful source admission", () => {
    const { content, state } = seed();
    state.pressureVessels = {
      v3: {
        id: "v3",
        x: 16,
        y: 10,
        direction: 0,
        materialId: "raw",
        quantity: 8,
      },
    };
    state.compressors = {
      c5: { id: "c5", x: 18, y: 11, direction: 0, enabled: true },
    };
    const fuel = state.fuel;
    transportGases(content, state);
    expect(state.pressureVessels.v3.quantity).toBe(7);
    expect(state.pressureLines["19,11"].quantity).toBe(3);
    expect(state.fuel).toBe(fuel - 1);
    state.pressureLines["19,11"].quantity = 4;
    transportGases(content, state);
    expect(state.pressureVessels.v3.quantity).toBe(7);
    expect(state.fuel).toBe(fuel - 1);
  });
  it("is independent of record insertion order", () => {
    const { content, state } = seed(),
      reversed = structuredClone(state);
    reversed.pressureLines = Object.fromEntries(
      Object.entries(reversed.pressureLines).reverse(),
    );
    transportGases(content, state);
    transportGases(content, reversed);
    expect(reversed).toEqual(state);
  });
});

describe("gas construction", () => {
  it("places atomically, refuses overlaps and reconciles construction refunds", () => {
    const sim = new Simulation(fixture);
    const before = sim.serialize();
    expect(
      sim.command({
        type: "placePressureLines",
        points: [
          { x: 10, y: 10, inlet: 2, outlet: 0 },
          { x: 10, y: 10, inlet: 2, outlet: 0 },
        ],
      }).ok,
    ).toBe(false);
    expect(sim.serialize()).toEqual(before);
    const result = sim.command({
      type: "placePressureLines",
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
      sim.command({
        type: "dismantle",
        id: sim.serialize().pressureLines["10,10"].id,
      }).ok,
    ).toBe(true);
    expect(sim.serialize().stock.plates).toBe(
      before.stock.plates - fixture.gasLogistics!.line.cost,
    );
  });
  it("places tank/pump, toggles source feed and saves exact infrastructure", () => {
    const sim = new Simulation(fixture);
    expect(
      sim.command({ type: "placePressureVessel", x: 10, y: 10, direction: 0 })
        .ok,
    ).toBe(true);
    const pump = sim.command({
      type: "placeCompressor",
      x: 12,
      y: 11,
      direction: 0,
    });
    expect(pump.ok).toBe(true);
    expect(
      sim.command({ type: "setCompressorEnabled", id: pump.id, enabled: false })
        .ok,
    ).toBe(true);
    const save = sim.serialize(),
      restored = new Simulation(fixture);
    expect(restored.load(save).ok).toBe(true);
    expect(restored.serialize()).toEqual(save);
  });
});

describe("conservative gas expedition state", () => {
  function expedition() {
    const draft = structuredClone(fixture);
    for (const id of ["raw", "ferrite"])
      draft.materials.find((m) => m.id === id)!.handlingState = "gas";
    for (const m of draft.machines) {
      m.inputStates = ["solid", "liquid", "gas"];
      m.outputStates = ["solid", "liquid", "gas"];
    }
    const content = validateContent(draft),
      sim = new Simulation(content);
    const source = sim.command({
      type: "placePressureVessel",
      x: 10,
      y: 10,
      direction: 0,
    });
    const pump = sim.command({
      type: "placeCompressor",
      x: 12,
      y: 11,
      direction: 0,
    });
    expect(source.ok && pump.ok).toBe(true);
    expect(
      sim.command({
        type: "placePressureLines",
        points: [
          { x: 13, y: 11, inlet: 2, outlet: 0 },
          { x: 14, y: 11, inlet: 2, outlet: 0 },
        ],
      }).ok,
    ).toBe(true);
    const target = sim.command({
      type: "placePressureVessel",
      x: 15,
      y: 10,
      direction: 0,
    });
    expect(target.ok).toBe(true);
    const state = sim.serialize(),
      deposit = content.site.deposits.find((d) => d.material === "raw")!;
    state.deposits[deposit.id] -= 8;
    state.pressureVessels[source.id!].materialId = "raw";
    state.pressureVessels[source.id!].quantity = 8;
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
    expect(sim.serialize().pressureVessels[target].quantity).toBeGreaterThan(0);
    expect(
      sim.command({ type: "setCompressorEnabled", id: pump, enabled: false })
        .ok,
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
      pipe = loaded.pressureLines["13,11"];
    expect(pipe.quantity).toBeGreaterThan(0);
    expect(
      sim.command({
        type: "configurePressureLine",
        id: pipe.id,
        inlet: 2,
        outlet: 1,
      }).ok,
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
    expect(sim.serialize().pressureVessels[source].quantity).toBe(8);
    const nextState = sim.serialize();
    nextState.fuel = 20;
    const ferrite = content.site.deposits.find(
      (d) => d.material === "ferrite",
    )!;
    nextState.deposits[ferrite.id] -= 1;
    nextState.pressureVessels[target].materialId = "ferrite";
    nextState.pressureVessels[target].quantity = 1;
    expect(sim.load(nextState).ok).toBe(true);
    for (let n = 0; n < 30; n++) sim.step(content.tickMs);
    const after = sim.serialize();
    expect(after.pressureVessels[target].materialId).toBe("ferrite");
    expect(after.pressureVessels[target].quantity).toBe(1);
    expect(auditLedger(content, after).ok).toBe(true);
  });
  it("keeps a gas batch upstream of the dry terminal without loss or export", () => {
    const { sim, content } = expedition();
    expect(
      sim.command({
        type: "placePressureLines",
        points: [{ x: 37, y: 27, inlet: 2, outlet: 0 }],
      }).ok,
    ).toBe(true);
    const state = sim.serialize(),
      deposit = content.site.deposits.find((d) => d.material === "raw")!;
    state.deposits[deposit.id]--;
    state.pressureLines["37,27"].materialId = "raw";
    state.pressureLines["37,27"].quantity = 1;
    expect(sim.load(state).ok).toBe(true);
    for (let i = 0; i < 12; i++) sim.step(content.tickMs);
    const after = sim.serialize();
    expect(after.pressureLines["37,27"].quantity).toBe(1);
    expect(after.staging.raw ?? 0).toBe(0);
    expect(after.flows.exported.raw ?? 0).toBe(0);
    expect(auditLedger(content, after).ok).toBe(true);
  });
});

describe("gas containment compatibility", () => {
  it("retains gas against liquid pipes/tanks and ordinary solid storage", () => {
    const { content, state } = seed();
    delete state.pressureLines["20,11"];
    for (const destination of ["liquid-pipe", "liquid-tank", "depot"]) {
      const s = structuredClone(state);
      if (destination === "liquid-pipe")
        s.pipes["20,11"] = {
          id: "l7", containmentProfileId: "standard",
          x: 20,
          y: 11,
          inlet: 2,
          outlet: 0,
          materialId: null,
          quantity: 0,
        };
      if (destination === "liquid-tank")
        s.tanks.t7 = {
          id: "t7", containmentProfileId: "standard",
          x: 20,
          y: 10,
          direction: 0,
          materialId: null,
          quantity: 0,
        };
      if (destination === "depot")
        s.storages.s7 = {
          id: "s7",
          x: 20,
          y: 10,
          direction: 0,
          definitionId: "depot",
          inventory: {},
        };
      const before = structuredClone(s);
      transportGases(content, s);
      expect(s).toEqual(before);
    }
  });
  it("reports liquid sources as incompatible and never compresses them", () => {
    const { content, state } = seed();
    state.tanks.t3 = {
      id: "t3", containmentProfileId: "standard",
      x: 16,
      y: 10,
      direction: 0,
      materialId: "liquid-0",
      quantity: 8,
    };
    const compressor = { id: "c5", x: 18, y: 11, direction: 0, enabled: true };
    state.compressors.c5 = compressor;
    expect(gasCompressorStatus(content, state, compressor)).toBe(
      "incompatible",
    );
    const before = structuredClone(state);
    transportGases(content, state);
    expect(state.tanks.t3).toEqual(before.tanks.t3);
    expect(state.fuel).toBe(before.fuel);
  });
  it("reports an ordinary pipe outlet as incompatible while preserving upstream gas", () => {
    const { content, state } = seed();
    delete state.pressureLines["19,11"];
    state.pressureVessels.v3 = {
      id: "v3",
      x: 16,
      y: 10,
      direction: 0,
      materialId: "raw",
      quantity: 8,
    };
    const compressor = { id: "c5", x: 18, y: 11, direction: 0, enabled: true };
    state.compressors.c5 = compressor;
    state.pipes["19,11"] = {
      id: "l7", containmentProfileId: "standard",
      x: 19,
      y: 11,
      inlet: 2,
      outlet: 0,
      materialId: null,
      quantity: 0,
    };
    expect(gasCompressorStatus(content, state, compressor)).toBe(
      "incompatible",
    );
    const before = structuredClone(state);
    transportGases(content, state);
    expect(state).toEqual(before);
  });
});
