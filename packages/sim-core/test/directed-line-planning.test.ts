import { expect, it } from "vitest";
import { fixture, validateContent } from "@site/content";
import { planLinePlacement, Simulation } from "../src";
import { liquidConstructionCost } from "../src/containment";
import { auditLedger } from "../src/ledger";
import { transportGases } from "../src/gases";
import { transportLiquids } from "../src/liquids";
import { amount } from "../src/types";

function straightPipePath(y: number, fromX: number, toX: number) {
  return Array.from({ length: toX - fromX + 1 }, (_, index) => ({
    x: fromX + index,
    y,
    inlet: 2,
    outlet: 0,
  }));
}

function seedPipes(y: number, fromX: number, toX: number, keepX: number[]) {
  const sim = new Simulation(fixture);
  const profile = fixture.liquidLogistics!.containmentProfiles[0].id;
  const placed = sim.command({
    type: "placePipes",
    containmentProfileId: profile,
    points: straightPipePath(y, fromX, toX),
  });
  expect(placed.ok, placed.message).toBe(true);
  for (let x = fromX; x <= toX; x++) {
    if (keepX.includes(x)) continue;
    const id = sim.serialize().pipes[`${x},${y}`]?.id;
    expect(id).toBeTruthy();
    expect(sim.command({ type: "dismantle", id: id! }).ok).toBe(true);
  }
  return sim;
}

function contentFor(state: "liquid" | "gas") {
  const draft = structuredClone(fixture);
  draft.materials.find((material) => material.id === "raw")!.handlingState =
    state;
  for (const machine of draft.machines) {
    machine.inputStates = ["solid", "liquid", "gas"];
    machine.outputStates = ["solid", "liquid", "gas"];
  }
  return validateContent(draft);
}

function straightGasPath(y: number, fromX: number, toX: number) {
  return Array.from({ length: toX - fromX + 1 }, (_, index) => ({
    x: fromX + index,
    y,
    inlet: 2,
    outlet: 0,
  }));
}

it("L23: reuses exact first, middle, and end pipes and charges only separated gaps", () => {
  const profile = fixture.liquidLogistics!.containmentProfiles[0].id;
  const sim = seedPipes(10, 10, 15, [10, 12, 15]);
  const command = {
    type: "placePipes" as const,
    containmentProfileId: profile,
    points: straightPipePath(10, 10, 15),
  };
  const beforeLines = [10, 12, 15].map((x) => sim.serialize().pipes[`${x},10`]);
  const preview = sim.preview(command);

  expect(preview.ok).toBe(true);
  expect(preview.cost).toBe(
    3 * liquidConstructionCost(fixture, "pipe", profile),
  );
  expect(
    (preview as typeof preview & { linePlan?: unknown }).linePlan,
  ).toMatchObject({
    valid: true,
    newCount: 3,
    reusedCount: 3,
    blockedCount: 0,
  });

  const before = sim.serialize();
  const result = sim.command(command);
  const after = sim.serialize();
  expect(result.ok).toBe(true);
  expect(result.cost).toBe(preview.cost);
  for (const existing of beforeLines)
    expect(after.pipes[`${existing.x},${existing.y}`]).toEqual(existing);
  expect(Object.keys(after.pipes)).toHaveLength(6);
  expect(after.nextId).toBe(before.nextId + 3);
  expect(amount(after.stock, fixture.site.buildMaterial)).toBe(
    amount(before.stock, fixture.site.buildMaterial) - preview.cost!,
  );
});

it("L24: blocks a reused pipe with reversed inlet/outlet without mutation", () => {
  const sim = new Simulation(fixture);
  expect(
    sim.command({
      type: "placePipes",
      containmentProfileId: "standard",
      points: [{ x: 20, y: 20, inlet: 2, outlet: 0 }],
    }).ok,
  ).toBe(true);
  const existing = sim.serialize().pipes["20,20"];
  expect(
    sim.command({
      type: "configurePipe",
      id: existing.id,
      inlet: 0,
      outlet: 2,
    }).ok,
  ).toBe(true);
  const before = sim.serialize();
  const result = sim.command({
    type: "placePipes",
    containmentProfileId: "standard",
    points: [{ x: 20, y: 20, inlet: 2, outlet: 0 }],
  });
  expect(result.ok).toBe(false);
  expect(result.linePlan).toMatchObject({
    valid: false,
    newCount: 0,
    reusedCount: 0,
    blockedCount: 1,
  });
  expect(sim.serialize()).toEqual(before);
});

