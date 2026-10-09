import { FactoryThroughputMonitor } from "../src/factory-throughput";
import { terminalState } from "./terminal-helpers";
import { validateContent } from "@site/content";
import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  experimentEvidenceKey,
  initializeKnownMarkets,
  type FactoryThroughputView,
  type GameCommand,
} from "../src/index";

function withGranuleHandling() {
  const sim = new Simulation(fixture),
    save = sim.serialize(),
    reaction = fixture.reactions.find(
      (entry) => entry.id === "heat-raw-sealed",
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
  initializeKnownMarkets(fixture, save);
  const loaded = sim.load(save);
  expect(loaded.ok, loaded.message).toBe(true);
  expect(
    sim
      .snapshot()
      .milestones.find((entry) => entry.id === "sealed-study-certified")
      ?.completed,
  ).toBe(true);
  expect(
    sim.snapshot().exchange.find((entry) => entry.materialId === "granules")
      ?.handling?.unlocked,
  ).toBe(true);
  return sim;
}

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

function path(x: number, y: number, endX: number, direction = 0) {
  const points = [{ x, y }];
  while (x !== endX) {
    x += Math.sign(endX - x);
    points.push({ x, y });
  }
  return { type: "placeBelts" as const, points, direction };
}

function makeLine() {
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
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 26,
    direction: 0,
  });
  const processorId = build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 26,
    direction: 0,
  });
  build(sim, path(20, 27, 26));
  build(sim, path(29, 27, 37));
  return { sim, factoryId, processorId };
}

function makeBackloggedTerminalLine() {
  const sim = withGranuleHandling();
  const factoryId = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 33,
    width: 10,
    height: 10,
  });
  build(sim, {
    type: "placePort",
    factoryId,
    x: 24,
    y: 36,
    direction: 0,
  });
  build(sim, {
    type: "placePort",
    factoryId,
    x: 33,
    y: 36,
    direction: 0,
  });
  build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 17,
    y: 35,
    direction: 0,
  });
  const processorId = build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 35,
    direction: 0,
  });
  build(sim, path(19, 36, 26));
  build(sim, path(29, 36, 34));

  for (let i = 0; i < 3000; i++) {
    sim.step(100);
    const processor = sim
      .snapshot()
      .machines.find((machine) => machine.id === processorId)!;
    if (processor.status === "output-full") break;
    if (i === 2999) throw new Error("Expected the partial route to back up");
  }

  if (sim.snapshot().fuel < 2)
    expect(sim.command({ type: "assistance" }).ok).toBe(true);

  const extension = [
    { x: 35, y: 36 },
    { x: 36, y: 36 },
    { x: 37, y: 36 },
  ];
  for (let y = 35; y >= 26; y--) extension.push({ x: 37, y });
  build(sim, {
    type: "placeBelts",
    points: extension,
    direction: 0,
  });

  return { sim, factoryId, processorId };
}
it("preserves a live certificate across unrelated terminal install and remove", () => {
  const { sim, factoryId } = makeLine(),
    save = sim.serialize(),
    unlocked = terminalState();
  save.knowledge = unlocked.knowledge;
  save.evidence = unlocked.evidence;
  save.market = unlocked.market;
  save.milestones = unlocked.milestones;
  expect(sim.load(save).ok).toBe(true);
  for (let i = 0; i < 600; i++) sim.step(fixture.tickMs);
  const before = sim.snapshot().factories.find((f) => f.id === factoryId)!
    .contract.throughput;
  expect(before.state).toBe("stable");
  for (const type of [
    "installTerminalModule",
    "removeTerminalModule",
  ] as const) {
    expect(sim.command({ type, definitionId: "liquid-dock" }).ok).toBe(true);
    expect(
      sim.snapshot().factories.find((f) => f.id === factoryId)!.contract
        .throughput,
    ).toEqual(before);
  }
});
it("preserves a live certificate when an unrelated empty tank changes profile", () => {
  const { sim, factoryId } = makeLine();
  const tank = build(sim, { type: "placeTank", x: 5, y: 5, direction: 0 });
  build(sim, {
    type: "placePipes",
    points: [{ x: 30, y: 29, inlet: 2, outlet: 0 }],
  });
  for (let i = 0; i < 600; i++) sim.step(fixture.tickMs);
  const before = sim.snapshot().factories.find((f) => f.id === factoryId)!
    .contract.throughput;
  expect(before.state).toBe("stable");
  expect(
    sim.command({
      type: "setLiquidContainmentProfile",
      id: tank,
      containmentProfileId: "lined",
    }).ok,
  ).toBe(true);
  expect(
    sim.snapshot().factories.find((f) => f.id === factoryId)!.contract
      .throughput,
  ).toEqual(before);
  const pipe = sim.serialize().pipes["30,29"];
  expect(
    sim.command({
      type: "setLiquidContainmentProfile",
      id: pipe.id,
      containmentProfileId: "lined",
    }).ok,
  ).toBe(true);
  expect(
    sim.snapshot().factories.find((f) => f.id === factoryId)!.contract
      .throughput.state,
  ).toBe("measuring");
});
it("preserves unrelated certification across incident service and repair commands", () => {
  const { sim, factoryId } = makeLine();
  const pump = build(sim, {
    type: "placePump",
    x: 5,
    y: 5,
    direction: 0,
    containmentProfileId: "lined",
  });
  const s = sim.serialize();
  s.pumps[pump].enabled = false;
  const unlocked = terminalState();
  s.knowledge = unlocked.knowledge;
  s.evidence = unlocked.evidence;
  s.market = unlocked.market;
  s.milestones = unlocked.milestones;
  s.pumps[pump].incident = {
    definitionId: "pump-corrosion",
    materialId: "liquid-0",
    quantity: 0,
    startedAt: 0,
    drainEnabled: false,
  };
  expect(sim.load(s).ok).toBe(true);
  for (let i = 0; i < 600; i++) sim.step(fixture.tickMs);
  const before = sim.snapshot().factories.find((f) => f.id === factoryId)!
    .contract.throughput;
  expect(before.state).toBe("stable");
  build(sim, { type: "setPumpRecoveryDrain", id: pump, enabled: true });
  expect(
    sim.snapshot().factories.find((f) => f.id === factoryId)!.contract
      .throughput,
  ).toEqual(before);
  build(sim, { type: "repairPump", id: pump });
  expect(
    sim.snapshot().factories.find((f) => f.id === factoryId)!.contract
      .throughput,
  ).toEqual(before);
});

