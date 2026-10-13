import { fixture, machinePresentationSchema } from "@site/content";
import { Simulation, type MachineView } from "@site/sim-core";
import { describe, expect, it } from "vitest";
import { resolveMachinePresentation } from "../game/machine-presentation";

const snapshot = new Simulation(fixture).snapshot();
const extractor = snapshot.definitions.find((d) => d.id === "extractor")!;
const fake = (
  status: MachineView["status"],
): Pick<MachineView, "definitionId" | "status" | "incident"> => ({
  definitionId: "extractor",
  status,
  incident: null,
});

describe("P0 machine presentation — safe public-state resolver", () => {
  it("recognizes authored extractor identity, idle/working/blocked and incident without hidden recipes", () => {
    const idle = resolveMachinePresentation(fake("ready"), extractor);
    const running = resolveMachinePresentation(fake("processing"), extractor);
    const blocked = resolveMachinePresentation(fake("output-full"), extractor);
    const incident = resolveMachinePresentation(fake("incident"), extractor);
    expect(idle).toMatchObject({
      operation: "idle",
      condition: "intact",
      assetId: "machine-extractor",
      overlayId: null,
      indicatorColor: 0xc0c6a9,
    });
    expect(running).toMatchObject({
      operation: "working",
      assetId: "machine-extractor",
      indicatorColor: 0xb2d68a,
    });
    expect(blocked).toMatchObject({
      operation: "blocked",
      indicatorColor: 0xd6a66e,
    });
    expect(incident).toMatchObject({
      operation: "incident",
      overlayId: "effect-scorch",
      indicatorColor: 0xe57865,
    });
    expect(JSON.stringify(incident)).not.toContain("reactionId");
  });

  it("keeps physical condition orthogonal to machine operation", () => {
    const damaged = resolveMachinePresentation(fake("processing"), extractor, "damaged");
    const wrecked = resolveMachinePresentation(fake("disabled"), extractor, "wrecked");
    expect(damaged).toMatchObject({ operation: "working", condition: "damaged" });
    expect(wrecked).toMatchObject({ operation: "disabled", condition: "wrecked" });
    // Until actual state-specific sprites arrive, both retain a safe real asset.
    expect(damaged.assetId).toBe("machine-extractor");
    expect(wrecked.assetId).toBe("machine-extractor");
  });

  it("does not load arbitrary/missing asset IDs, or treat sound and art as simulation truth", () => {
    const broken = {
      ...extractor,
      presentation: {
        ...extractor.presentation!,
        assets: { base: "no-such-art", incidentOverlay: "no-such-overlay" },
        logoAssetId: "not-an-asset",
      },
    };
    const presented = resolveMachinePresentation(fake("incident"), broken);
    expect(presented.assetId).toBe("machine-extractor");
    expect(presented.overlayId).toBe("effect-scorch");
    expect(presented.logoAssetId).toBeNull();
    expect(presented.audio.start).toBe("machine-heavy-start");
    expect(presented).not.toHaveProperty("durationTicks");
  });

  it("validates authored manifest version, tint values and closed audio cue names", () => {
    expect(machinePresentationSchema.parse(extractor.presentation)).toMatchObject({
      version: 1,
      assets: { base: "machine-extractor" },
    });
    expect(machinePresentationSchema.safeParse({
      version: 2,
      assets: { base: "machine-extractor" },
    }).success).toBe(false);
    expect(machinePresentationSchema.safeParse({
      version: 1,
      indicatorColors: { working: "limegreen" },
    }).success).toBe(false);
    expect(machinePresentationSchema.safeParse({
      version: 1,
      audio: { start: "arbitrary-remote-url" },
    }).success).toBe(false);
  });
});
