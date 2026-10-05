import { checkContainment, type Content } from "@site/content";
import { terminalCapabilityUnlocked, terminalCanExport } from "./milestones";
import {
  amount,
  change,
  total,
  type Save,
  type Point,
  type TerminalModuleView,
  type CommandResult,
} from "./types";
import { contains } from "./geometry";
import { receivingDiagnostic, type TransportDiagnostic } from "./containment";
import {
  companyKnowsMaterial,
  exchangeDefinition,
  applyExportCompensation,
} from "./market";
import { recordOrderExport } from "./opportunities";

export const terminalModuleDefinition = (c: Content, id: string) =>
  c.site.terminalModules.find((d) => d.id === id);
export function terminalModuleUnlocked(
  c: Content,
  s: Pick<Save, "milestones">,
  id: string,
): boolean {
  const d = terminalModuleDefinition(c, id);
  return (
    !!d && terminalCapabilityUnlocked(c, s, d.requiredTerminalCapabilityId)
  );
}
export function terminalModuleViews(c: Content, s: Save): TerminalModuleView[] {
  return c.site.terminalModules.map((d) => {
    const t = s.terminalModules[d.id],
      unlocked = terminalModuleUnlocked(c, s, d.id);
    const contents =
      t && (!t.materialId || companyKnowsMaterial(c, s, t.materialId))
        ? { ...t }
        : { materialId: null, quantity: 0 };
    return {
      ...d,
      installed: !!t,
      unlocked,
      contents,
      canInstall:
        unlocked && !t && amount(s.stock, c.site.buildMaterial) >= d.cost,
      canRemove: !!t && !t.quantity,
      blockedReason: !unlocked
        ? "locked"
        : t
          ? t.quantity
            ? "loaded"
            : "installed"
          : amount(s.stock, c.site.buildMaterial) < d.cost
            ? "needs-stock"
            : "not-installed",
    };
  });
}
export function validateTerminalModules(
  c: Content,
  s: Save,
  known: ReadonlySet<string>,
): void {
  for (const [id, contents] of Object.entries(s.terminalModules)) {
    const d = terminalModuleDefinition(c, id);
    if (!d || !terminalModuleUnlocked(c, s, id))
      throw Error("Invalid installed terminal module");
    if (
      contents.quantity > d.capacity ||
      (contents.materialId === null) !== (contents.quantity === 0)
    )
      throw Error("Invalid terminal module contents");
    if (
      contents.materialId &&
      (!known.has(contents.materialId) ||
        !checkContainment(
          c,
          contents.materialId,
          [d.handlingState],
          d.containmentCapabilities,
        ).ok)
    )
      throw Error("Invalid terminal cargo handling");
  }
}
export function moduleCommand(
  c: Content,
  s: Save,
  id: string,
  install: boolean,
  apply: boolean,
) {
  const d = terminalModuleDefinition(c, id),
    contents = s.terminalModules[id];
  const reason = !d
    ? "unknown"
    : install
      ? !terminalModuleUnlocked(c, s, id)
        ? "locked"
        : contents
          ? "installed"
          : amount(s.stock, c.site.buildMaterial) < d.cost
            ? "needs-stock"
            : null
      : !contents
        ? "not-installed"
        : contents.quantity > 0
          ? "loaded"
          : null;
  if (reason)
    return {
      ok: false,
      message: reason,
      messageKey: `ui.terminal.module.result.${reason}`,
    };
  if (apply) {
    change(s.stock, c.site.buildMaterial, install ? -d!.cost : d!.cost);
    if (install) s.terminalModules[id] = { materialId: null, quantity: 0 };
    else delete s.terminalModules[id];
  }
  return {
    ok: true,
    message: install ? "installed" : "removed",
    messageKey: `ui.terminal.module.result.${install ? "success" : "removed"}`,
    cost: d!.cost,
  };
}