function throughput(sim: Simulation, factoryId: string) {
  return sim.snapshot().factories.find((factory) => factory.id === factoryId)!
    .contract.throughput;
}

function certify(sim: Simulation, factoryId: string, limit = 700) {
  for (let i = 0; i < limit; i++) {
    sim.step(100);
    const view = throughput(sim, factoryId);
    if (view.state === "stable") return view;
  }
  throw new Error("Factory did not reach stable throughput certification");
}

function stable(view: FactoryThroughputView) {
  expect(view.state).toBe("stable");
  expect(view.cycleTicks).toBeGreaterThan(0);
  expect(view.inputs).toEqual([
    expect.objectContaining({
      materialId: "ferrite",
      units: expect.any(Number),
      unitsPerMinute: expect.any(Number),
    }),
  ]);
  expect(view.outputs).toEqual([
    expect.objectContaining({
      materialId: "plates",
      units: expect.any(Number),
      unitsPerMinute: expect.any(Number),
    }),
  ]);
  expect(view.inputs[0].units).toBeGreaterThan(0);
  expect(view.outputs[0].units).toBeGreaterThan(0);
  expect(view.inputs[0].unitsPerMinute).toBeGreaterThan(0);
  expect(view.outputs[0].unitsPerMinute).toBeGreaterThan(0);
}

