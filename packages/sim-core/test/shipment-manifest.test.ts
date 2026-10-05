import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import {
  Simulation,
  auditLedger,
  type GameCommand,
} from "../src/index";

function command(sim: Simulation, input: GameCommand) {
  const result = sim.command(input);
  expect(result.ok, result.message).toBe(true);
  return result;
}

function knownGranulesContent() {
  const content = structuredClone(fixture);
  content.economy.shipmentCapacity = 4;
  content.materials.find((material) => material.id === "granules")!.known = true;
  delete content.economy.exchange.find(
    (listing) => listing.materialId === "granules",
  )!.requiredTerminalCapabilityId;
  return content;
}

describe("physical shipment manifests", () => {
  it("reserves staged cargo from auto-export and dispatches only the chosen capacity", () => {
    const content = knownGranulesContent(),
      sim = new Simulation(content),
      seeded = sim.serialize();
    seeded.staging.granules = 6;
    seeded.flows.produced.granules = 6;
    const loaded = sim.load(seeded);
    expect(loaded.ok, loaded.message).toBe(true);
    expect(auditLedger(content, sim.serialize()).ok).toBe(true);

    expect(sim.snapshot().shipment).toEqual({
      capacity: 4,
      used: 0,
      materials: [
        {
          materialId: "granules",
          handlingState: "solid",
          available: 6,
          selected: 0,
          canShip: true,
        },
      ],
    });

    expect(
      sim.command({
        type: "setShipmentManifestLine",
        materialId: "granules",
        quantity: 5,
      }),
    ).toMatchObject({
      ok: false,
      message: "Manifest exceeds shipment capacity",
    });
    command(sim, {
      type: "setShipmentManifestLine",
      materialId: "granules",
      quantity: 4,
    });
    expect(sim.serialize().shipmentManifest).toEqual({ granules: 4 });
    expect(sim.snapshot().shipment).toMatchObject({
      capacity: 4,
      used: 4,
      materials: [
        expect.objectContaining({
          materialId: "granules",
          available: 6,
          selected: 4,
        }),
      ],
    });

    command(sim, {
      type: "setPolicy",
      materialId: "granules",
      policy: "export",
    });
    sim.step(content.tickMs * content.site.transportEveryTicks);

    const reserved = sim.serialize();
    expect(reserved.staging.granules).toBe(4);
    expect(reserved.shipmentManifest).toEqual({ granules: 4 });
    expect(reserved.exported).toBe(2);
    expect(reserved.flows.exported.granules).toBe(2);
    expect(auditLedger(content, reserved).ok).toBe(true);

    const restored = new Simulation(content),
      restoredResult = restored.load(JSON.parse(JSON.stringify(reserved)));
    expect(restoredResult.ok, restoredResult.message).toBe(true);
    expect(restored.serialize()).toEqual(reserved);

    expect(restored.preview({ type: "dispatchShipment" })).toMatchObject({
      ok: true,
      message: "Dispatch shipment",
    });
    const beforePreview = restored.serialize();
    expect(restored.serialize()).toEqual(beforePreview);

    command(restored, { type: "dispatchShipment" });
    const dispatched = restored.serialize();
    expect(dispatched.shipmentManifest).toEqual({});
    expect(dispatched.staging.granules ?? 0).toBe(0);
    expect(dispatched.exported).toBe(6);
    expect(dispatched.flows.exported.granules).toBe(6);
    expect(auditLedger(content, dispatched).ok).toBe(true);
    expect(restored.snapshot().shipment).toMatchObject({
      used: 0,
      materials: [
        expect.objectContaining({
          materialId: "granules",
          available: 0,
          selected: 0,
        }),
      ],
    });
  });

  it("ships liquid from its physical handling dock rather than dry staging", () => {
    const content = structuredClone(fixture);
    content.economy.shipmentCapacity = 4;
    content.reactions.find((reaction) => reaction.id === "liquefy-raw")!.known =
      true;

    const sim = new Simulation(content);
    sim.step(content.tickMs);
    expect(
      sim
        .snapshot()
        .milestones.find((milestone) => milestone.id === "liquid-study-certified")
        ?.completed,
    ).toBe(true);

    command(sim, {
      type: "installTerminalModule",
      definitionId: "liquid-dock",
    });
    const seeded = sim.serialize();
    seeded.terminalModules["liquid-dock"] = {
      materialId: "liquid-0",
      quantity: 3,
    };
    seeded.flows.produced["liquid-0"] = 3;
    const loaded = sim.load(seeded);
    expect(loaded.ok, loaded.message).toBe(true);
    expect(auditLedger(content, sim.serialize()).ok).toBe(true);

    expect(
      sim.snapshot().shipment.materials.find(
        (material) => material.materialId === "liquid-0",
      ),
    ).toEqual({
      materialId: "liquid-0",
      handlingState: "liquid",
      available: 3,
      selected: 0,
      canShip: true,
    });

    command(sim, {
      type: "setShipmentManifestLine",
      materialId: "liquid-0",
      quantity: 3,
    });
    command(sim, { type: "dispatchShipment" });

    const final = sim.serialize();
    expect(final.terminalModules["liquid-dock"]).toEqual({
      materialId: null,
      quantity: 0,
    });
    expect(final.staging["liquid-0"] ?? 0).toBe(0);
    expect(final.flows.exported["liquid-0"]).toBe(3);
    expect(final.exported).toBe(3);
    expect(auditLedger(content, final).ok).toBe(true);
  });

  it("does not expose or reserve undiscovered exchange cargo", () => {
    const sim = new Simulation(fixture);
    expect(
      sim.snapshot().shipment.materials.some(
        (material) => material.materialId === "granules",
      ),
    ).toBe(false);
    const before = sim.serialize();
    expect(
      sim.command({
        type: "setShipmentManifestLine",
        materialId: "granules",
        quantity: 1,
      }),
    ).toMatchObject({
      ok: false,
      message: "Unknown or unavailable shipment material",
    });
    expect(sim.serialize()).toEqual(before);
  });
});
