import { describe, it, expect } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  type GameCommand,
} from "../src/index";

const make = () => new Simulation(fixture);
function build(s: Simulation, c: GameCommand) {
  const r = s.command(c);
  expect(r.ok, r.message).toBe(true);
  return r.id!;
}
function path(x: number, y: number, endX: number, endY: number, direction = 0) {
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
function auditOk(s: Simulation) {
  const report = auditLedger(fixture, s.serialize());
  expect(report.mismatches).toEqual([]);
  expect(report.ok).toBe(true);
  return report;
}
// Shared raw feed with a diverter at (23,37): primary east into line B,
// alternate north into line A through its south port.
function twoLines(s = make()) {
  const fa = build(s, {
    type: "placeFactory",
    x: 24,
    y: 22,
    width: 10,
    height: 10,
  });
  build(s, { type: "placePort", factoryId: fa, x: 33, y: 27, direction: 0 });
  build(s, { type: "placePort", factoryId: fa, x: 26, y: 31, direction: 3 });
  const fb = build(s, {
    type: "placeFactory",
    x: 24,
    y: 33,
    width: 10,
    height: 10,
  });
  build(s, { type: "placePort", factoryId: fb, x: 24, y: 37, direction: 0 });
  build(s, { type: "placePort", factoryId: fb, x: 33, y: 37, direction: 0 });
  const extractor = build(s, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 36,
    direction: 0,
  });
  const ca = build(s, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 26,
    direction: 0,
  });
  const cb = build(s, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 27,
    y: 36,
    direction: 0,
  });
  build(s, path(20, 37, 26, 37));
  build(s, {
    type: "placeBelts",
    points: [
      { x: 23, y: 36 },
      { x: 23, y: 35 },
      { x: 23, y: 34 },
      { x: 23, y: 33 },
      { x: 23, y: 32 },
      { x: 24, y: 32 },
      { x: 25, y: 32 },
      { x: 26, y: 32 },
      { x: 26, y: 31 },
      { x: 26, y: 30 },
      { x: 26, y: 29 },
      { x: 26, y: 28 },
      { x: 26, y: 27 },
    ],
    // The last cell sits on the input socket and must point into the
    // crusher footprint, like every other machine intake.
    direction: 0,
  });
  build(s, path(29, 27, 37, 28, 0));
  build(s, path(29, 37, 37, 29, 0));
  return { s, fa, fb, extractor, ca, cb };
}
function machineState(s: Simulation, id: string) {
  const m = s.serialize().machines[id];
  return {
    input: m.input,
    output: m.output,
    job: m.job,
    enabled: m.enabled,
    operation: m.operation,
    x: m.x,
    y: m.y,
    direction: m.direction,
    definitionId: m.definitionId,
    factoryId: m.factoryId,
  };
}