describe("district route throughput invalidation", () => {
  it("preserves throughput certification when a belt path is a zero-cost reuse", () => {
    const { sim, factoryId } = makeLine();
    const certified = certify(sim, factoryId);
    const before = sim.serialize();

    const result = sim.command(path(20, 27, 26));

    expect(result).toMatchObject({ ok: true, cost: 0 });
    expect(result.beltPlan).toMatchObject({ newCount: 0 });
    expect(sim.serialize()).toEqual(before);
    expect(throughput(sim, factoryId)).toEqual(certified);
  });

  it("preserves throughput certification when liquid and gas paths are reused", () => {
    const { sim, factoryId } = makeLine(),
      profile = fixture.liquidLogistics!.containmentProfiles[0].id,
      pipes = Array.from({ length: 3 }, (_, index) => ({
        x: 10 + index,
        y: 10,
        inlet: 2,
        outlet: 0,
      })),
      pressureLines = Array.from({ length: 3 }, (_, index) => ({
        x: 10 + index,
        y: 12,
        inlet: 2,
        outlet: 0,
      }));
    expect(
      sim.command({
        type: "placePipes",
        containmentProfileId: profile,
        points: pipes,
      }).ok,
    ).toBe(true);
    expect(
      sim.command({ type: "placePressureLines", points: pressureLines }).ok,
    ).toBe(true);
    const certified = certify(sim, factoryId),
      before = sim.serialize();

    expect(
      sim.command({
        type: "placePipes",
        containmentProfileId: profile,
        points: pipes,
      }),
    ).toMatchObject({ ok: true, cost: 0, linePlan: { newCount: 0 } });
    expect(
      sim.command({ type: "placePressureLines", points: pressureLines }),
    ).toMatchObject({ ok: true, cost: 0, linePlan: { newCount: 0 } });
    expect(sim.serialize()).toEqual(before);
    expect(throughput(sim, factoryId)).toEqual(certified);
  });

  it("preserves certification on idempotent route selection and resets on a real route change", () => {
    const { sim, factoryId } = makeLine(),
      divert = sim
        .snapshot()
        .belts.find((belt) => belt.x === 35 && belt.y === 27)!;
    expect(divert).toBeDefined();
    expect(sim.command({ type: "rotateDivert", beltId: divert.id }).ok).toBe(
      true,
    );

    const certified = certify(sim, factoryId);
    expect(certified.state).toBe("stable");

    const stateBefore = sim.serialize();
    expect(
      sim.command({
        type: "setDivertRoute",
        beltId: divert.id,
        route: "primary",
      }),
    ).toMatchObject({ ok: true, message: "Primary feed selected" });
    expect(sim.serialize()).toEqual(stateBefore);
    expect(throughput(sim, factoryId)).toEqual(certified);

    expect(
      sim.command({
        type: "setDivertRoute",
        beltId: divert.id,
        route: "alternate",
      }),
    ).toMatchObject({ ok: true, message: "Alternate feed selected" });
    expect(throughput(sim, factoryId)).toEqual({
      state: "measuring",
      cycleTicks: null,
      inputs: [],
      outputs: [],
    });
  });
});

