import { checkContainment, type Content } from "@site/content";
import { footprint } from "./geometry";
import { liquidContainment } from "./containment";
import { change, total, type Machine, type MachineIncidentRecoveryView,
  type Save } from "./types";

type Receiver =
  | { kind: "solid"; entity: Save["storages"][string] }
  | { kind: "liquid"; entity: Save["tanks"][string] }
  | { kind: "gas"; entity: Save["pressureVessels"][string] };

/** A recovery crew must be able to touch both structures: no remote teleport. */
function touching(a: { x: number; y: number; width: number; height: number },
                  b: { x: number; y: number; width: number; height: number }) {
  return a.x <= b.x + b.width && b.x <= a.x + a.width &&
    a.y <= b.y + b.height && b.y <= a.y + a.height;
}

function recoveryPlan(c: Content, s: Save, machine: Machine): {
  view: MachineIncidentRecoveryView;
  receiver: Receiver | null;
  materialId: string | null;
} {
  const entries = Object.entries(machine.incidentInventory).filter(([, n]) => n > 0);
  if (!machine.incident || machine.job || machine.enabled || entries.length !== 1) {
    return { view: { units: total(machine.incidentInventory),
      handlingState: null, ready: false, reason: "unsupported-cargo" },
      receiver: null, materialId: null };
  }
  const [materialId, units] = entries[0]!;
  const material = c.materials.find(m => m.id === materialId);
  const phase = material?.handlingState ?? null;
  const base = { units, handlingState: phase };
  const fail = (reason: NonNullable<MachineIncidentRecoveryView["reason"]>) => ({
    view: { ...base, ready: false, reason }, receiver: null, materialId,
  });
  if (!phase) return fail("unsupported-cargo");
  const d = c.machines.find(m => m.id === machine.definitionId)!;
  const position = footprint(machine, d);
  if (phase === "solid") {
    const candidates = Object.values(s.storages)
      .filter(e => touching(position,
        footprint(e, c.storages.find(d => d.id === e.definitionId)!)))
      .sort((a,b) => a.id.localeCompare(b.id));
    if (!candidates.length) return fail("no-local-storage");
    const contained = candidates.filter(e => checkContainment(c, materialId,
      ["solid"], c.storages.find(d => d.id === e.definitionId)!.containmentCapabilities).ok);
    if (!contained.length) return fail("missing-containment");
    const found = contained.find(e =>
      total(e.inventory) + units <= c.storages.find(d => d.id === e.definitionId)!.capacity);
    if (!found) return fail("insufficient-capacity");
    return { view: { ...base, ready: true, reason: null },
      receiver: { kind: "solid", entity: found }, materialId };
  }
  if (phase === "liquid") {
    if (!c.liquidLogistics) return fail("unsupported-cargo");
    const candidates = Object.values(s.tanks)
      .filter(e => touching(position, footprint(e, c.liquidLogistics!.tank)))
      .sort((a,b) => a.id.localeCompare(b.id));
    if (!candidates.length) return fail("no-local-tank");
    const contained = candidates.filter(e => checkContainment(c, materialId,
      ["liquid"], liquidContainment(c, "tank", e.containmentProfileId)).ok);
    if (!contained.length) return fail("liquid-containment");
    const matching = contained.filter(e => !e.materialId || e.materialId === materialId);
    if (!matching.length) return fail("liquid-identity");
    const found = matching.find(e => e.quantity + units <= c.liquidLogistics!.tank.capacity);
    if (!found) return fail("liquid-capacity");
    return { view: { ...base, ready: true, reason: null },
      receiver: { kind: "liquid", entity: found }, materialId };
  }
  if (!c.gasLogistics) return fail("unsupported-cargo");
  const candidates = Object.values(s.pressureVessels)
    .filter(e => touching(position, footprint(e, c.gasLogistics!.vessel)))
    .sort((a,b) => a.id.localeCompare(b.id));
  if (!candidates.length) return fail("no-local-vessel");
  if (!checkContainment(c, materialId, ["gas"],
    c.gasLogistics.vessel.containmentCapabilities).ok) return fail("gas-containment");
  const matching = candidates.filter(e => !e.materialId || e.materialId === materialId);
  if (!matching.length) return fail("gas-identity");
  const found = matching.find(e => e.quantity + units <= c.gasLogistics!.vessel.capacity);
  if (!found) return fail("gas-capacity");
  return { view: { ...base, ready: true, reason: null },
    receiver: { kind: "gas", entity: found }, materialId };
}

/** This complements the original machine-output reclaim path.
 * The trapped inventory moves straight to a real physically adjacent receiver.
 * Preview and command share exactly the same deterministic eligibility plan. */
export function machineIncidentRecoveryView(c: Content, s: Save, machine: Machine):
  MachineIncidentRecoveryView | null {
  return machine.incident && total(machine.incidentInventory) > 0
    ? recoveryPlan(c, s, machine).view : null;
}

export function recoverIncidentToReceiver(c: Content, s: Save, machine: Machine,
  apply: boolean): { ok: boolean; message: string } {
  const { view, receiver, materialId } = recoveryPlan(c, s, machine);
  if (!view.ready || !receiver || !materialId)
    return { ok: false, message: "Physical incident recovery unavailable: " +
      (view.reason ?? "unsupported-cargo") };
  if (apply) {
    if (receiver.kind === "solid")
      change(receiver.entity.inventory, materialId, view.units);
    else {
      receiver.entity.materialId = materialId;
      receiver.entity.quantity += view.units;
    }
    change(machine.incidentInventory, materialId, -view.units);
    machine.incident = null;
    machine.enabled = false;
  }
  return { ok: true, message: "Trapped hazard material transferred to adjacent containment" };
}
