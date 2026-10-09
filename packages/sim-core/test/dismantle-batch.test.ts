import { describe, expect, it } from "vitest";
import { enCatalog, fixture, validateContent } from "@site/content";
import { auditLedger, Simulation, type GameCommand } from "../src";
import { amount } from "../src/types";

function make() {
  return new Simulation(fixture);
}
function construct(sim: Simulation, command: GameCommand): void {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
}
function belt(sim: Simulation, x: number, y: number) {
  construct(sim, {
    type: "placeBelts",
    points: [{ x, y }],
    direction: 0,
  });
  return sim.serialize().belts[`${x},${y}`].id;
}
function mixedSite() {
  const sim = make();
  const b1 = belt(sim, 30, 10);
  const b2 = belt(sim, 32, 10);
  construct(sim, {
    type: "placePipes",
    containmentProfileId: "standard",
    points: [{ x: 34, y: 10, inlet: 2, outlet: 0 }],
  });
  construct(sim, {
    type: "placePressureLines",
    points: [{ x: 36, y: 10, inlet: 2, outlet: 0 }],
  });
  return {
    sim,
    ids: [
      b1, b2,
      sim.serialize().pipes["34,10"].id,
      sim.serialize().pressureLines["36,10"].id,
    ],
  };
}
function ledgerOk(sim: Simulation) {
  expect(auditLedger(fixture, sim.serialize()).mismatches).toEqual([]);
}