export function terminalModuleAt(
  c: Content,
  point: Point,
  direction: number,
  state: "liquid" | "gas",
) {
  return c.site.terminalModules.find(
    (d) =>
      d.handlingState === state &&
      point.x === c.site.terminal.x + d.inlet.x &&
      point.y === c.site.terminal.y + d.inlet.y &&
      direction === (d.inlet.side + 2) % 4,
  );
}
export function terminalReceiver(
  c: Content,
  s: Save,
  point: Point,
  direction: number,
  state: "liquid" | "gas",
) {
  const d = terminalModuleAt(c, point, direction, state);
  const contents = d && s.terminalModules[d.id];
  if (!d || !contents || !terminalModuleUnlocked(c, s, d.id)) return null;
  return {
    id: "terminal:" + d.id,
    capabilities: d.containmentCapabilities,
    material: contents.materialId,
    quantity: contents.quantity,
    capacity: d.capacity,
    put(materialId: string, units: number) {
      contents.materialId = materialId;
      contents.quantity += units;
    },
  };
}
export function terminalInletDiagnostic(
  c: Content,
  s: Save,
  point: Point,
  direction: number,
  state: "liquid" | "gas",
  materialId: string,
): TransportDiagnostic | null {
  if (!contains(c.site.terminal, point)) return null;
  const d = terminalModuleAt(c, point, direction, state);
  if (!d) return { reason: "handling-state", materialId };
  if (!terminalModuleUnlocked(c, s, d.id))
    return {
      reason: "terminal-module-locked",
      materialId,
      terminalModuleId: d.id,
    };
  if (!s.terminalModules[d.id])
    return {
      reason: "terminal-module-missing",
      materialId,
      terminalModuleId: d.id,
    };
  return {
    ...receivingDiagnostic(
      c,
      materialId,
      state,
      d.containmentCapabilities,
      terminalReceiver(c, s, point, direction, state),
    ),
    terminalModuleId: d.id,
  };
}
export function terminalMaterialQuantity(c: Content, s: Save, id: string): number {
  const material = c.materials.find((entry) => entry.id === id);
  if (!material) return 0;
  if (material.handlingState === "solid") return amount(s.staging, id);
  return c.site.terminalModules.reduce((sum, definition) => {
    const contents = s.terminalModules[definition.id];
    return (
      sum +
      (contents?.materialId === id &&
      terminalModuleUnlocked(c, s, definition.id) &&
      checkContainment(
        c,
        id,
        [definition.handlingState],
        definition.containmentCapabilities,
      ).ok
        ? contents.quantity
        : 0)
    );
  }, 0);
}

const shipmentResult = (
  ok: boolean,
  code: string,
  message: string,
): CommandResult => ({
  ok,
  message,
  messageKey: `ui.terminal.shipment.result.${code}`,
});

export function shipmentManifestError(c: Content, s: Save): string | null {
  if (total(s.shipmentManifest) > c.site.terminalShipmentCapacity)
    return "capacity";
  for (const [id, units] of Object.entries(s.shipmentManifest)) {
    if (
      units <= 0 ||
      !companyKnowsMaterial(c, s, id) ||
      !exchangeDefinition(c, id)
    )
      return "invalid";
    if (!terminalCanExport(c, s, id)) return "locked";
    if (units > terminalMaterialQuantity(c, s, id)) return "unavailable";
  }
  return null;
}

export function shipmentQuantityCommand(
  c: Content,
  s: Save,
  id: string,
  quantity: number,
  apply: boolean,
): CommandResult {
  if (!companyKnowsMaterial(c, s, id))
    return shipmentResult(false, "unknown", "Unknown material");
  if (!exchangeDefinition(c, id))
    return shipmentResult(
      false,
      "unaccepted",
      "The company does not accept this material",
    );
  if (!terminalCanExport(c, s, id))
    return shipmentResult(false, "locked", "Terminal handling is not certified");
  if (quantity > terminalMaterialQuantity(c, s, id))
    return shipmentResult(
      false,
      "unavailable",
      "Shipment quantity exceeds physical terminal cargo",
    );
  const nextTotal =
    total(s.shipmentManifest) - amount(s.shipmentManifest, id) + quantity;
  if (nextTotal > c.site.terminalShipmentCapacity)
    return shipmentResult(
      false,
      "capacity",
      "Shipment exceeds terminal cargo capacity",
    );
  if (apply) {
    if (quantity === 0) delete s.shipmentManifest[id];
    else s.shipmentManifest[id] = quantity;
  }
  return shipmentResult(true, "selected", "Shipment manifest updated");
}

