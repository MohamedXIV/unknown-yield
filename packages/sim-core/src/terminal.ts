import { checkContainment, type Content } from "@site/content";
import {
  refreshMilestones,
  terminalCapabilityUnlocked,
  terminalCanExport,
} from "./milestones";
import {
  amount,
  change,
  total,
  type Save,
  type Point,
  type ShipmentManifestView,
  type TerminalModuleView,
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
export function terminalCargoAmount(
  c: Content,
  s: Save,
  materialId: string,
): number {
  const material = c.materials.find((entry) => entry.id === materialId);
  if (!material) return 0;
  if (material.handlingState === "solid")
    return amount(s.staging, materialId);
  return c.site.terminalModules.reduce((sum, definition) => {
    const contents = s.terminalModules[definition.id];
    return (
      sum +
      (definition.handlingState === material.handlingState &&
      contents?.materialId === materialId
        ? contents.quantity
        : 0)
    );
  }, 0);
}

export function shipmentManifestView(
  c: Content,
  s: Save,
): ShipmentManifestView {
  const materials = c.economy.exchange
    .filter((listing) => companyKnowsMaterial(c, s, listing.materialId))
    .map((listing) => {
      const material = c.materials.find(
        (entry) => entry.id === listing.materialId,
      )!;
      return {
        materialId: material.id,
        handlingState: material.handlingState,
        available: terminalCargoAmount(c, s, material.id),
        selected: amount(s.shipmentManifest, material.id),
        canShip: terminalCanExport(c, s, material.id),
      };
    });
  return {
    capacity: c.economy.shipmentCapacity,
    used: total(s.shipmentManifest),
    materials,
  };
}

export function validateShipmentManifest(
  c: Content,
  s: Save,
  known: ReadonlySet<string>,
): void {
  if (total(s.shipmentManifest) > c.economy.shipmentCapacity)
    throw new Error("Shipment manifest exceeds cargo capacity");
  for (const [materialId, quantity] of Object.entries(s.shipmentManifest))
    if (
      quantity <= 0 ||
      !known.has(materialId) ||
      !exchangeDefinition(c, materialId) ||
      !terminalCanExport(c, s, materialId) ||
      quantity > terminalCargoAmount(c, s, materialId)
    )
      throw new Error("Invalid shipment manifest");
}

export function setShipmentManifestLine(
  c: Content,
  s: Save,
  materialId: string,
  quantity: number,
  apply: boolean,
) {
  if (
    !companyKnowsMaterial(c, s, materialId) ||
    !exchangeDefinition(c, materialId)
  )
    return {
      ok: false,
      message: "Unknown or unavailable shipment material",
      messageKey: "ui.terminal.shipment.result.unknown",
    };
  if (!terminalCanExport(c, s, materialId))
    return {
      ok: false,
      message: "Terminal handling capability unavailable",
      messageKey: "ui.terminal.shipment.result.handling",
    };
  if (quantity > terminalCargoAmount(c, s, materialId))
    return {
      ok: false,
      message: "Manifest exceeds physically staged cargo",
      messageKey: "ui.terminal.shipment.result.available",
    };
  const used =
    total(s.shipmentManifest) -
    amount(s.shipmentManifest, materialId) +
    quantity;
  if (used > c.economy.shipmentCapacity)
    return {
      ok: false,
      message: "Manifest exceeds shipment capacity",
      messageKey: "ui.terminal.shipment.result.capacity",
    };
  if (apply) change(s.shipmentManifest, materialId, quantity - amount(s.shipmentManifest, materialId));
  return {
    ok: true,
    message: quantity ? "Shipment manifest updated" : "Shipment line cleared",
    messageKey: quantity
      ? "ui.terminal.shipment.result.updated"
      : "ui.terminal.shipment.result.line-cleared",
  };
}

export function clearShipmentManifest(s: Save, apply: boolean) {
  if (apply) s.shipmentManifest = {};
  return {
    ok: true,
    message: "Shipment manifest cleared",
    messageKey: "ui.terminal.shipment.result.cleared",
  };
}

function takeTerminalCargo(
  c: Content,
  s: Save,
  materialId: string,
  quantity: number,
) {
  const material = c.materials.find((entry) => entry.id === materialId)!;
  if (material.handlingState === "solid") {
    change(s.staging, materialId, -quantity);
    return;
  }
  let remaining = quantity;
  for (const definition of c.site.terminalModules) {
    if (
      remaining <= 0 ||
      definition.handlingState !== material.handlingState
    )
      continue;
    const contents = s.terminalModules[definition.id];
    if (!contents || contents.materialId !== materialId) continue;
    const take = Math.min(remaining, contents.quantity);
    contents.quantity -= take;
    remaining -= take;
    if (contents.quantity === 0) contents.materialId = null;
  }
}

export function dispatchShipment(c: Content, s: Save, apply: boolean) {
  const units = total(s.shipmentManifest);
  if (!units)
    return {
      ok: false,
      message: "Shipment manifest is empty",
      messageKey: "ui.terminal.shipment.result.empty",
    };
  const known = new Set(
    c.materials
      .filter((material) => companyKnowsMaterial(c, s, material.id))
      .map((material) => material.id),
  );
  try {
    validateShipmentManifest(c, s, known);
  } catch {
    return {
      ok: false,
      message: "Shipment manifest is no longer physically valid",
      messageKey: "ui.terminal.shipment.result.invalid",
    };
  }
  if (!apply)
    return {
      ok: true,
      message: "Dispatch shipment",
      messageKey: "ui.terminal.shipment.result.dispatch",
    };

  for (const [materialId, quantity] of Object.entries(s.shipmentManifest).sort(
    ([a], [b]) => a.localeCompare(b),
  )) {
    takeTerminalCargo(c, s, materialId, quantity);
    applyExportCompensation(c, s, materialId, quantity);
    recordOrderExport(c, s, materialId, quantity);
    s.exported += quantity;
    change(s.flows.exported, materialId, quantity);
  }
  s.shipmentManifest = {};
  refreshMilestones(c, s);
  return {
    ok: true,
    message: "Shipment dispatched",
    messageKey: "ui.terminal.shipment.result.dispatched",
  };
}

export function settleTerminalExports(c: Content, s: Save): void {
  const reserved = { ...s.shipmentManifest };
  const unreserved = (id: string, units: number) => {
    const held = Math.min(units, amount(reserved, id));
    if (held) change(reserved, id, -held);
    return units - held;
  };
  const ship = (
    id: string,
    units: number,
    take: (shipped: number) => void,
  ) => {
    if (
      units <= 0 ||
      s.policies[id] !== "export" ||
      !companyKnowsMaterial(c, s, id) ||
      !exchangeDefinition(c, id) ||
      !terminalCanExport(c, s, id)
    )
      return;
    applyExportCompensation(c, s, id, units);
    recordOrderExport(c, s, id, units);
    s.exported += units;
    change(s.flows.exported, id, units);
    take(units);
  };
  for (const material of c.materials) {
    const available = amount(s.staging, material.id),
      units = unreserved(material.id, available);
    ship(material.id, units, (shipped) =>
      change(s.staging, material.id, -shipped),
    );
  }
  for (const d of c.site.terminalModules) {
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
    const materialId = t.materialId,
      units = unreserved(materialId, t.quantity);
    ship(materialId, units, (shipped) => {
      t.quantity -= shipped;
      if (t.quantity === 0) t.materialId = null;
    });
  }
}
