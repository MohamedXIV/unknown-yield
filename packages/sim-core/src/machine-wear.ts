import type { Content } from "@site/content";
import type { Machine, Save } from "./types";
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
): "intact" | "worn" | "damaged" | "wrecked" {
  const profile = c.machines.find((entry) => entry.id === machine.definitionId)!.reliability;
  if (machine.mechanicalFailure?.kind === "wreck") return "wrecked";
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

/** Deterministic authored post-batch mechanical consequence.
 * Never runs during idle/blocked ticks or on a failed extraction attempt. */
export function applyMechanicalFailure(c: Content, s: Save, machine: Machine): void {
  const profile = c.machines.find((d) => d.id === machine.definitionId)!.reliability;
  if (!profile || machine.mechanicalFailure || machine.incident) return;
  const load = assessMineralExtraction(c, machine);
  if (load.compatibility === "impossible") return;
  // The severe-load branch comes FIRST: a catastrophic result must never
  // be swallowed by the less severe jam/tool-break boundary.
  const wreck = profile.wreck;
  const fault = profile.failure;
  const wreckNow = !!wreck && machine.integrity <= wreck.integrityAtOrBelow &&
    load.stressLoad >= wreck.minimumStressLoad;
  const ordinary = !!fault && machine.integrity <= fault.integrityAtOrBelow &&
    load.stressLoad >= fault.minimumStressLoad;
  if (!wreckNow && !ordinary) return;
  machine.mechanicalFailure = {
    kind: wreckNow ? "wreck" : fault!.kind,
    observedLoad: load.compatibility,
    atTick: s.tick,
  };
  machine.enabled = false;
}
