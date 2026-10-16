import type { Content } from "@site/content";
import { companyKnowsMaterial } from "./market";
import { footprint } from "./geometry";
import { amount, change, type Machine, type MachineServiceView, type Save } from "./types";

type ServiceRule = NonNullable<NonNullable<Content["machines"][number]["reliability"]>["service"]>;

/** Axis-aligned rectangle separation in whole map cells. Touching counts as local. */
function cellGap(a: { x: number; y: number; width: number; height: number },
                 b: { x: number; y: number; width: number; height: number }) {
  const dx = Math.max(0, a.x - (b.x + b.width), b.x - (a.x + a.width));
  const dy = Math.max(0, a.y - (b.y + b.height), b.y - (a.y + a.height));
  return dx + dy;
}

function sourceStorage(c: Content, s: Save, machine: Machine, rule: ServiceRule) {
  const definition = c.machines.find((entry) => entry.id === machine.definitionId)!;
  const rect = footprint(machine, definition);
  const sources = Object.values(s.storages)
    .filter((storage) => {
      const d = c.storages.find((entry) => entry.id === storage.definitionId)!;
      return cellGap(rect, footprint(storage, d)) <= rule.range;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  return {
    availableUnits: sources.reduce(
      (n, storage) => Math.max(n, amount(storage.inventory, rule.materialId)), 0,
    ),
    source: sources.find((storage) =>
      amount(storage.inventory, rule.materialId) >= rule.units),
  };
}

function reason(machine: Machine, available: boolean): MachineServiceView["reason"] {
  if (machine.job) return "running";
  if (machine.incident) return "hazard";
  if (machine.enabled) return "enabled";
  if (machine.integrity === 10000 && machine.wear === 0) return "already-serviced";
  if (!available) return "no-local-parts";
  return null;
}

/** Runtime eligibility derives from one physically accessible local store. */
export function machineServiceView(
  c: Content, s: Save, machine: Machine,
): MachineServiceView | null {
  const definition = c.machines.find((entry) => entry.id === machine.definitionId)!;
  const rule = definition.reliability?.service;
  if (!rule) return null;
  const { source, availableUnits } = sourceStorage(c, s, machine, rule);
  const blocked = reason(machine, !!source);
  return {
    materialId: companyKnowsMaterial(c, s, rule.materialId) ? rule.materialId : null,
    units: rule.units, availableUnits: companyKnowsMaterial(c, s, rule.materialId)
      ? availableUnits : 0,
    ready: blocked === null,
    reason: blocked,
  };
}

/** Preview and commit share the same guard. No site stock/global teleport. */
export function serviceMachine(
  c: Content, s: Save, machine: Machine, apply: boolean,
): { ok: boolean; message: string } {
  const profile = c.machines.find((d) => d.id === machine.definitionId)!.reliability;
  const rule = profile?.service;
  if (!rule) return { ok: false, message: "Equipment has no authored service procedure" };
  const { source } = sourceStorage(c, s, machine, rule);
  const blocked = reason(machine, !!source);
  if (blocked) return { ok: false, message: "Service unavailable: " + blocked };
  if (apply) {
    // One chosen, deterministic local storage location owns the full debit.
    change(source!.inventory, rule.materialId, -rule.units);
    change(s.flows.consumed, rule.materialId, rule.units);
    machine.integrity = Math.min(10000, machine.integrity + rule.restoreIntegrity);
    machine.wear = Math.max(0, machine.wear - rule.reduceWear);
    // One service may not restore enough integrity. Keep the physical fault
    // locked until an actual locally funded repair crosses its threshold.
    const failure = profile?.failure;
    if (machine.mechanicalFailure && failure &&
        machine.integrity > failure.integrityAtOrBelow)
      machine.mechanicalFailure = null;
  }
  return { ok: true, message: "Machine serviced with local physical parts" };
}
