import type {
  CommandResult,
  GameCommand,
  PlayerSnapshot,
  Point,
  Rect,
} from "@site/sim-core";
import type { FeedbackEvent } from "./feedback";

/**
 * Command-confirmed, presentation-only cues. This is deliberately NOT a
 * snapshot-diff feedback kind: restores, loads and ordinary ticks must never
 * sound like a player placed equipment.
 */
export type PlacementFeedbackEvent = FeedbackEvent & {
  kind: "placement-light" | "placement-heavy";
  footprint: Rect;
  placedCount: number;
};

type Placed = { id: string; x: number; y: number; width?: number; height?: number };
type Route = { id: string; entry: Point; exit: Point };

function newlyAdded<T extends { id: string }>(before: readonly T[], after: readonly T[]): T[] {
  const ids = new Set(before.map((item) => item.id));
  return after.filter((item) => !ids.has(item.id));
}

function bounds(items: readonly { x: number; y: number; width?: number; height?: number }[]): Rect {
  const x = Math.min(...items.map((item) => item.x));
  const y = Math.min(...items.map((item) => item.y));
  const right = Math.max(...items.map((item) => item.x + (item.width ?? 1)));
  const bottom = Math.max(...items.map((item) => item.y + (item.height ?? 1)));
  return { x, y, width: right - x, height: bottom - y };
}

function cue(items: readonly Placed[], heavy: boolean): PlacementFeedbackEvent[] {
  if (!items.length) return [];
  const footprint = bounds(items);
  return [{
    kind: heavy ? "placement-heavy" : "placement-light",
    id: items[0].id,
    at: { x: footprint.x + footprint.width / 2, y: footprint.y + footprint.height / 2 },
    footprint,
    // One event for the ENTIRE confirmed path; never a sound or object per tile.
    placedCount: items.length,
  }];
}

function routeCue(before: readonly Route[], after: readonly Route[]): PlacementFeedbackEvent[] {
  const routes = newlyAdded(before, after);
  if (!routes.length) return [];
  const route = routes[0];
  const footprint = bounds([route.entry, route.exit]);
  return [{
    kind: "placement-light",
    id: route.id,
    at: { x: footprint.x + footprint.width / 2, y: footprint.y + footprint.height / 2 },
    footprint,
    placedCount: routes.length,
  }];
}

/** Call once, immediately after an authoritative player command returns. */
export function derivePlacementFeedback(
  command: GameCommand,
  result: CommandResult,
  before: PlayerSnapshot,
  after: PlayerSnapshot,
): PlacementFeedbackEvent[] {
  if (!result.ok) return [];
  switch (command.type) {
    case "placeFactory":
      return cue(newlyAdded(before.factories, after.factories), true);
    case "placeMachine":
      return cue(newlyAdded(before.machines, after.machines), true);
    case "placeStorage":
      return cue(newlyAdded(before.storages, after.storages), true);
    case "placePressureVessel":
      return cue(newlyAdded(before.pressureVessels, after.pressureVessels), true);
    case "placeCompressor":
      return cue(newlyAdded(before.compressors, after.compressors), true);
    case "placeTank":
      return cue(newlyAdded(before.tanks, after.tanks), true);
    case "placePump":
      return cue(newlyAdded(before.pumps, after.pumps), true);
    case "placePort": {
      const oldPorts = before.factories.find((factory) => factory.id === command.factoryId)?.ports ?? [];
      const newPorts = after.factories.find((factory) => factory.id === command.factoryId)?.ports ?? [];
      return cue(newlyAdded(oldPorts, newPorts), false);
    }
    case "placeBelts":
      return cue(newlyAdded(before.belts, after.belts), false);
    case "placePipes":
      return cue(newlyAdded(before.pipes, after.pipes), false);
    case "placePressureLines":
      return cue(newlyAdded(before.pressureLines, after.pressureLines), false);
    case "placeUndergroundSolid":
      return routeCue(before.undergroundSolids, after.undergroundSolids);
    case "placeUndergroundLiquid":
      return routeCue(before.undergroundLiquids, after.undergroundLiquids);
    case "placeElevatedSolid":
      return routeCue(before.elevatedSolids, after.elevatedSolids);
    default:
      return [];
  }
}