it("L25: blocks a pipe whose containment profile differs even when empty", () => {
  const profiles = fixture.liquidLogistics!.containmentProfiles;
  expect(profiles.length).toBeGreaterThan(1);
  const sim = new Simulation(fixture);
  expect(
    sim.command({
      type: "placePipes",
      containmentProfileId: profiles[0].id,
      points: [{ x: 22, y: 20, inlet: 2, outlet: 0 }],
    }).ok,
  ).toBe(true);
  const before = sim.serialize();
  const result = sim.command({
    type: "placePipes",
    containmentProfileId: profiles[1].id,
    points: [{ x: 22, y: 20, inlet: 2, outlet: 0 }],
  });
  expect(result.ok).toBe(false);
  expect(result.linePlan?.positions[0]).toMatchObject({
    kind: "blocked",
    reason: expect.stringContaining("containment"),
  });
  expect(sim.serialize()).toEqual(before);
});

it("L26: preserves loaded compatible pipes across gap repair and resumes conserved flow", () => {
  const content = contentFor("liquid"),
    sim = new Simulation(content),
    profile = content.liquidLogistics!.containmentProfiles[0].id,
    fullPath = straightPipePath(20, 30, 32);
  expect(
    sim.command({
      type: "placePipes",
      containmentProfileId: profile,
      points: fullPath,
    }).ok,
  ).toBe(true);
  const gapId = sim.serialize().pipes["31,20"].id;
  expect(sim.command({ type: "dismantle", id: gapId }).ok).toBe(true);
  const loaded = sim.serialize(),
    rawDeposit = content.site.deposits.find(
      (deposit) => deposit.material === "raw",
    )!;
  loaded.deposits[rawDeposit.id] -= 3;
  loaded.pipes["30,20"].materialId = "raw";
  loaded.pipes["30,20"].quantity = 3;
  expect(auditLedger(content, loaded).ok).toBe(true);
  expect(sim.load(loaded).ok).toBe(true);
  const beforeLine = sim.serialize().pipes["30,20"];
  const command = {
    type: "placePipes" as const,
    containmentProfileId: profile,
    points: fullPath,
  };
  expect(sim.preview(command)).toMatchObject({
    ok: true,
    cost: liquidConstructionCost(content, "pipe", profile),
  });
  expect(sim.command(command).ok).toBe(true);
  const repaired = sim.serialize();
  expect(repaired.pipes["30,20"]).toEqual(beforeLine);
  expect(repaired.pipes["31,20"]).toMatchObject({
    materialId: null,
    quantity: 0,
  });
  const beforeLedger = auditLedger(content, repaired);
  transportLiquids(content, repaired);
  expect(repaired.pipes["30,20"].quantity).toBe(2);
  expect(repaired.pipes["31,20"].quantity).toBe(1);
  expect(auditLedger(content, repaired)).toEqual(beforeLedger);
  const restored = new Simulation(content);
  expect(restored.load(repaired).ok).toBe(true);
  expect(restored.serialize()).toEqual(repaired);
});

it("L27: reuses loaded pressure lines, fills a gap, and charges only new gas cells", () => {
  const content = contentFor("gas"),
    sim = new Simulation(content),
    fullPath = straightGasPath(10, 10, 12);
  expect(sim.command({ type: "placePressureLines", points: fullPath }).ok).toBe(
    true,
  );
  expect(
    sim.command({
      type: "dismantle",
      id: sim.serialize().pressureLines["11,10"].id,
    }).ok,
  ).toBe(true);
  const loaded = sim.serialize(),
    rawDeposit = content.site.deposits.find(
      (deposit) => deposit.material === "raw",
    )!;
  loaded.deposits[rawDeposit.id] -= 2;
  loaded.pressureLines["10,10"].materialId = "raw";
  loaded.pressureLines["10,10"].quantity = 2;
  expect(sim.load(loaded).ok).toBe(true);
  const beforeLine = sim.serialize().pressureLines["10,10"],
    command = { type: "placePressureLines" as const, points: fullPath };
  const preview = sim.preview(command);
  expect(preview).toMatchObject({
    ok: true,
    cost: fixture.gasLogistics!.line.cost,
  });
  expect(preview.linePlan).toMatchObject({
    newCount: 1,
    reusedCount: 2,
    cost: fixture.gasLogistics!.line.cost,
  });
  expect(sim.command(command).ok).toBe(true);
  const repaired = sim.serialize(),
    beforeLedger = auditLedger(content, repaired);
  expect(repaired.pressureLines["10,10"]).toEqual(beforeLine);
  transportGases(content, repaired);
  expect(repaired.pressureLines["10,10"].quantity).toBe(1);
  expect(repaired.pressureLines["11,10"].quantity).toBe(1);
  expect(auditLedger(content, repaired)).toEqual(beforeLedger);
});

