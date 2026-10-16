import type { Content, MachineDefinition } from "@site/content";
import type { MachineDefinitionView, MaterialView } from "./types";

/** Explicit public allowlists: future authored fields cannot leak via a spread. */
export function publicMaterial(material: Content["materials"][number]): MaterialView {
  return {
    id: material.id,
    nameKey: material.nameKey,
    color: material.color,
    handlingState: material.handlingState,
    requiredContainment: material.requiredContainment,
  };
}

export function publicMachineDefinition(
  definition: MachineDefinition,
  unlocked: boolean,
): MachineDefinitionView {
  return {
    id: definition.id,
    nameKey: definition.nameKey,
    role: definition.role,
    presentation: definition.presentation,
    maxExtractionDepth: definition.maxExtractionDepth,
    sourceKind: definition.sourceKind,
    processConditionId: definition.processConditionId,
    fuelClassId: definition.fuelClassId,
    inputContainment: definition.inputContainment,
    outputContainment: definition.outputContainment,
    inputStates: definition.inputStates,
    outputStates: definition.outputStates,
    operations: definition.operations,
    capacity: definition.capacity,
    fuel: definition.fuel,
    durationTicks: definition.durationTicks,
    width: definition.width,
    height: definition.height,
    cost: definition.cost,
    operatingModes: definition.operatingModes.map((mode) => ({
      id: mode.id,
      nameKey: mode.nameKey,
    })),
    unlock: definition.unlock
      ? { unlocked, hintKey: definition.unlock.hintKey }
      : null,
  };
}
