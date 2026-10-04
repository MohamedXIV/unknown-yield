import { checkContainment, type Content } from "@site/content";
import { terminalCapabilityUnlocked, terminalCanExport } from "./milestones";
import {
  amount,
  change,
  type Save,
  type Point,
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
export function settleTerminalExports(c: Content, s: Save): void {
  const ship = (id: string, units: number, take: () => void) => {
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
    take();
  };
  for (const material of c.materials)
    ship(material.id, amount(s.staging, material.id), () =>
      change(s.staging, material.id, -amount(s.staging, material.id)),
    );
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
    ship(t.materialId, t.quantity, () => {
      t.materialId = null;
      t.quantity = 0;
    });
  }
}
