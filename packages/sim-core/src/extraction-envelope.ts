import type { Content } from "@site/content";
import type { Machine } from "./types";
import { depositDefinition } from "./deposits";

/** P1a: ordinal operating-load model. Every coefficient is explicit here or
 * authored in content; not an assertion of real-world mineral physics.
 * Load combines hardness, abrasion and brittle fracture behavior. */
export type ExtractionAssessment = {
  compatibility: "nominal" | "strained" | "impossible";
  durationTicks: number;
  fuelCost: number;
  stressLoad: number;
};

export function assessMineralExtraction(
  content: Content,
  machine: Pick<Machine, "definitionId" | "depositId">,
): ExtractionAssessment {
  const definition = content.machines.find((d) => d.id === machine.definitionId)!;
  const nominal = { compatibility: "nominal" as const, durationTicks: definition.durationTicks, fuelCost: definition.fuel, stressLoad: 0 };
  // Legacy/unprofiled extraction and atmospheric collection keep exact old behavior.
  if (!definition.extractionEnvelope || definition.sourceKind === "atmosphere") return nominal;
  const deposit = depositDefinition(content, machine.depositId);
  const properties = content.materials.find((m) => m.id === deposit?.material)?.mechanics;
  if (!properties) return nominal;
  const stressLoad = Math.max(0, properties.hardness * 2 + properties.abrasiveness - properties.brittleness);
  const envelope = definition.extractionEnvelope;
  if (stressLoad > envelope.maximumLoad)
    return { ...nominal, compatibility: "impossible", stressLoad };
  const excess = Math.max(0, stressLoad - envelope.nominalLoad);
  if (!excess) return { ...nominal, stressLoad };
  return {
    compatibility: "strained",
    durationTicks: Math.ceil(definition.durationTicks * (10000 + excess * envelope.strainedDurationPerLoadBps) / 10000),
    fuelCost: definition.fuel + excess * envelope.strainedFuelPerLoad,
    stressLoad,
  };
}