describe("persistent factories (suspend / reroute / resume)", () => {
  it("finishes the current batch exactly once when disabled mid-batch", () => {
    const s = make();
    const id = build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    });
    for (let i = 0; i < 20; i++) {
      s.step(100);
      if (s.serialize().machines[id].job !== null) break;
    }
    expect(s.serialize().machines[id].job).not.toBeNull();
    const fuel = s.snapshot().fuel;
    s.command({ type: "setEnabled", machineId: id, enabled: false });
    s.step(5000);
    const done = s.serialize().machines[id];
    expect(done.job).toBeNull();
    expect(done.output).toEqual({ ferrite: 1 });
    // Charged once at batch start; the finished batch cost nothing extra and
    // no second batch began.
    expect(s.snapshot().fuel).toBe(fuel);
    s.step(10000);
    expect(s.serialize().machines[id].output).toEqual({ ferrite: 1 });
    expect(s.snapshot().fuel).toBe(fuel);
    auditOk(s);
  });

  it("suspends a line, reroutes shared input, idles, then resumes intact", () => {
    const { s, fa, fb, cb, ca } = twoLines();
    // Phase 1: primary feed runs line B; line A stays pristine.
    s.step(60000);
    expect(s.snapshot().exported).toBeGreaterThan(0);
    expect(
      s.snapshot().observations.some((o) => o.outputId === "granules"),
    ).toBe(true);
    const pristineA = machineState(s, ca);
    expect(pristineA.input).toEqual({});
    expect(pristineA.output).toEqual({});
    expect(
      s.snapshot().machines.find((m) => m.id === ca)?.status,
    ).toBe("needs-input");
    const fuelP1 = s.snapshot().fuel;
    expect(fuelP1).toBeGreaterThan(0);
    auditOk(s);
    // Phase 2: suspend line B and leave it idle; buffers settle, nothing moves.
    s.command({ type: "setEnabled", machineId: cb, enabled: false });
    let prevDep = JSON.stringify(s.serialize().deposits);
    for (let i = 0; i < 30; i++) {
      s.step(10000);
      const cur = JSON.stringify(s.serialize().deposits);
      if (cur === prevDep) break;
      prevDep = cur;
    }
    const suspended = s.serialize();
    expect(suspended.machines[cb].job).toBeNull();
    const suspendedB = machineState(s, cb);
    s.step(20000);
    const idle = s.serialize();
    expect(idle.machines[cb]).toEqual(suspended.machines[cb]);
    expect(idle.deposits).toEqual(suspended.deposits);
    expect(idle.fuel).toBe(suspended.fuel);
    expect(Object.keys(idle.stock)).toEqual(["plates"]);
    auditOk(s);
    // Phase 3: reroute the shared feed north to line A. Factory B internals
    // must not move at all while the rest of the world keeps flowing.
    const diverter = s.snapshot().belts.find(
      (b) => b.x === 23 && b.y === 37,
    )!.id;
    for (let i = 0; i < 3; i++)
      expect(s.command({ type: "rotateDivert", beltId: diverter }).ok).toBe(
        true,
      );
    expect(s.command({ type: "switchDivert", beltId: diverter }).ok).toBe(true);
    const exportedP2 = s.serialize().exported;
    s.step(60000);
    expect(machineState(s, cb)).toEqual(suspendedB);
    expect(s.serialize().factories[fb]).toEqual(suspended.factories[fb]);
    expect(s.serialize().factories[fa]).toEqual(suspended.factories[fa]);
    // Line A runs from the rerouted feed: single-extractor supply means its
    // buffers fluctuate, so activity is proven by cumulative exports, which
    // can only come from A while B sits disabled with an empty output.
    expect(s.serialize().exported).toBeGreaterThan(exportedP2);
    expect(Object.keys(s.serialize().stock)).toEqual(["plates"]);
    auditOk(s);
    // Save/load in the middle of suspension preserves everything.
    const saved = s.serialize(),
      b = make();
    expect(b.load(JSON.parse(JSON.stringify(saved))).ok).toBe(true);
    expect(b.serialize()).toEqual(saved);
    s.step(15000);
    b.step(15000);
    expect(b.serialize()).toEqual(s.serialize());
    auditOk(b);
    // Phase 4: switch back and resume B from its preserved buffers.
    expect(s.command({ type: "switchDivert", beltId: diverter }).ok).toBe(true);
    const beforeResume = s.serialize();
    expect(beforeResume.machines[cb].input).toEqual({ raw: 12 });
    const exportedBefore = beforeResume.exported;
    s.command({ type: "setEnabled", machineId: cb, enabled: true });
    s.step(40000);
    const resumed = s.serialize();
    expect(resumed.machines[cb].id).toBe(cb);
    expect(resumed.factories[fb]).toEqual(beforeResume.factories[fb]);
    expect(resumed.exported).toBeGreaterThan(exportedBefore);
    expect(s.snapshot().fuel).toBeGreaterThan(0);
    expect(Object.keys(s.serialize().stock)).toEqual(["plates"]);
    auditOk(s);
  });

  it("stalls on blocked output and resumes after draining, losing nothing", () => {
    const s = make();
    const factory = build(s, {
      type: "placeFactory",
      x: 24,
      y: 22,
      width: 10,
      height: 10,
    });
    build(s, { type: "placePort", factoryId: factory, x: 24, y: 27, direction: 0 });
    build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 18,
      y: 26,
      direction: 0,
    });
    const crusher = build(s, {
      type: "placeMachine",
      definitionId: "crusher",
      x: 27,
      y: 26,
      direction: 0,
    });
    build(s, path(20, 27, 26, 27));
    const physical = (s: Simulation) => {
      const snap = s.serialize();
      return {
        deposits: snap.deposits,
        stock: snap.stock,
        machines: snap.machines,
        belts: snap.belts,
        fuel: snap.fuel,
      };
    };
    for (let i = 0; i < 60; i++) {
      s.step(10000);
      if (
        Object.values(s.serialize().machines[crusher].output).reduce(
          (a, b) => a + b,
          0,
        ) === 12
      )
        break;
    }
    // Settle until the whole line is quiescent, then prove an exact freeze.
    let prev = JSON.stringify(physical(s));
    for (let i = 0; i < 30; i++) {
      s.step(10000);
      const cur = JSON.stringify(physical(s));
      if (cur === prev) break;
      prev = cur;
    }
    const blocked = s.serialize();
    expect(
      Object.values(blocked.machines[crusher].output).reduce((a, b) => a + b, 0),
    ).toBe(12);
    expect(blocked.machines[crusher].job).toBeNull();
    s.step(20000);
    expect(physical(s)).toEqual(JSON.parse(prev));
    auditOk(s);
    // Drain into a depot through a new east port: batches resume.
    build(s, { type: "placePort", factoryId: factory, x: 33, y: 27, direction: 0 });
    const depot = build(s, {
      type: "placeStorage",
      definitionId: "depot",
      x: 35,
      y: 24,
      direction: 0,
    });
    build(s, path(29, 27, 34, 25, 0));
    let jobSeen = false;
    for (let i = 0; i < 40; i++) {
      s.step(1000);
      if (s.serialize().machines[crusher].job !== null) {
        jobSeen = true;
        break;
      }
    }
    expect(jobSeen).toBe(true);
    for (let i = 0; i < 40; i++) {
      s.step(5000);
      if (
        Object.values(s.serialize().storages[depot].inventory).reduce(
          (a, b) => a + b,
          0,
        ) > 0
      )
        break;
    }
    expect(
      Object.values(s.serialize().storages[depot].inventory).reduce(
        (a, b) => a + b,
        0,
      ),
    ).toBeGreaterThan(0);
    auditOk(s);
  });

  it("starves on empty fuel without consuming buffers, then recovers", () => {
    const c = structuredClone(fixture);
    c.economy.startFuel = 6;
    const s = new Simulation(c);
    const id = build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    });
    for (let i = 0; i < 40; i++) {
      s.step(5000);
      if (s.snapshot().fuel === 0) break;
    }
    expect(s.snapshot().fuel).toBe(0);
    expect(
      s.snapshot().machines.find((m) => m.id === id)?.status,
    ).toBe("needs-fuel");
    const starved = s.serialize();
    expect(
      Object.values(starved.machines[id].output).reduce((a, b) => a + b, 0),
    ).toBeGreaterThan(0);
    s.step(20000);
    expect(s.serialize().machines[id].output).toEqual(
      starved.machines[id].output,
    );
    expect(s.serialize().deposits).toEqual(starved.deposits);
    auditOk(s);
    expect(s.command({ type: "assistance" }).ok).toBe(true);
    s.step(10000);
    expect(
      Object.values(s.serialize().machines[id].output).reduce(
        (a, b) => a + b,
        0,
      ),
    ).toBeGreaterThan(
      Object.values(starved.machines[id].output).reduce((a, b) => a + b, 0),
    );
    auditOk(s);
  });

  it("clearing a diverter alternate also restores its exit", () => {
    const s = make();
    build(s, {
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    });
    build(s, path(17, 26, 22, 26));
    const id = s.snapshot().belts[0].id;
    expect(s.command({ type: "rotateDivert", beltId: id }).ok).toBe(true);
    expect(s.command({ type: "switchDivert", beltId: id }).ok).toBe(true);
    for (let i = 0; i < 3; i++)
      expect(s.command({ type: "rotateDivert", beltId: id }).ok).toBe(true);
    const cleared = s.snapshot().belts.find((b) => b.id === id)!;
    expect([cleared.alternate, cleared.switched]).toEqual([null, false]);
    auditOk(s);
  });
});
