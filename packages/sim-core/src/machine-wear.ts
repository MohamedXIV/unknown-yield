import type { Content } from "@site/content";
import type { Machine } from "./types";
import { assessMineralExtraction } from "./extraction-envelope";

/**
 * Authoritative physical-use accounting (P2a).
 * Only a completed batch contributes wear; idle, blocked and paused machines
 * do not decay. Curated incidents/damage/maintenance remain separate P2 slices.
 */
export function completedBatchWear(c: Content, machine: Machine): number {
  const definition = c.machines.find((entry) => entry.id === machine.definitionId)!;
  const reliability = definition.reliability;
  if (!reliability) return 0;
  const extraction = assessMineralExtraction(c, machine);
  const mode = definition.operatingModes.find(
    (entry) => entry.id === machine.operatingModeId,
  );
  const nominal = (definition.extractionEnvelope?.nominalLoad ?? 0) +
    (mode?.nominalLoadBonus ?? 0);
  const strain = extraction.compatibility === "strained"
    ? Math.max(0, extraction.stressLoad - nominal)
    : 0;
  const raw = reliability.baseWearPerBatch +
    extraction.stressLoad * reliability.loadWearPerPoint +
    strain * reliability.strainedWearPerPoint;
  return Math.ceil(raw * (mode?.wearBps ?? 10000) / 10000);
}

export function machinePhysicalCondition(
  c: Content,
  machine: Machine,
): "intact" | "worn" {
  const profile = c.machines.find((entry) => entry.id === machine.definitionId)!.reliability;
  return profile && machine.wear >= profile.wornAt ? "worn" : "intact";
}
