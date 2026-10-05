import { expect, it } from "vitest";
import { fixture } from "@site/content";
import { auditLedger, Simulation, type GameCommand } from "../src/index";

const cadence = fixture.tickMs * fixture.site.transportEveryTicks;

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

it("proves underground and elevated logistics solve distinct spatial problems in one persistent world", () => {
  let sim = new Simulation(fixture);

  const undergroundId = build(sim, {
    type: "placeUndergroundSolid",
    entry: { x: 10, y: 10 },
    exit: { x: 20, y: 10 },
  });
  const elevatedId = build(sim, {
    type: "placeElevatedSolid",
    entry: { x: 10, y: 16 },
    exit: { x: 20, y: 16 },
  });

  for (const y of [10, 16]) {
    build(sim, {
      type: "placeBelts",
      points: [{ x: 9, y }],
      direction: 0,
    });
    build(sim, {
      type: "placeBelts",
      points: [{ x: 21, y }],
      direction: 0,
    });
  }

  // Underground frees every buried middle cell. Elevated frees only the deck
  // cells between periodic ground supports.
  expect(
    sim.command({
      type: "placeBelts",
      points: [{ x: 12, y: 10 }],
      direction: 1,
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "placeBelts",
      points: [{ x: 12, y: 16 }],
      direction: 1,
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "placeBelts",
      points: [{ x: 14, y: 16 }],
      direction: 1,
    }).ok,
  ).toBe(false);

  const seeded = sim.serialize();
  seeded.stock.plates -= 2;
  seeded.belts["9,10"].cargo = "plates";
  seeded.belts["9,16"].cargo = "plates";
  expect(sim.load(seeded).ok).toBe(true);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);

  sim.step(cadence);
  expect(sim.serialize().undergroundSolids[undergroundId].cargo).toEqual({
    materialId: "plates",
    remainingSteps: 10,
  });
  expect(sim.serialize().elevatedSolids[elevatedId].cargo).toEqual({
    materialId: "plates",
    remainingSteps: 10,
  });

  const midTransit = sim.serialize();
  const restored = new Simulation(fixture);
  expect(restored.load(structuredClone(midTransit)).ok).toBe(true);
  expect(restored.serialize()).toEqual(midTransit);

  sim.step(cadence * 5);
  restored.step(cadence * 5);
  expect(restored.serialize()).toEqual(sim.serialize());
  expect(sim.serialize().undergroundSolids[undergroundId].cargo).toEqual({
    materialId: "plates",
    remainingSteps: 5,
  });
  expect(sim.serialize().elevatedSolids[elevatedId].cargo).toEqual({
    materialId: "plates",
    remainingSteps: 5,
  });
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);

  const blocked = sim.serialize();
  blocked.stock.plates -= 2;
  blocked.belts["21,10"].cargo = "plates";
  blocked.belts["21,16"].cargo = "plates";
  expect(sim.load(blocked).ok).toBe(true);

  sim.step(cadence * 5);
  expect(sim.serialize().undergroundSolids[undergroundId].cargo).toEqual({
    materialId: "plates",
    remainingSteps: 0,
  });
  expect(sim.serialize().elevatedSolids[elevatedId].cargo).toEqual({
    materialId: "plates",
    remainingSteps: 0,
  });
  expect(sim.serialize().belts["21,10"].cargo).toBe("plates");
  expect(sim.serialize().belts["21,16"].cargo).toBe("plates");
  expect(sim.command({ type: "dismantle", id: undergroundId }).ok).toBe(false);
  expect(sim.command({ type: "dismantle", id: elevatedId }).ok).toBe(false);
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);

  const backpressured = sim.serialize();
  const restoredBlocked = new Simulation(fixture);
  expect(restoredBlocked.load(structuredClone(backpressured)).ok).toBe(true);
  sim.step(cadence * 2);
  restoredBlocked.step(cadence * 2);
  expect(restoredBlocked.serialize()).toEqual(sim.serialize());

  const cleared = sim.serialize();
  cleared.belts["21,10"].cargo = null;
  cleared.belts["21,16"].cargo = null;
  cleared.stock.plates += 2;
  expect(sim.load(cleared).ok).toBe(true);
  sim.step(cadence);

  expect(sim.serialize().undergroundSolids[undergroundId].cargo).toBeNull();
  expect(sim.serialize().elevatedSolids[elevatedId].cargo).toBeNull();
  expect(sim.serialize().belts["21,10"].cargo).toBe("plates");
  expect(sim.serialize().belts["21,16"].cargo).toBe("plates");
  expect(auditLedger(fixture, sim.serialize()).ok).toBe(true);
});
