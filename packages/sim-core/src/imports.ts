import type { Content } from "@site/content";
import {
  terminalModuleDefinition,
  terminalModuleUnlocked,
} from "./terminal";
import {
  change,
  total,
  type CommandResult,
  type ImportSupplyView,
  type Point,
  type Save,
} from "./types";

export function importSupplyDefinition(c: Content, id: string) {
  return c.economy.imports.find((entry) => entry.id === id);
}

export function terminalImportOutlet(c: Content): Point & { direction: number } {
  const terminal = c.site.terminal;
  if (terminal.x + terminal.width < c.site.width)
    return {
      x: terminal.x + terminal.width - 1,
      y: terminal.y + Math.floor(terminal.height / 2),
      direction: 0,
    };
  if (terminal.x > 0)
    return {
      x: terminal.x,
      y: terminal.y + Math.floor(terminal.height / 2),
      direction: 2,
    };
  if (terminal.y + terminal.height < c.site.height)
    return {
      x: terminal.x + Math.floor(terminal.width / 2),
      y: terminal.y + terminal.height - 1,
      direction: 1,
    };
  return {
    x: terminal.x + Math.floor(terminal.width / 2),
    y: terminal.y,
    direction: 3,
  };
}

function importDestination(
  c: Content,
  s: Save,
  definition: Content["economy"]["imports"][number],
) {
  if (!definition.terminalModuleId) {
    const held = s.terminalImports.staging[definition.materialId] ?? 0;
    const used = total(s.terminalImports.staging);
    return {
      held,
      reason:
        used + definition.quantity > c.site.terminalShipmentCapacity
          ? ("capacity" as const)
          : null,
      apply(units: number) {
        change(s.terminalImports.staging, definition.materialId, units);
      },
    };
  }
  const module = terminalModuleDefinition(c, definition.terminalModuleId)!;
  if (!terminalModuleUnlocked(c, s, module.id))
    return { held: 0, reason: "locked" as const, apply() {} };
  const contents = s.terminalModules[module.id];
  if (!contents)
    return { held: 0, reason: "module-missing" as const, apply() {} };
  if (contents.materialId && contents.materialId !== definition.materialId)
    return { held: 0, reason: "incompatible" as const, apply() {} };
  return {
    held:
      contents.materialId === definition.materialId ? contents.quantity : 0,
    reason:
      contents.quantity + definition.quantity > module.capacity
        ? ("capacity" as const)
        : null,
    apply(units: number) {
      contents.materialId = definition.materialId;
      contents.quantity += units;
    },
  };
}

export function importSupplyViews(c: Content, s: Save): ImportSupplyView[] {
  return c.economy.imports.map((definition) => {
    const destination = importDestination(c, s, definition);
    const reason =
      s.fuel < definition.fuelCost ? "fuel" : destination.reason;
    return {
      ...definition,
      held: destination.held,
      eligible: reason === null,
      reason,
    };
  });
}

export function terminalModuleCarriesImport(
  c: Content,
  moduleId: string,
  materialId: string,
): boolean {
  return c.economy.imports.some(
    (definition) =>
      definition.terminalModuleId === moduleId &&
      definition.materialId === materialId,
  );
}

export function requestImportCommand(
  c: Content,
  s: Save,
  id: string,
  apply: boolean,
): CommandResult {
  const definition = importSupplyDefinition(c, id);
  if (!definition)
    return {
      ok: false,
      message: "Unknown import supply",
      messageKey: "ui.terminal.import.result.unknown",
    };
  if (s.fuel < definition.fuelCost)
    return {
      ok: false,
      message: "Not enough company fuel for import",
      messageKey: "ui.terminal.import.result.fuel",
    };
  const destination = importDestination(c, s, definition);
  if (destination.reason)
    return {
      ok: false,
      message: destination.reason,
      messageKey: "ui.terminal.import.result." + destination.reason,
    };
  if (apply) {
    s.fuel -= definition.fuelCost;
    destination.apply(definition.quantity);
    change(
      s.terminalImports.received,
      definition.materialId,
      definition.quantity,
    );
  }
  return {
    ok: true,
    message: "Off-world cargo received",
    messageKey: "ui.terminal.import.result.received",
    cost: definition.fuelCost,
  };
}