function settleMaterial(
  c: Content,
  s: Save,
  id: string,
  units: number,
  take: (units: number) => void,
): void {
  if (units <= 0) return;
  applyExportCompensation(c, s, id, units);
  recordOrderExport(c, s, id, units);
  s.exported += units;
  change(s.flows.exported, id, units);
  take(units);
}

function takeTerminalMaterial(
  c: Content,
  s: Save,
  id: string,
  units: number,
): void {
  const material = c.materials.find((entry) => entry.id === id)!;
  if (material.handlingState === "solid") {
    change(s.staging, id, -units);
    return;
  }
  let remaining = units;
  for (const definition of c.site.terminalModules) {
    const contents = s.terminalModules[definition.id];
    if (contents?.materialId !== id || remaining === 0) continue;
    const moved = Math.min(contents.quantity, remaining);
    contents.quantity -= moved;
    remaining -= moved;
    if (contents.quantity === 0) contents.materialId = null;
  }
}

export function dispatchShipmentCommand(
  c: Content,
  s: Save,
  apply: boolean,
): CommandResult {
  if (total(s.shipmentManifest) === 0)
    return shipmentResult(false, "empty", "Shipment manifest is empty");
  const error = shipmentManifestError(c, s);
  if (error)
    return shipmentResult(
      false,
      error,
      error === "capacity"
        ? "Shipment exceeds terminal cargo capacity"
        : error === "locked"
          ? "Terminal handling is not certified"
          : error === "unavailable"
            ? "Shipment cargo is no longer physically available"
            : "Invalid shipment manifest",
    );
  if (apply) {
    for (const [id, units] of Object.entries(s.shipmentManifest).sort(([a], [b]) =>
      a.localeCompare(b),
    ))
      settleMaterial(c, s, id, units, (shipped) =>
        takeTerminalMaterial(c, s, id, shipped),
      );
    s.shipmentManifest = {};
  }
  return shipmentResult(true, "dispatched", "Shipment dispatched");
}

export function settleTerminalExports(c: Content, s: Save): void {
  // A selected explicit manifest reserves intent, not inventory. While one is
  // pending, the legacy auto-export sweep must not race it or silently choose
  // different cargo for the player.
  if (total(s.shipmentManifest) > 0) return;
  let remainingCapacity = c.site.terminalShipmentCapacity;
  const ship = (id: string, units: number, take: (units: number) => void) => {
    if (
      remainingCapacity <= 0 ||
      units <= 0 ||
      s.policies[id] !== "export" ||
      !companyKnowsMaterial(c, s, id) ||
      !exchangeDefinition(c, id) ||
      !terminalCanExport(c, s, id)
    )
      return;
    const shipped = Math.min(units, remainingCapacity);
    settleMaterial(c, s, id, shipped, take);
    remainingCapacity -= shipped;
  };
  for (const material of c.materials) {
    if (remainingCapacity <= 0) break;
    ship(material.id, amount(s.staging, material.id), (units) =>
      change(s.staging, material.id, -units),
    );
  }
  for (const d of c.site.terminalModules) {
    if (remainingCapacity <= 0) break;
    const t = s.terminalModules[d.id];
    if (
      !t?.materialId ||
      !terminalModuleUnlocked(c, s, d.id) ||
      !checkContainment(
        c,
        t.materialId,
        [d.handlingState],
        d.containmentCapabilities,
      ).ok
    )
      continue;
    ship(t.materialId, t.quantity, (units) => {
      t.quantity -= units;
      if (t.quantity === 0) t.materialId = null;
    });
  }
}
