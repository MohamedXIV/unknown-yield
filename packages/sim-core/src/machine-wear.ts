import type { Content } from "@site/content";
import type { Machine } from "./types";
import { assessMineralExtraction, type ExtractionAssessment } from "./extraction-envelope";

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
): "intact" | "worn" | "damaged" {
  const profile = c.machines.find((entry) => entry.id === machine.definitionId)!.reliability;
  if (!profile) return "intact";
  if (machine.integrity <= profile.damagedBelow) return "damaged";
  return machine.wear >= profile.wornAt ? "worn" : "intact";
}

/** Current runtime duration: mechanical damage slows real throughput.
 * This shared evaluator is used for batch start, active save validation and UI. */
export function assessMachineOperation(
  c: Content,
  machine: Machine,
): ExtractionAssessment {
  const assessment = assessMineralExtraction(c, machine);
  const profile = c.machines.find((d) => d.id === machine.definitionId)!.reliability;
  if (!profile || machine.integrity > profile.damagedBelow ||
      assessment.compatibility === "impossible") return assessment;
  return {
    ...assessment,
    durationTicks: Math.max(1, Math.ceil(
      assessment.durationTicks * profile.damagedDurationBps / 10000,
    )),
  };
}

/** Wear vs physical integrity are separate persisted values. Damage cannot
 * render machinery irreparable until P2b2/P2c add the failure/service loop. */
export function applyCompletedMachineFatigue(c: Content, machine: Machine): void {
  const definition = c.machines.find((d) => d.id === machine.definitionId)!;
  const delta = completedBatchWear(c, machine);
  machine.wear = Math.min(10000, machine.wear + delta);
  if (definition.reliability)
    machine.integrity = Math.max(1,
      machine.integrity - delta * definition.reliability.integrityLossPerWear);
}
