import {
  contains,
  wall,
  type PlayerSnapshot,
  type Point,
  type GameCommand,
} from "@site/sim-core";
export type Tool =
  | "select"
  | "extractor"
  | "factory"
  | "crusher"
  | "furnace"
  | "belt"
  | "port"
  | "demolish";
export type WorldMode = {
  tool: Tool;
  direction: number;
  selected: string | null;
  openFactories: string[];
};
export const DEFAULT_MODE: WorldMode = {
  tool: "select",
  direction: 0,
  selected: null,
  openFactories: [],
};
export function beltPath(a: Point, b: Point): Point[] {
  let { x, y } = a;
  const path = [{ x, y }];
  while (x !== b.x) {
    x += Math.sign(b.x - x);
    path.push({ x, y });
  }
  while (y !== b.y) {
    y += Math.sign(b.y - y);
    path.push({ x, y });
  }
  return path;
}
export function hitTest(
  s: PlayerSnapshot,
  p: Point,
  open: string[],
): string | null {
  if (contains(s.map.terminal, p)) return "terminal";
  const factory = s.factories.find((f) => contains(f, p));
  if (factory && !open.includes(factory.id)) return factory.id;
  const m = s.machines.find((m) => contains(m, p));
  if (m) return m.id;
  const b = s.belts.find((b) => b.x === p.x && b.y === p.y);
  if (b) return b.id;
  const port = factory?.ports.find((a) => a.x === p.x && a.y === p.y);
  if (port) return port.id;
  return factory?.id ?? s.deposits.find((d) => contains(d, p))?.id ?? null;
}
export function buildCommand(
  mode: WorldMode,
  s: PlayerSnapshot,
  p: Point,
  anchor: Point | null,
): GameCommand | null {
  if (mode.tool === "factory") {
    const a = anchor ?? p;
    const click = a.x === p.x && a.y === p.y;
    return {
      type: "placeFactory",
      x: Math.min(a.x, p.x),
      y: Math.min(a.y, p.y),
      width: click ? s.map.factoryMin : Math.abs(a.x - p.x) + 1,
      height: click ? s.map.factoryMin : Math.abs(a.y - p.y) + 1,
    };
  }
  if (["extractor", "crusher", "furnace"].includes(mode.tool))
    return {
      type: "placeMachine",
      definitionId: mode.tool,
      ...p,
      direction: mode.direction,
    };
  if (mode.tool === "belt") {
    const points = beltPath(anchor ?? p, p),
      previous = points.at(-2);
    const direction = previous
      ? p.x > previous.x
        ? 0
        : p.y > previous.y
          ? 1
          : p.x < previous.x
            ? 2
            : 3
      : mode.direction;
    return { type: "placeBelts", points, direction };
  }
  if (mode.tool === "port") {
    const f = s.factories.find((f) => wall(f, p));
    return {
      type: "placePort",
      factoryId: f?.id ?? "",
      ...p,
      direction: mode.direction,
    };
  }
  if (mode.tool === "demolish")
    return { type: "dismantle", id: hitTest(s, p, mode.openFactories) ?? "" };
  return null;
}
