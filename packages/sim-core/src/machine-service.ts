import { checkContainment, type Content } from "@site/content";
import { companyKnowsMaterial } from "./market";
import { footprint, footprintGap } from "./geometry";
import { liquidContainment } from "./containment";
import { amount, change, total, type Machine, type MachineServiceView,
  type MachineSalvageView, type Inventory, type Save } from "./types";

type ServiceRule = NonNullable<NonNullable<Content["machines"][number]["reliability"]>["service"]>;

function sourceStorage(c: Content, s: Save, machine: Machine, rule: ServiceRule) {
  const definition = c.machines.find((entry) => entry.id === machine.definitionId)!;
  const rect = footprint(machine, definition);
  const sources = Object.values(s.storages)
    .filter((storage) => {
      const d = c.storages.find((entry) => entry.id === storage.definitionId)!;
      return footprintGap(rect, footprint(storage, d)) <= rule.range;
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
  // Stranded material must be moved through a real recovery path first.
  // A contained, empty lockout can instead be cleared by locally funded
  // service; the old command could not recover zero-stranded hazards at all.
  if (machine.incident && total(machine.incidentInventory) > 0) return "hazard";
  if (machine.mechanicalFailure?.kind === "wreck") return "wrecked";
  if (machine.enabled) return "enabled";
  if (!machine.incident && machine.integrity === 10000 && machine.wear === 0)
    return "already-serviced";
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
    // Physically paid service may clear an empty hazardous lockout. The
    // stopped machine remains disabled until the player restarts it.
    if (machine.incident && total(machine.incidentInventory) === 0)
      machine.incident = null;
    // One service may not restore enough integrity. Keep the physical fault
    // locked until an actual locally funded repair crosses its threshold.
    const failure = profile?.failure;
    if (machine.mechanicalFailure && failure &&
        machine.integrity > failure.integrityAtOrBelow)
      machine.mechanicalFailure = null;
  }
  return { ok: true, message: "Machine serviced with local physical parts" };
}

/** Salvage never converts real cargo or embodied machinery to global stock.
 * A single nearby storage must fit every physical part before the machine is
 * removed; the regular dismantle command stays conservative. */
function salvagePlan(c: Content, s: Save, machine: Machine): {
  view: MachineSalvageView;
  destination: Save["storages"][string] | null;
  recovered: Inventory;
  liquidTank: Save["tanks"][string] | null;
  liquidMaterialId: string | null;
  liquidUnits: number;
  gasVessel: Save["pressureVessels"][string] | null;
  gasMaterialId: string | null;
  gasUnits: number;
} {
  const definition = c.machines.find((d) => d.id === machine.definitionId)!;
  const range = definition.reliability?.service?.range;
  const recovered: Inventory = {};
  const liquids: Inventory = {};
  const gases: Inventory = {};
  let unsupportedCargo = false;
  for (const inventory of [machine.input, machine.output]) {
    for (const [materialId, units] of Object.entries(inventory)) {
      const material = c.materials.find((m) => m.id === materialId);
      if (material?.handlingState === "solid") change(recovered, materialId, units);
      else if (material?.handlingState === "liquid") change(liquids, materialId, units);
      else if (material?.handlingState === "gas") change(gases, materialId, units);
      else unsupportedCargo = true;
    }
  }
  // Structure always goes to a physical solid storage, not a fluid tank.
  change(recovered, c.site.buildMaterial, definition.cost);
  const liquidEntries = Object.entries(liquids).filter(([, units]) => units > 0);
  const liquidMaterialId = liquidEntries.length === 1 ? liquidEntries[0]![0] : null;
  const liquidUnits = total(liquids);
  const gasEntries = Object.entries(gases).filter(([, units]) => units > 0);
  const gasMaterialId = gasEntries.length === 1 ? gasEntries[0]![0] : null;
  const gasUnits = total(gases);
  const cargoUnits = total(machine.input) + total(machine.output);
  const structuralUnits = definition.cost;
  const base = { cargoUnits, structuralUnits, liquidUnits, gasUnits };
  const blocked = (reason: NonNullable<MachineSalvageView["reason"]>) => ({
    view: { ...base, ready: false, reason }, destination: null,
    recovered, liquidTank: null, liquidMaterialId, liquidUnits,
    gasVessel: null, gasMaterialId, gasUnits,
  });
  if (!machine.mechanicalFailure || machine.enabled || machine.job)
    return blocked("not-failed");
  if (machine.incident || total(machine.incidentInventory))
    return blocked("hazard");
  // Each real vessel can contain only a single material identity. No
  // mixing incompatible liquids or gases into one physical destination.
  if (unsupportedCargo || liquidEntries.length > 1 || gasEntries.length > 1 ||
      (liquidUnits && !c.liquidLogistics) || (gasUnits && !c.gasLogistics))
    return blocked("unsupported-cargo");
  const rect = footprint(machine, definition);
  const nearby = Object.values(s.storages)
    .filter((storage) => {
      const sd = c.storages.find((d) => d.id === storage.definitionId)!;
      return range !== undefined && footprintGap(rect, footprint(storage, sd)) <= range;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  // Select only an actually capable local storage. Safe containment must
  // be true for EVERY material, including the recovered build structure.
  const capable = nearby.filter((storage) => {
    const sd = c.storages.find((d) => d.id === storage.definitionId)!;
    return Object.keys(recovered).every((id) =>
      checkContainment(c, id, ["solid"], sd.containmentCapabilities).ok);
  });
  const required = total(recovered);
  const destination = capable.find((storage) => {
    const sd = c.storages.find((d) => d.id === storage.definitionId)!;
    return sd.capacity - total(storage.inventory) >= required;
  }) ?? null;
  const reason = destination ? null : nearby.length === 0
    ? "no-local-storage" : capable.length === 0
      ? "missing-containment" : "insufficient-capacity";
  if (reason) return blocked(reason);
  let liquidTank: Save["tanks"][string] | null = null;
  if (liquidUnits) {
    const tanks = Object.values(s.tanks)
      .filter((tank) => footprintGap(rect, footprint(tank, c.liquidLogistics!.tank)) <= range!)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!tanks.length) return blocked("no-local-tank");
    const contained = tanks.filter((tank) =>
      checkContainment(c, liquidMaterialId!, ["liquid"],
        liquidContainment(c, "tank", tank.containmentProfileId)).ok);
    if (!contained.length) return blocked("liquid-containment");
    const matching = contained.filter((tank) =>
      tank.materialId === null || tank.materialId === liquidMaterialId);
    if (!matching.length) return blocked("liquid-identity");
    liquidTank = matching.find((tank) =>
      tank.quantity + liquidUnits <= c.liquidLogistics!.tank.capacity) ?? null;
    if (!liquidTank) return blocked("liquid-capacity");
  }
  let gasVessel: Save["pressureVessels"][string] | null = null;
  if (gasUnits) {
    const vessels = Object.values(s.pressureVessels)
      .filter((vessel) =>
        footprintGap(rect, footprint(vessel, c.gasLogistics!.vessel)) <= range!)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!vessels.length) return blocked("no-local-vessel");
    const contained = vessels.filter(() =>
      checkContainment(c, gasMaterialId!, ["gas"],
        c.gasLogistics!.vessel.containmentCapabilities).ok);
    if (!contained.length) return blocked("gas-containment");
    const matching = contained.filter((vessel) =>
      vessel.materialId === null || vessel.materialId === gasMaterialId);
    if (!matching.length) return blocked("gas-identity");
    gasVessel = matching.find((vessel) =>
      vessel.quantity + gasUnits <= c.gasLogistics!.vessel.capacity) ?? null;
    if (!gasVessel) return blocked("gas-capacity");
  }
  // Commit can only proceed after every required material has a valid,
  // physically local recipient. No partial tank/vessel/storage transfers.
  return {
    view: { ...base, ready: true, reason: null },
    destination, recovered, liquidTank, liquidMaterialId, liquidUnits,
    gasVessel, gasMaterialId, gasUnits,
  };
}

/** Physical deconstruction: ore/input/output and embodied build material go
 * into the same reachable storage; no silent deletion or global refund. */
export function machineSalvageView(c: Content, s: Save, machine: Machine): MachineSalvageView | null {
  return machine.mechanicalFailure ? salvagePlan(c, s, machine).view : null;
}

export function salvageMachine(c: Content, s: Save, machine: Machine, apply: boolean): {
  ok: boolean; message: string;
} {
  const { view, destination, recovered, liquidTank, liquidMaterialId, liquidUnits,
    gasVessel, gasMaterialId, gasUnits } = salvagePlan(c, s, machine);
  if (!view.ready || !destination)
    return { ok: false, message: "Salvage unavailable: " + (view.reason ?? "no-local-storage") };
  if (apply) {
    for (const [materialId, units] of Object.entries(recovered))
      change(destination.inventory, materialId, units);
    if (liquidTank) {
      liquidTank.materialId = liquidMaterialId;
      liquidTank.quantity += liquidUnits;
    }
    if (gasVessel) {
      gasVessel.materialId = gasMaterialId;
      gasVessel.quantity += gasUnits;
    }
    delete s.machines[machine.id];
  }
  return { ok: true, message: "Failed machine salvaged to local physical storage and compatible fluid vessels" };
}
