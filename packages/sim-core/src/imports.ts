import type { Content } from "@site/content";
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

export function importSupplyViews(c: Content, s: Save): ImportSupplyView[] {
  const used = total(s.terminalImports.staging);
  return c.economy.imports.map((definition) => {
    const reason =
      s.fuel < definition.fuelCost
        ? "fuel"
        : used + definition.quantity > c.site.terminalShipmentCapacity
          ? "capacity"
          : null;
    return { ...definition, eligible: reason === null, reason };
  });
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
  if (
    total(s.terminalImports.staging) + definition.quantity >
    c.site.terminalShipmentCapacity
  )
    return {
      ok: false,
      message: "Terminal import holding is full",
      messageKey: "ui.terminal.import.result.capacity",
    };
  if (apply) {
    s.fuel -= definition.fuelCost;
    change(
      s.terminalImports.staging,
      definition.materialId,
      definition.quantity,
    );
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