describe("stable factory throughput contract", () => {
  it("certifies through the partial-input wait in a multi-unit cycle", () => {
    const { sim, factoryId, processorId } = makeLine();
    let sawPartialInput = false;

    for (let i = 0; i < 100; i++) {
      sim.step(100);
      if (
        sim.snapshot().machines.find((machine) => machine.id === processorId)
          ?.status === "needs-compatible-input"
      ) {
        sawPartialInput = true;
        break;
      }
    }

    expect(sawPartialInput).toBe(true);
    expect(throughput(sim, factoryId).state).toBe("measuring");
    stable(certify(sim, factoryId));
  });

  it("certifies the same actual boundary-flow cycle across deterministic runs and save/load remeasurement", () => {
    const first = makeLine(),
      second = makeLine();
    const a = certify(first.sim, first.factoryId),
      b = certify(second.sim, second.factoryId);

    stable(a);
    expect(b).toEqual(a);
    expect(a.outputs[0].units).toBe(a.inputs[0].units * 3);

    const report = auditLedger(fixture, first.sim.serialize());
    expect(report.ok).toBe(true);
    expect(report.mismatches).toEqual([]);

    const save = first.sim.serialize();
    expect(save.factories[first.factoryId]).not.toHaveProperty("throughput");

    const restored = new Simulation(fixture);
    expect(restored.load(JSON.parse(JSON.stringify(save))).ok).toBe(true);
    expect(throughput(restored, first.factoryId).state).toBe("measuring");

    const afterLoad = certify(restored, first.factoryId);
    expect(afterLoad).toEqual(a);
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
  });

  it("waits out connected-logistics backlog and re-certifies identically after save/load", () => {
    const { sim, factoryId } = makeBackloggedTerminalLine();
    const before = certify(sim, factoryId, 1600);
    expect(before.state).toBe("stable");
    if (before.state !== "stable")
      throw new Error("Expected stable throughput");
    expect(before.inputs).toEqual([
      expect.objectContaining({
        materialId: "raw",
        units: expect.any(Number),
        unitsPerMinute: expect.any(Number),
      }),
    ]);
    expect(before.outputs).toEqual([
      expect.objectContaining({
        materialId: "granules",
        units: expect.any(Number),
        unitsPerMinute: expect.any(Number),
      }),
    ]);

    const save = sim.serialize();
    const restored = new Simulation(fixture);
    expect(restored.load(JSON.parse(JSON.stringify(save))).ok).toBe(true);
    expect(throughput(restored, factoryId).state).toBe("measuring");

    const afterLoad = certify(restored, factoryId, 1600);
    expect(afterLoad).toEqual(before);
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
  });

  it("invalidates certification on edits and never certifies disabled or fuel-starved factories", () => {
    const { sim, factoryId, processorId } = makeLine();
    stable(certify(sim, factoryId));

    expect(
      sim.command({
        type: "setEnabled",
        machineId: processorId,
        enabled: false,
      }).ok,
    ).toBe(true);
    expect(throughput(sim, factoryId)).toEqual({
      state: "measuring",
      cycleTicks: null,
      inputs: [],
      outputs: [],
    });
    sim.step(5000);
    expect(throughput(sim, factoryId).state).toBe("measuring");

    expect(
      sim.command({
        type: "setEnabled",
        machineId: processorId,
        enabled: true,
      }).ok,
    ).toBe(true);

    const starved = sim.serialize();
    starved.fuel = 0;
    expect(sim.load(starved).ok).toBe(true);
    sim.step(10000);
    expect(
      sim.snapshot().machines.find((machine) => machine.id === processorId)
        ?.status,
    ).toBe("needs-fuel");
    expect(throughput(sim, factoryId).state).toBe("measuring");
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  });
});

describe("T logistics throughput", () => {
  it("certifies extraction/transformation through split and merge and restores identically", () => {
    const { sim, factoryId } = makeLine();
    build(sim, {
      type: "placeBelts",
      points: [
        { x: 30, y: 28 },
        { x: 31, y: 28 },
        { x: 32, y: 28 },
      ],
      direction: 3,
    });
    for (const [x, definitionId] of [
      [30, "splitter"],
      [32, "merger"],
    ] as const) {
      const belt = sim.snapshot().belts.find((b) => b.x === x && b.y === 27)!;
      build(sim, {
        type: "configureJunction",
        beltId: belt.id,
        definitionId,
        direction: 0,
        branch: 1,
      });
    }
    const before = certify(sim, factoryId, 1500);
    stable(before);
    expect(before.outputs[0].units).toBe(before.inputs[0].units * 3);
    expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
    const restored = new Simulation(fixture);
    expect(restored.load(sim.serialize()).ok).toBe(true);
    expect(certify(restored, factoryId, 1500)).toEqual(before);
    expect(auditLedger(fixture, restored.serialize()).ok).toBe(true);
  });
});

it("does not mistake a changed T cursor for the same throughput cycle state", () => {
  const { sim, factoryId } = makeLine();
  const state = sim.serialize();
  const belt = state.belts["30,27"];
  belt.junction = { definitionId: "splitter", branch: 1, cursor: 0 };
  const monitor = new FactoryThroughputMonitor();
  for (let i = 0; i < 5; i++) {
    state.tick = i;
    belt.junction.cursor = (i % 2) as 0 | 1;
    monitor.recordMove(state, {
      from: { x: 24, y: 27 },
      direction: 0,
      material: "ferrite",
    });
    monitor.recordMove(state, {
      from: { x: 33, y: 27 },
      direction: 0,
      material: "plates",
    });
    monitor.observe(fixture, state);
    if (i < 4) expect(monitor.view(factoryId).state).toBe("measuring");
  }
  expect(monitor.view(factoryId).cycleTicks).toBe(2);
  belt.junction.branch = -1;
  monitor.observe(fixture, state);
  expect(monitor.view(factoryId).state).toBe("measuring");
});

