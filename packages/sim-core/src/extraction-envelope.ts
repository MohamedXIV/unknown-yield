import type { Content } from "@site/content";
import type { Machine } from "./types";
import { depositDefinition } from "./deposits";

/** Deterministic integer, ordinal load, never a recipe/hidden truth lookup. */
export type ExtractionAssessment = {
  compatibility: "nominal" | "strained" | "impossible";
  durationTicks: number;
  fuelCost: number;
  stressLoad: number;
};

export function assessMineralExtraction(
  content: Content,
  machine: Pick<Machine, "definitionId" | "depositId"> &
    Partial<Pick<Machine, "operatingModeId">>,
): ExtractionAssessment {
  const definition = content.machines.find((d) => d.id === machine.definitionId)!;
  const nominal: ExtractionAssessment = {
    compatibility: "nominal",
    durationTicks: definition.durationTicks,
    fuelCost: definition.fuel,
    stressLoad: 0,
  };
  const envelope = definition.extractionEnvelope;
  // Legacy machines/materials and atmospheric intakes keep original rules.
  if (!envelope || definition.sourceKind === "atmosphere") return nominal;
  const deposit = depositDefinition(content, machine.depositId);
  const properties = content.materials.find(
    (m) => m.id === deposit?.material,
  )?.mechanics;
  if (!properties) return nominal;

  const mode = definition.operatingModes.find(
    (m) => m.id === (machine.operatingModeId ?? definition.operatingModes[0]?.id),
  );
  const load = Math.max(
    0,
    properties.hardness * 2 + properties.abrasiveness - properties.brittleness,
  );
  const maximum = envelope.maximumLoad + (mode?.maximumLoadBonus ?? 0);
  if (load > maximum) {
    return { ...nominal, compatibility: "impossible", stressLoad: load };
  }
  const excess = Math.max(
    0,
    load - envelope.nominalLoad - (mode?.nominalLoadBonus ?? 0),
  );
  // Multiply basis-point factors first; ceil only once for stable parity.
  const durationTicks = Math.max(1, Math.ceil(
    definition.durationTicks *
      (10000 + excess * envelope.strainedDurationPerLoadBps) *
      (mode?.durationBps ?? 10000) / 100000000,
  ));
  return {
    compatibility: excess ? "strained" : "nominal",
    durationTicks,
    fuelCost: definition.fuel + excess * envelope.strainedFuelPerLoad +
      (mode?.extraFuel ?? 0),
    stressLoad: load,
  };
}