describe("Phase 20 P4 — authoritative safe batch dismantling", () => {
  it("B01: empty selection is a pure no-op in preview and commit", () => {
    const sim = make();
    const before = JSON.stringify(sim.serialize());
    expect(sim.preview({ type: "dismantleMany", ids: [] }).batch).toMatchObject({
      selectedCount: 0,
      uniqueCount: 0,
      removed: [],
      blocked: [],
      ignored: [],
      reclaimedStructureMaterial: 0,
      retrievedCargo: 0,
      netBuildStockDelta: 0,
    });
    expect(sim.command({ type: "dismantleMany", ids: [] })).toMatchObject({
      ok: true,
      batch: { removed: [], reclaimedStructureMaterial: 0 },
    });
    expect(JSON.stringify(sim.serialize())).toBe(before);
  });

  it("B02: single empty belt equals the original single-target dismantle", () => {
    const single = make(), batch = make();
    const a = belt(single, 30, 12), b = belt(batch, 30, 12);
    expect(a).toBe(b);
    expect(single.command({ type: "dismantle", id: a }).ok).toBe(true);
    const result = batch.command({ type: "dismantleMany", ids: [b] });
    expect(result).toMatchObject({
      ok: true,
      batch: {
        removed: [b],
        reclaimedStructureMaterial: fixture.site.beltCost,
        retrievedCargo: 0,
        netBuildStockDelta: fixture.site.beltCost,
      },
    });
    expect(batch.serialize()).toEqual(single.serialize());
    ledgerOk(batch);
  });

  it("B03: permutations of independent structures produce byte-identical saves", () => {
    const left = mixedSite(), right = mixedSite();
    const forward = left.sim.command({
      type: "dismantleMany", ids: left.ids,
    });
    const reverse = right.sim.command({
      type: "dismantleMany", ids: [...right.ids].reverse(),
    });
    expect(forward).toEqual(reverse);
    expect(JSON.stringify(left.sim.serialize())).toBe(
      JSON.stringify(right.sim.serialize()),
    );
    expect(forward.batch?.removed).toHaveLength(4);
    ledgerOk(left.sim);
  });

  it("B04–B05: duplicates and stale replay cannot refund twice", () => {
    const sim = make(), id = belt(sim, 30, 14);
    const first = sim.command({
      type: "dismantleMany", ids: [id, id, id],
    });
    expect(first.batch).toMatchObject({
      selectedCount: 3,
      uniqueCount: 1,
      duplicateCount: 2,
      removed: [id],
      ignored: [
        { id, reason: "Duplicate selected ID" },
        { id, reason: "Duplicate selected ID" },
      ],
      reclaimedStructureMaterial: fixture.site.beltCost,
    });
    const before = JSON.stringify(sim.serialize());
    expect(sim.command({ type: "dismantleMany", ids: [id] }).batch).toMatchObject({
      removed: [],
      ignored: [{ id, reason: "Unknown or stale structure ID" }],
      reclaimedStructureMaterial: 0,
      netBuildStockDelta: 0,
    });
    expect(JSON.stringify(sim.serialize())).toBe(before);
    ledgerOk(sim);
  });

  it("B06: 257 distinct IDs are rejected without side effects", () => {
    const sim = make(), id = belt(sim, 30, 16);
    const ids = [id, ...Array.from({ length: 256 }, (_, i) => `stale-${i}`)];
    const before = JSON.stringify(sim.serialize());
    expect(sim.preview({ type: "dismantleMany", ids })).toMatchObject({
      ok: false,
      message: expect.stringContaining("256"),
    });
    expect(sim.command({ type: "dismantleMany", ids }).ok).toBe(false);
    expect(JSON.stringify(sim.serialize())).toBe(before);
  });

  it("B07: independent empty belt can be removed while a loaded belt stays", () => {
    const sim = make(),
      empty = belt(sim, 30, 18),
      loadedId = belt(sim, 32, 18),
      state = sim.serialize(),
      deposit = fixture.site.deposits.find((d) => d.material === "raw")!;
    state.deposits[deposit.id]--;
    state.belts["32,18"].cargo = "raw";
    expect(sim.load(state).ok).toBe(true);
    const originalLoaded = sim.serialize().belts["32,18"];
    const result = sim.command({
      type: "dismantleMany", ids: [empty, loadedId],
    });
    expect(result.batch).toMatchObject({
      removed: [empty],
      blocked: [{ id: loadedId, reason: "Route the cargo out first" }],
    });
    expect(sim.serialize().belts["32,18"]).toEqual(originalLoaded);
    ledgerOk(sim);
  });

  it("B08: construction plates carried by a plain belt are recovered separately", () => {
    const sim = make(), id = belt(sim, 30, 20),
      save = sim.serialize(), build = fixture.site.buildMaterial;
    save.stock[build]--;
    save.belts["30,20"].cargo = build;
    expect(sim.load(save).ok).toBe(true);
    const result = sim.command({ type: "dismantleMany", ids: [id] });
    expect(result.batch).toMatchObject({
      removed: [id],
      reclaimedStructureMaterial: fixture.site.beltCost,
      retrievedCargo: 1,
      netBuildStockDelta: fixture.site.beltCost + 1,
    });
    ledgerOk(sim);
  });

  it("B13/B16: dependency order removes attached belt before port and shell", () => {
    const sim = make();
    construct(sim, {
      type: "placeFactory", x: 65, y: 45, width: 6, height: 6,
    });
    const factory = Object.values(sim.serialize().factories)[0];
    construct(sim, {
      type: "placePort", factoryId: factory.id, x: 70, y: 48, direction: 0,
    });
    const id = belt(sim, 70, 48);
    const portId = sim.serialize().factories[factory.id].ports[0].id;
    const result = sim.command({
      type: "dismantleMany", ids: [factory.id, portId, id],
    });
    expect(result.batch).toMatchObject({
      removed: [id, portId, factory.id],
      blocked: [],
    });
    expect(Object.values(sim.serialize().factories)).toEqual([]);
    expect(Object.values(sim.serialize().belts)).toEqual([]);
    ledgerOk(sim);
  });

  it("B13: port alone cannot bypass an attached belt", () => {
    const sim = make();
    construct(sim, {
      type: "placeFactory", x: 65, y: 45, width: 6, height: 6,
    });
    const id = Object.values(sim.serialize().factories)[0].id;
    construct(sim, {
      type: "placePort", factoryId: id, x: 70, y: 48, direction: 0,
    });
    belt(sim, 70, 48);
    const port = sim.serialize().factories[id].ports[0].id;
    const before = JSON.stringify(sim.serialize());
    const result = sim.command({ type: "dismantleMany", ids: [port] });
    expect(result.batch).toMatchObject({
      removed: [],
      blocked: [{ id: port, reason: "Remove the belt on this port first" }],
    });
    expect(JSON.stringify(sim.serialize())).toBe(before);
  });


  it("B14: a relocation-required factory port stays protected after its belt is removed", () => {
    const sim = make();
    construct(sim, {
      type: "placeFactory", x: 24, y: 22, width: 10, height: 10,
    });
    const factoryId = Object.values(sim.serialize().factories)[0].id;
    construct(sim, {
      type: "placePort", factoryId, x: 24, y: 25, direction: 0,
    });
    construct(sim, {
      type: "placeBelts",
      points: [{ x: 23, y: 25 }, { x: 24, y: 25 }, { x: 25, y: 25 }],
      direction: 0,
    });
    const relocation = sim.command({
      type: "relocateFactory", factoryId, x: 25, y: 22,
    });
    expect(relocation.ok, relocation.message).toBe(true);
    const factory = sim.serialize().factories[factoryId];
    const port = factory.ports[0];
    expect(factory.relocation?.requirements.some(req => req.portId === port.id))
      .toBe(true);
    const attachedBelt = sim.serialize().belts["25,25"];
    const result = sim.command({
      type: "dismantleMany", ids: [port.id, attachedBelt.id],
    });
    expect(result.batch).toMatchObject({
      removed: [attachedBelt.id],
      blocked: [{
        id: port.id,
        reason: "Required relocation port must remain until restart",
      }],
    });
    expect(sim.serialize().factories[factoryId].ports[0].id).toBe(port.id);
    ledgerOk(sim);
  });

  it("B17: terminal, finite and hidden deposits are protected IDs", () => {
    const sim = make(), valid = belt(sim, 30, 22),
      ids = [
        "terminal",
        fixture.site.deposits[0].id,
        fixture.site.hiddenDeposits[0].id,
        "unknown-struct",
        valid,
      ];
    const result = sim.command({ type: "dismantleMany", ids });
    expect(result.batch?.removed).toEqual([valid]);
    expect(result.batch?.ignored).toEqual(expect.arrayContaining([
      { id: "terminal", reason: "Protected site resource" },
      { id: fixture.site.deposits[0].id, reason: "Protected site resource" },
      { id: fixture.site.hiddenDeposits[0].id, reason: "Protected site resource" },
      { id: "unknown-struct", reason: "Unknown or stale structure ID" },
    ]));
    ledgerOk(sim);
  });

  it("B19: preview follows dependency order but cannot mutate actual state", () => {
    const { sim, ids } = mixedSite(), before = JSON.stringify(sim.serialize());
    const preview = sim.preview({ type: "dismantleMany", ids });
    expect(preview.batch?.removed).toHaveLength(ids.length);
    expect(JSON.stringify(sim.serialize())).toBe(before);
    const applied = sim.command({ type: "dismantleMany", ids });
    expect(applied.batch).toEqual(preview.batch);
    ledgerOk(sim);
  });

  it("B20: stale preview never authorizes a now-loaded removal", () => {
    const sim = make(), id = belt(sim, 30, 24);
    const preview = sim.preview({ type: "dismantleMany", ids: [id] });
    expect(preview.batch?.removed).toEqual([id]);
    const state = sim.serialize(),
      deposit = fixture.site.deposits.find((d) => d.material === "raw")!;
    state.deposits[deposit.id]--;
    state.belts["30,24"].cargo = "raw";
    expect(sim.load(state).ok).toBe(true);
    const before = JSON.stringify(sim.serialize());
    const result = sim.command({ type: "dismantleMany", ids: [id] });
    expect(result.batch?.removed).toEqual([]);
    expect(result.batch?.blocked).toEqual([
      { id, reason: "Route the cargo out first" },
    ]);
    expect(JSON.stringify(sim.serialize())).toBe(before);
    ledgerOk(sim);
  });

  it("B21/B22: mixed gas/liquid/machine refunds are embodied, conserved and reloadable", () => {
    const { sim, ids } = mixedSite();
    const before = sim.serialize(),
      result = sim.command({ type: "dismantleMany", ids });
    expect(result.batch?.reclaimedStructureMaterial).toBe(
      fixture.site.beltCost * 2 +
      fixture.gasLogistics!.line.cost +
      2,
    );
    const build = fixture.site.buildMaterial;
    expect(amount(sim.serialize().stock, build) - amount(before.stock, build))
      .toBe(result.batch!.netBuildStockDelta);
    const restored = make();
    expect(restored.load(sim.serialize()).ok).toBe(true);
    expect(restored.serialize()).toEqual(sim.serialize());
    ledgerOk(sim);
  });
});