it("certifies a physical crossing line with full empty-axis windows and restores the same cycle", () => {
  const { sim, factoryId } = makeLine();
  const b = sim.snapshot().belts.find((b) => b.x === 22 && b.y === 27)!;
  build(sim, {
    type: "configureJunction",
    beltId: b.id,
    definitionId: "crossing",
    direction: 0,
    branch: 1,
  });
  const before = certify(sim, factoryId, 2000);
  stable(before);
  expect(before.outputs[0].units).toBe(before.inputs[0].units * 3);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
  const restored = new Simulation(fixture);
  expect(restored.load(sim.serialize()).ok).toBe(true);
  expect(certify(restored, factoryId, 2000)).toEqual(before);
});

it("includes crossing phase, countdown and pending request in throughput recurrence", () => {
  const { sim, factoryId } = makeLine(),
    state = sim.serialize(),
    belt = state.belts["30,27"];
  belt.junction = {
    definitionId: "crossing",
    branch: 1,
    cursor: 0,
    crossing: { axis: 0, remaining: 4, pending: null, held: null },
  };
  const monitor = new FactoryThroughputMonitor();
  for (let i = 0; i <= 20; i++) {
    state.tick = i;
    const axis = (Math.floor(i / 5) % 2) as 0 | 1,
      remaining = 4 - (i % 5);
    belt.junction.crossing = {
      axis,
      remaining,
      pending: remaining === 0 ? ((1 - axis) as 0 | 1) : null,
      held: null,
    };
    monitor.recordMove(state, {
      from: { x: 24, y: 27 },
      direction: 0,
      material: "ferrite",
    });
    monitor.recordMove(state, {
      from: { x: 33, y: 27 },
      direction: 0,
      material: "plates",
    });
    monitor.observe(fixture, state);
    if (i < 20) expect(monitor.view(factoryId).state).toBe("measuring");
  }
  expect(monitor.view(factoryId).cycleTicks).toBe(10);
});

it("keeps factories independent and rebuilds external routing on the next observation", () => {
  const { sim, factoryId } = makeLine();
  const state = sim.serialize();
  const secondId = "independent-factory";
  const first = state.factories[factoryId];
  state.factories[secondId] = {
    ...structuredClone(first),
    id: secondId,
    y: first.y + 12,
    ports: first.ports.map((port) => ({ ...port, y: port.y + 12 })),
  };
  for (const belt of Object.values(state.belts)) {
    const copy = { ...structuredClone(belt), y: belt.y + 12 };
    state.belts[`${copy.x},${copy.y}`] = copy;
  }
  for (const machine of Object.values(state.machines)) {
    if (machine.factoryId !== factoryId) continue;
    const copy = {
      ...structuredClone(machine),
      id: `${machine.id}-independent`,
      y: machine.y + 12,
      factoryId: secondId,
    };
    state.machines[copy.id] = copy;
  }
  const monitor = new FactoryThroughputMonitor();
  // Initially disconnect the external feeder. Reconnect it between observations.
  state.belts["23,27"].direction = 3;
  for (let tick = 0; tick < 7; tick++) {
    state.tick = tick;
    if (tick === 2) state.belts["23,27"].direction = 0;
    state.belts["22,27"].cargo = tick % 2 ? "ferrite" : null;
    for (const y of [27, 39]) {
      monitor.recordMove(state, {
        from: { x: 24, y },
        direction: 0,
        material: "ferrite",
      });
      monitor.recordMove(state, {
        from: { x: 33, y },
        direction: 0,
        material: "plates",
      });
    }
    monitor.observe(fixture, state);
    if (tick === 2) {
      expect(monitor.view(factoryId).state).toBe("measuring");
      expect(monitor.view(secondId).state).toBe("stable");
    }
  }
  expect(monitor.view(factoryId).cycleTicks).toBe(2);
  expect(monitor.view(secondId).cycleTicks).toBe(1);
});