it("L28: blocks loaded gas with conflicting direction and never vents it", () => {
  const content = contentFor("gas"),
    sim = new Simulation(content),
    point = { x: 24, y: 20, inlet: 2, outlet: 0 };
  expect(sim.command({ type: "placePressureLines", points: [point] }).ok).toBe(
    true,
  );
  const loaded = sim.serialize(),
    rawDeposit = content.site.deposits.find(
      (deposit) => deposit.material === "raw",
    )!;
  loaded.deposits[rawDeposit.id] -= 2;
  loaded.pressureLines["24,20"].materialId = "raw";
  loaded.pressureLines["24,20"].quantity = 2;
  expect(sim.load(loaded).ok).toBe(true);
  const before = sim.serialize(),
    result = sim.command({
      type: "placePressureLines",
      points: [{ x: 24, y: 20, inlet: 0, outlet: 2 }],
    });
  expect(result.ok).toBe(false);
  expect(result.linePlan?.blockedCount).toBe(1);
  expect(sim.serialize()).toEqual(before);
});

it("L29: repairs a directed liquid L-turn and transports through the new corner gap", () => {
  const content = contentFor("liquid"),
    sim = new Simulation(content),
    profile = content.liquidLogistics!.containmentProfiles[0].id,
    path = [
      { x: 30, y: 20, inlet: 2, outlet: 0 },
      { x: 31, y: 20, inlet: 2, outlet: 1 },
      { x: 31, y: 21, inlet: 3, outlet: 1 },
    ];
  expect(
    sim.command({
      type: "placePipes",
      containmentProfileId: profile,
      points: path,
    }).ok,
  ).toBe(true);
  expect(
    sim.command({ type: "dismantle", id: sim.serialize().pipes["31,20"].id })
      .ok,
  ).toBe(true);
  const state = sim.serialize(),
    rawDeposit = content.site.deposits.find(
      (deposit) => deposit.material === "raw",
    )!;
  state.deposits[rawDeposit.id]--;
  state.pipes["30,20"].materialId = "raw";
  state.pipes["30,20"].quantity = 1;
  expect(sim.load(state).ok).toBe(true);
  expect(
    sim.command({
      type: "placePipes",
      containmentProfileId: profile,
      points: path,
    }).ok,
  ).toBe(true);
  const repaired = sim.serialize(),
    ledger = auditLedger(content, repaired);
  transportLiquids(content, repaired);
  expect(repaired.pipes["30,20"].quantity).toBe(0);
  expect(repaired.pipes["31,20"].quantity).toBe(1);
  expect(auditLedger(content, repaired)).toEqual(ledger);
});

it("L29: repairs a directed gas L-turn and transports through the new corner gap", () => {
  const content = contentFor("gas"),
    sim = new Simulation(content),
    path = [
      { x: 30, y: 20, inlet: 2, outlet: 0 },
      { x: 31, y: 20, inlet: 2, outlet: 1 },
      { x: 31, y: 21, inlet: 3, outlet: 1 },
    ];
  expect(sim.command({ type: "placePressureLines", points: path }).ok).toBe(
    true,
  );
  expect(
    sim.command({
      type: "dismantle",
      id: sim.serialize().pressureLines["31,20"].id,
    }).ok,
  ).toBe(true);
  const state = sim.serialize(),
    rawDeposit = content.site.deposits.find(
      (deposit) => deposit.material === "raw",
    )!;
  state.deposits[rawDeposit.id]--;
  state.pressureLines["30,20"].materialId = "raw";
  state.pressureLines["30,20"].quantity = 1;
  expect(sim.load(state).ok).toBe(true);
  expect(sim.command({ type: "placePressureLines", points: path }).ok).toBe(
    true,
  );
  const repaired = sim.serialize(),
    ledger = auditLedger(content, repaired);
  transportGases(content, repaired);
  expect(repaired.pressureLines["30,20"].quantity).toBe(0);
  expect(repaired.pressureLines["31,20"].quantity).toBe(1);
  expect(auditLedger(content, repaired)).toEqual(ledger);
});

