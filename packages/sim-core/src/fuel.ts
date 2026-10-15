import type { Content, MachineDefinition } from "@site/content";
import { change, type FuelClassView, type Save } from "./types";

export function fuelClassDefinition(c: Content, id: string | null | undefined) {
  return id ? c.fuelClasses.find((entry) => entry.id === id) : undefined;
}

export function fuelClassUnlocked(
  c: Content,
  s: Pick<Save, "milestones">,
  id: string,
): boolean {
  const definition = fuelClassDefinition(c, id);
  return (
    !!definition &&
    Object.hasOwn(s.milestones, definition.requiredMilestoneId)
  );
}

export function fuelClassHeld(
  c: Content,
  s: Pick<Save, "terminalModules">,
  id: string,
): number {
  const definition = fuelClassDefinition(c, id);
  if (!definition) return 0;
  const contents = s.terminalModules[definition.terminalModuleId];
  return contents?.materialId === definition.materialId
    ? contents.quantity
    : 0;
}

export function fuelClassViews(c: Content, s: Save): FuelClassView[] {
  return c.fuelClasses.map((definition) => ({
    ...definition,
    unlocked: fuelClassUnlocked(c, s, definition.id),
    terminalModuleInstalled: Object.hasOwn(
      s.terminalModules,
      definition.terminalModuleId,
    ),
    held: fuelClassHeld(c, s, definition.id),
  }));
}

export function machineFuelBlock(
  c: Content,
  s: Pick<Save, "fuel" | "milestones" | "terminalModules">,
  definition: MachineDefinition,
  fuelCost = definition.fuel,
): "fuel-class-locked" | "needs-special-fuel" | "needs-fuel" | null {
  if (!definition.fuelClassId)
    return s.fuel < fuelCost ? "needs-fuel" : null;
  if (!fuelClassUnlocked(c, s, definition.fuelClassId))
    return "fuel-class-locked";
  return fuelClassHeld(c, s, definition.fuelClassId) < fuelCost
    ? "needs-special-fuel"
    : null;
}

export function consumeMachineFuel(
  c: Content,
  s: Pick<Save, "fuel" | "milestones" | "terminalModules" | "flows">,
  definition: MachineDefinition,
  fuelCost = definition.fuel,
): void {
  const blocked = machineFuelBlock(c, s, definition, fuelCost);
  if (blocked) throw new Error("Cannot consume unavailable machine fuel");
  if (!definition.fuelClassId) {
    s.fuel -= fuelCost;
    return;
  }
  const fuelClass = fuelClassDefinition(c, definition.fuelClassId)!;
  const contents = s.terminalModules[fuelClass.terminalModuleId]!;
  contents.quantity -= fuelCost;
  if (contents.quantity === 0) contents.materialId = null;
  change(s.flows.consumed, fuelClass.materialId, fuelCost);
}