describe("fresh throughput topology membership", () => {
  const changes: [
    string,
    (
      state: ReturnType<Simulation["serialize"]>,
      factoryId: string,
      processorId: string,
    ) => void,
  ][] = [
    [
      "internal placement",
      (state) => {
        state.belts["31,28"] = {
          ...state.belts["30,27"],
          id: "b-new",
          x: 31,
          y: 28,
        };
      },
    ],
    [
      "internal removal",
      (state) => {
        delete state.belts["30,27"];
      },
    ],
    [
      "input wall routing",
      (state) => {
        state.belts["24,27"].direction = 1;
      },
    ],
    [
      "output wall routing",
      (state) => {
        state.belts["33,27"].direction = 1;
      },
    ],
    [
      "machine membership",
      (state, _factoryId, processorId) => {
        state.machines[processorId].factoryId = null;
      },
    ],
    [
      "factory geometry",
      (state, factoryId) => {
        state.factories[factoryId].width++;
      },
    ],
    [
      "port direction",
      (state, factoryId) => {
        state.factories[factoryId].ports[0].direction = 1;
      },
    ],
  ];

  it.each(changes)(
    "resets before recording new flow after %s changes",
    (_name, mutate) => {
      const { sim, factoryId, processorId } = makeLine();
      const state = sim.serialize();
      const monitor = new FactoryThroughputMonitor();
      for (let tick = 0; tick < 3; tick++) {
        state.tick = tick;
        for (const x of [24, 33])
          monitor.recordMove(state, {
            from: { x, y: 27 },
            direction: 0,
            material: x === 24 ? "ferrite" : "plates",
          });
        monitor.observe(fixture, state);
      }
      expect(monitor.view(factoryId).state).toBe("stable");
      mutate(state, factoryId, processorId);
      // Output port is unchanged by these mutations, so this is a matching event.
      monitor.recordMove(state, {
        from: { x: 33, y: 27 },
        direction: 0,
        material: "plates",
      });
      expect(monitor.view(factoryId).state).toBe("measuring");
    },
  );

  it("preserves topology identity across record ordering and changes outside the half-open rectangle", () => {
    const { sim, factoryId } = makeLine();
    const state = sim.serialize();
    const monitor = new FactoryThroughputMonitor();
    for (let tick = 0; tick < 3; tick++) {
      state.tick = tick;
      for (const x of [24, 33])
        monitor.recordMove(state, {
          from: { x, y: 27 },
          direction: 0,
          material: x === 24 ? "ferrite" : "plates",
        });
      monitor.observe(fixture, state);
    }
    const certified = monitor.view(factoryId);
    expect(certified.state).toBe("stable");
    state.belts = Object.fromEntries(Object.entries(state.belts).reverse());
    state.machines = Object.fromEntries(
      Object.entries(state.machines).reverse(),
    );
    state.factories[factoryId].ports.reverse();
    // x=34 is just outside the right boundary; bottom edge is outside too.
    state.belts["34,27"].direction = 1;
    state.belts["31,32"] = {
      ...state.belts["30,27"],
      id: "b-outside",
      x: 31,
      y: 32,
    };
    monitor.recordMove(state, {
      from: { x: 33, y: 27 },
      direction: 0,
      material: "plates",
    });
    expect(monitor.view(factoryId)).toEqual(certified);
  });
});