it("L30: keeps structure occupancy and directional factory ports authoritative", () => {
  const sim = new Simulation(fixture);
  expect(
    sim.command({ type: "placeFactory", x: 65, y: 45, width: 6, height: 6 }).ok,
  ).toBe(true);
  const factory = Object.values(sim.serialize().factories)[0];
  expect(
    sim.command({
      type: "placePort",
      factoryId: factory.id,
      x: 65,
      y: 48,
      direction: 2,
    }).ok,
  ).toBe(true);
  const before = sim.serialize();
  const result = sim.command({
    type: "placePipes",
    containmentProfileId: "standard",
    points: [
      { x: 64, y: 48, inlet: 2, outlet: 0 },
      { x: 65, y: 48, inlet: 2, outlet: 0 },
      { x: 66, y: 48, inlet: 2, outlet: 0 },
    ],
  });
  expect(result.ok).toBe(false);
  expect(result.linePlan?.positions[1].kind).toBe("blocked");
  expect(sim.serialize()).toEqual(before);

  expect(
    sim.command({
      type: "placePort",
      factoryId: factory.id,
      x: 70,
      y: 48,
      direction: 0,
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "placePipes",
      containmentProfileId: "standard",
      points: [
        { x: 69, y: 48, inlet: 2, outlet: 0 },
        { x: 70, y: 48, inlet: 2, outlet: 0 },
        { x: 71, y: 48, inlet: 2, outlet: 0 },
      ],
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "placePort",
      factoryId: factory.id,
      x: 70,
      y: 49,
      direction: 0,
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "placePressureLines",
      points: [
        { x: 69, y: 49, inlet: 2, outlet: 0 },
        { x: 70, y: 49, inlet: 2, outlet: 0 },
        { x: 71, y: 49, inlet: 2, outlet: 0 },
      ],
    }).ok,
  ).toBe(true);
  const machine = sim.command({
    type: "placeMachine",
    definitionId: "crusher",
    x: 67,
    y: 46,
    direction: 0,
  });
  expect(machine.ok, machine.message).toBe(true);
  expect(
    sim.preview({
      type: "placePipes",
      containmentProfileId: "standard",
      points: [{ x: 67, y: 46, inlet: 2, outlet: 0 }],
    }).linePlan?.positions[0].kind,
  ).toBe("blocked");

  const tank = new Simulation(fixture);
  expect(
    tank.command({ type: "placeTank", x: 32, y: 30, direction: 0 }).ok,
  ).toBe(true);
  expect(
    tank.preview({
      type: "placePipes",
      containmentProfileId: "standard",
      points: [{ x: 32, y: 30, inlet: 2, outlet: 0 }],
    }).linePlan?.positions[0].kind,
  ).toBe("blocked");
  const pump = new Simulation(fixture);
  expect(
    pump.command({ type: "placePump", x: 32, y: 30, direction: 0 }).ok,
  ).toBe(true);
  expect(
    pump.preview({
      type: "placePipes",
      containmentProfileId: "standard",
      points: [{ x: 32, y: 30, inlet: 2, outlet: 0 }],
    }).linePlan?.positions[0].kind,
  ).toBe("blocked");
  const compressor = new Simulation(fixture);
  expect(
    compressor.command({ type: "placeCompressor", x: 32, y: 30, direction: 0 })
      .ok,
  ).toBe(true);
  expect(
    compressor.preview({
      type: "placePressureLines",
      points: [{ x: 32, y: 30, inlet: 2, outlet: 0 }],
    }).linePlan?.positions[0].kind,
  ).toBe("blocked");

  const gas = new Simulation(fixture);
  expect(
    gas.command({ type: "placePressureVessel", x: 20, y: 20, direction: 0 }).ok,
  ).toBe(true);
  const beforeGas = gas.serialize();
  const gasPlan = gas.preview({
    type: "placePressureLines",
    points: [{ x: 20, y: 20, inlet: 2, outlet: 0 }],
  });
  expect(gasPlan.ok).toBe(false);
  expect(gasPlan.linePlan?.positions[0].kind).toBe("blocked");
  expect(gas.serialize()).toEqual(beforeGas);
});