describe("Phase 20 P4 — protected loaded structures and dynamic definitions", () => {
  it("B09: loaded junction stays intact while independent ordinary belt is reclaimed", () => {
    const sim = make();
    const junctionId = belt(sim, 20, 20),
      emptyId = belt(sim, 22, 20);
    expect(sim.command({
      type: "configureJunction",
      beltId: junctionId,
      definitionId: "splitter",
      direction: 0,
      branch: 1,
    }).ok).toBe(true);
    const save = sim.serialize();
    save.stock[fixture.site.buildMaterial]--;
    save.belts["20,20"].cargo = fixture.site.buildMaterial;
    expect(sim.load(save).ok).toBe(true);
    const existing = sim.serialize().belts["20,20"];
    const result = sim.command({ type: "dismantleMany", ids: [junctionId, emptyId] });
    expect(result.batch?.removed).toEqual([emptyId]);
    expect(result.batch?.blocked).toEqual([
      { id: junctionId, reason: "Empty junction first" },
    ]);
    expect(sim.serialize().belts["20,20"]).toEqual(existing);
    ledgerOk(sim);
  });

  for (const medium of ["liquid", "gas"] as const) {
    it(`B10/B11: loaded ${medium} is not drained during mixed batch removal`, () => {
      const content = structuredClone(fixture);
      const raw = content.materials.find(m => m.id === "raw")!;
      raw.handlingState = medium;
      for (const machine of content.machines) {
        machine.inputStates = ["solid", "liquid", "gas"];
        machine.outputStates = ["solid", "liquid", "gas"];
      }
      const authored = validateContent(content);
      const sim = new Simulation(authored);
      if (medium === "liquid") {
        construct(sim, { type: "placePipes", containmentProfileId: "standard",
          points: [
            { x: 30, y: 30, inlet: 2, outlet: 0 },
            { x: 31, y: 30, inlet: 2, outlet: 0 },
          ] });
      } else {
        construct(sim, { type: "placePressureLines",
          points: [
            { x: 30, y: 30, inlet: 2, outlet: 0 },
            { x: 31, y: 30, inlet: 2, outlet: 0 },
          ] });
      }
      const lines = medium === "liquid" ? sim.serialize().pipes : sim.serialize().pressureLines;
      const loadedId = lines["30,30"].id, emptyId = lines["31,30"].id;
      const state = sim.serialize(),
        deposit = authored.site.deposits.find(d => d.material === "raw")!;
      state.deposits[deposit.id] -= 2;
      if (medium === "liquid") {
        state.pipes["30,30"].materialId = "raw";
        state.pipes["30,30"].quantity = 2;
      } else {
        state.pressureLines["30,30"].materialId = "raw";
        state.pressureLines["30,30"].quantity = 2;
      }
      expect(sim.load(state).ok).toBe(true);
      const result = sim.command({
        type: "dismantleMany", ids: [loadedId, emptyId],
      });
      expect(result.batch?.removed).toEqual([emptyId]);
      expect(result.batch?.blocked).toHaveLength(1);
      const after = medium === "liquid"
        ? sim.serialize().pipes["30,30"]
        : sim.serialize().pressureLines["30,30"];
      expect(after).toMatchObject({ id: loadedId, quantity: 2, materialId: "raw" });
      expect(auditLedger(authored, sim.serialize()).ok).toBe(true);
    });
  }

  it("B12/B15: a buffered processor protects itself and its factory, not independent belt", () => {
    const sim = make();
    construct(sim, { type: "placeFactory", x: 65, y: 45, width: 6, height: 6 });
    const factoryId = Object.values(sim.serialize().factories)[0].id;
    construct(sim, {
      type: "placeMachine", definitionId: "crusher", x: 67, y: 46, direction: 0,
    });
    const machineId = Object.values(sim.serialize().machines)[0].id;
    const beltId = belt(sim, 68, 49);
    const loaded = sim.serialize(),
      deposit = fixture.site.deposits.find(d => d.material === "raw")!;
    loaded.deposits[deposit.id]--;
    loaded.machines[machineId].input.raw = 1;
    expect(sim.load(loaded).ok).toBe(true);
    const result = sim.command({
      type: "dismantleMany", ids: [factoryId, beltId, machineId],
    });
    expect(result.batch?.removed).toEqual([beltId]);
    expect(result.batch?.blocked.map(b => b.id)).toEqual([machineId, factoryId]);
    expect(sim.serialize().machines[machineId].input.raw).toBe(1);
    expect(sim.serialize().factories[factoryId]).toBeDefined();
    ledgerOk(sim);
  });

  it("B18: a valid imported machine definition uses its real dynamic identity and refund", () => {
    const custom = structuredClone(fixture);
    const original = custom.machines.find(m => m.id === "crusher")!;
    const dynamicNameKey = "machine.external-processor-v1.name";
    custom.machines.push({
      ...structuredClone(original),
      id: "external-processor-v1",
      nameKey: dynamicNameKey,
    });
    const authored = validateContent(custom, {
      ...enCatalog,
      [dynamicNameKey]: "External processor",
    }),
      sim = new Simulation(authored);
    construct(sim, {
      type: "placeFactory", x: 65, y: 45, width: 6, height: 6,
    });
    construct(sim, {
      type: "placeMachine", definitionId: "external-processor-v1",
      x: 67, y: 46, direction: 0,
    });
    const machine = Object.values(sim.serialize().machines)[0];
    expect(machine.definitionId).toBe("external-processor-v1");
    const result = sim.command({ type: "dismantleMany", ids: [machine.id] });
    expect(result.batch).toMatchObject({
      removed: [machine.id],
      reclaimedStructureMaterial: original.cost,
    });
    expect(auditLedger(authored, sim.serialize()).ok).toBe(true);
  });
});