describe("liquid recurrence boundary", () => {
  it.each(["internal", "connected", "unrelated"] as const)(
    "blocks only %s relevant failed pumps even with empty chambers",
    (kind) => {
      const { state, monitor, factoryId } = monitorLine();
      for (let i = 1; i < 8; i++) {
        state.tick = i;
        pulse(state, monitor);
      }
      expect(monitor.view(factoryId).state).toBe("stable");
      const source = Object.values(state.pumps)[0];
      const p =
        kind === "connected"
          ? source
          : {
              ...source,
              id: "u999",
              x: kind === "internal" ? 30 : 5,
              y: kind === "internal" ? 17 : 5,
            };
      state.pumps[p.id] = p;
      p.enabled = false;
      p.incident = {
        definitionId: "pump-corrosion",
        materialId: "liquid-0",
        quantity: 0,
        startedAt: state.tick,
        drainEnabled: false,
      };
      for (let i = 8; i < 20; i++) {
        state.tick = i;
        pulse(state, monitor);
      }
      expect(monitor.view(factoryId).state).toBe(
        kind === "unrelated" ? "stable" : "measuring",
      );
    },
  );
  function monitorLine() {
    const sim = new Simulation(fixture);
    const factoryId = build(sim, {
      type: "placeFactory",
      x: 25,
      y: 10,
      width: 10,
      height: 10,
    });
    build(sim, { type: "placePort", factoryId, x: 25, y: 15, direction: 0 });
    build(sim, { type: "placePort", factoryId, x: 34, y: 15, direction: 0 });
    build(sim, { type: "placeTank", x: 21, y: 14, direction: 0 });
    build(sim, { type: "placePump", x: 23, y: 15, direction: 0 });
    build(sim, {
      type: "placePipes",
      points: Array.from({ length: 11 }, (_, i) => ({
        x: 24 + i,
        y: 15,
        inlet: 2,
        outlet: 0,
      })),
    });
    const state = sim.serialize(),
      monitor = new FactoryThroughputMonitor();
    return { state, monitor, factoryId };
  }
  function pulse(
    state: ReturnType<Simulation["serialize"]>,
    monitor: FactoryThroughputMonitor,
  ) {
    monitor.recordMove(state, {
      from: { x: 25, y: 15 },
      direction: 0,
      material: "liquid-0",
      units: 2,
    });
    monitor.recordMove(state, {
      from: { x: 34, y: 15 },
      direction: 0,
      material: "liquid-0",
      units: 2,
    });
    monitor.observe(fixture, state);
  }
  it("waits for connected reservoir backlog recurrence, but ignores unrelated reservoirs", () => {
    const { state, monitor, factoryId } = monitorLine();
    const tank = Object.values(state.tanks)[0];
    tank.materialId = "liquid-0";
    for (let i = 1; i < 8; i++) {
      state.tick = i;
      tank.quantity = 20 - i;
      pulse(state, monitor);
    }
    expect(monitor.view(factoryId).state).toBe("measuring");
    state.tanks.t99 = {
      id: "t99",
      containmentProfileId: "standard",
      x: 5,
      y: 5,
      direction: 0,
      materialId: "liquid-0",
      quantity: 20,
    };
    for (let i = 8; i < 16; i++) {
      state.tick = i;
      state.tanks.t99.quantity--;
      pulse(state, monitor);
    }
    expect(monitor.view(factoryId).state).toBe("stable");
    expect(monitor.view(factoryId).outputs[0].units).toBe(2);
    tank.quantity--;
    state.tick++;
    pulse(state, monitor);
    expect(monitor.view(factoryId).state).toBe("measuring");
  });
  it("invalidates certification when an internal pipe route changes", () => {
    const { state, monitor, factoryId } = monitorLine();
    for (let i = 1; i < 8; i++) {
      state.tick = i;
      pulse(state, monitor);
    }
    expect(monitor.view(factoryId).state).toBe("stable");
    state.pipes["30,15"].outlet = 1;
    state.tick++;
    monitor.observe(fixture, state);
    expect(monitor.view(factoryId).state).toBe("measuring");
  });
  it.each(["internal", "connected", "unrelated"] as const)(
    "tracks %s empty containment profile settings",
    (kind) => {
      const { state, monitor, factoryId } = monitorLine();
      for (let i = 1; i < 8; i++) {
        state.tick = i;
        pulse(state, monitor);
      }
      expect(monitor.view(factoryId).state).toBe("stable");
      if (kind === "internal")
        state.pipes["30,15"].containmentProfileId = "lined";
      else if (kind === "connected")
        Object.values(state.tanks)[0].containmentProfileId = "lined";
      else
        state.tanks.t99 = {
          id: "t99",
          x: 5,
          y: 5,
          direction: 0,
          materialId: null,
          quantity: 0,
          containmentProfileId: "lined",
        };
      state.tick++;
      monitor.observe(fixture, state);
      expect(monitor.view(factoryId).state).toBe(
        kind === "unrelated" ? "stable" : "measuring",
      );
    },
  );
});