it("L31: makes an all-reused path a byte-identical zero-cost no-op", () => {
  const profile = fixture.liquidLogistics!.containmentProfiles[0].id,
    sim = new Simulation(fixture),
    path = straightPipePath(32, 20, 22),
    gasPath = straightGasPath(34, 20, 22);
  expect(
    sim.command({
      type: "placePipes",
      containmentProfileId: profile,
      points: path,
    }).ok,
  ).toBe(true);
  expect(sim.command({ type: "placePressureLines", points: gasPath }).ok).toBe(
    true,
  );
  const before = sim.serialize(),
    beforeBytes = JSON.stringify(before);
  const result = sim.command({
    type: "placePipes",
    containmentProfileId: profile,
    points: path,
  });
  expect(result).toMatchObject({ ok: true, cost: 0 });
  expect(result.linePlan).toMatchObject({
    newCount: 0,
    reusedCount: 3,
    blockedCount: 0,
    cost: 0,
  });
  expect(
    sim.command({
      type: "placePipes",
      containmentProfileId: profile,
      points: path,
    }),
  ).toMatchObject({ ok: true, cost: 0 });
  expect(
    sim.command({ type: "placePressureLines", points: gasPath }),
  ).toMatchObject({ ok: true, cost: 0 });
  expect(
    sim.command({ type: "placePressureLines", points: gasPath }),
  ).toMatchObject({ ok: true, cost: 0 });
  expect(JSON.stringify(sim.serialize())).toBe(beforeBytes);
  expect(sim.serialize()).toEqual(before);
});

it("reports an unaffordable new-only segment in the pure plan", () => {
  const sim = new Simulation(fixture),
    save = sim.serialize(),
    profile = fixture.liquidLogistics!.containmentProfiles[0].id;
  save.stock[fixture.site.buildMaterial] = 0;
  const plan = planLinePlacement(fixture, save, {
    type: "placePipes",
    containmentProfileId: profile,
    points: [{ x: 30, y: 20, inlet: 2, outlet: 0 }],
  });
  expect(plan).toMatchObject({
    valid: false,
    newCount: 1,
    reusedCount: 0,
    blockedCount: 0,
    cost: liquidConstructionCost(fixture, "pipe", profile),
    available: 0,
    shortfall: liquidConstructionCost(fixture, "pipe", profile),
    error: "Not enough structural plates",
  });
});

it("L32: rejects a late incompatible cell atomically without charging or allocating IDs", () => {
  const sim = new Simulation(fixture);
  expect(
    sim.command({ type: "placePressureVessel", x: 32, y: 30, direction: 0 }).ok,
  ).toBe(true);
  const before = sim.serialize();
  const result = sim.command({
    type: "placePressureLines",
    points: straightGasPath(30, 30, 32),
  });
  expect(result.ok).toBe(false);
  expect(result.linePlan).toMatchObject({
    valid: false,
    newCount: 2,
    blockedCount: 1,
  });
  expect(sim.serialize()).toEqual(before);
});

it("revalidates a preview against current occupancy and reports new-only cost", () => {
  const sim = new Simulation(fixture),
    command = {
      type: "placePipes" as const,
      containmentProfileId: "standard",
      points: straightPipePath(34, 30, 32),
    };
  const preview = sim.preview(command);
  expect(preview.linePlan).toMatchObject({
    newCount: 3,
    reusedCount: 0,
    blockedCount: 0,
  });
  expect(preview.cost).toBe(
    3 * liquidConstructionCost(fixture, "pipe", "standard"),
  );
  expect(
    sim.command({ type: "placeTank", x: 32, y: 34, direction: 0 }).ok,
  ).toBe(true);
  const before = sim.serialize();
  const committed = sim.command(command);
  expect(committed.ok).toBe(false);
  expect(committed.linePlan?.blockedCount).toBeGreaterThan(0);
  expect(sim.serialize()).toEqual(before);
});