describe("gas recurrence boundary", () => {
  function monitorLine() {
    const sim = new Simulation(fixture);
    const factoryId = build(sim, {
      type: "placeFactory",
      x: 25,
      y: 10,
      width: 10,
      height: 10,
    });
    build(sim, { type: "placePort", factoryId, x: 25, y: 15, direction: 0 });
    build(sim, { type: "placePort", factoryId, x: 34, y: 15, direction: 0 });
    build(sim, { type: "placePressureVessel", x: 21, y: 14, direction: 0 });
    build(sim, { type: "placeCompressor", x: 23, y: 15, direction: 0 });
    build(sim, {
      type: "placePressureLines",
      points: Array.from({ length: 11 }, (_, i) => ({
        x: 24 + i,
        y: 15,
        inlet: 2,
        outlet: 0,
      })),
    });
    const state = sim.serialize(),
      monitor = new FactoryThroughputMonitor();
    return { state, monitor, factoryId };
  }
  function pulse(
    state: ReturnType<Simulation["serialize"]>,
    monitor: FactoryThroughputMonitor,
  ) {
    monitor.recordMove(state, {
      from: { x: 25, y: 15 },
      direction: 0,
      material: "gas-0",
      units: 2,
    });
    monitor.recordMove(state, {
      from: { x: 34, y: 15 },
      direction: 0,
      material: "gas-0",
      units: 2,
    });
    monitor.observe(fixture, state);
  }
  it("waits for connected reservoir backlog recurrence, but ignores unrelated reservoirs", () => {
    const { state, monitor, factoryId } = monitorLine();
    const tank = Object.values(state.pressureVessels)[0];
    tank.materialId = "gas-0";
    for (let i = 1; i < 8; i++) {
      state.tick = i;
      tank.quantity = 20 - i;
      pulse(state, monitor);
    }
    expect(monitor.view(factoryId).state).toBe("measuring");
    state.pressureVessels.t99 = {
      id: "t99",
      x: 5,
      y: 5,
      direction: 0,
      materialId: "gas-0",
      quantity: 20,
    };
    for (let i = 8; i < 16; i++) {
      state.tick = i;
      state.pressureVessels.t99.quantity--;
      pulse(state, monitor);
    }
    expect(monitor.view(factoryId).state).toBe("stable");
    expect(monitor.view(factoryId).outputs[0].units).toBe(2);
    tank.quantity--;
    state.tick++;
    pulse(state, monitor);
    expect(monitor.view(factoryId).state).toBe("measuring");
  });
  it("invalidates certification when an internal pipe route changes", () => {
    const { state, monitor, factoryId } = monitorLine();
    for (let i = 1; i < 8; i++) {
      state.tick = i;
      pulse(state, monitor);
    }
    expect(monitor.view(factoryId).state).toBe("stable");
    state.pressureLines["30,15"].outlet = 1;
    state.tick++;
    monitor.observe(fixture, state);
    expect(monitor.view(factoryId).state).toBe("measuring");
  });
  it("includes connected terminal installation but ignores unrelated dock changes", () => {
    const { state, monitor, factoryId } = monitorLine();
    const content = validateContent({
      ...fixture,
      site: {
        ...fixture.site,
        terminal: { x: 35, y: 14, width: 4, height: 4 },
        terminalModules: fixture.site.terminalModules.map((d) =>
          d.id === "gas-dock"
            ? { ...d, inlet: { x: 0, y: 1, side: 2 } }
            : d.id === "cryo-dock"
              ? { ...d, inlet: { x: 1, y: 0, side: 3 } }
              : d,
        ),
      },
    });
    for (let i = 1; i < 8; i++) {
      state.tick = i;
      monitor.recordMove(state, {
        from: { x: 25, y: 15 },
        direction: 0,
        material: "gas-0",
        units: 2,
      });
      monitor.recordMove(state, {
        from: { x: 34, y: 15 },
        direction: 0,
        material: "gas-0",
        units: 2,
      });
      monitor.observe(content, state);
    }
    expect(monitor.view(factoryId).state).toBe("stable");
    state.terminalModules["liquid-dock"] = { materialId: null, quantity: 0 };
    state.tick++;
    monitor.observe(content, state);
    expect(monitor.view(factoryId).state).toBe("stable");
    state.terminalModules["gas-dock"] = { materialId: null, quantity: 0 };
    state.tick++;
    monitor.observe(content, state);
    expect(monitor.view(factoryId).state).toBe("measuring");
  });
});
