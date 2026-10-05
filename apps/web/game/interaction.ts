import {
  contains,
  wall,
  type PlayerSnapshot,
  type Point,
  type GameCommand,
} from "@site/sim-core";
export type Tool =
  | "pressure-line"
  | "pressure-vessel"
  | "compressor"
  | "vaporizer"
  | "gas-collector"
  | "pipe"
  | "tank"
  | "pump"
  | "liquefier"
  | "precipitator"
  | "select"
  | "extractor"
  | "deep-extractor"
  | "atmospheric-intake"
  | "sinterer"
  | "factory"
  | "crusher"
  | "furnace"
  | "sealed-furnace"
  | "oversealed-furnace"
  | "relief-furnace"
  | "depot"
  | "belt"
  | "port"
  | "demolish";
export const TOOL_HOTKEYS: Record<Tool, string> = {
  "pressure-line": "G",
  "pressure-vessel": "V",
  compressor: "B",
  vaporizer: "O",
  "gas-collector": "J",
  pipe: "P",
  tank: "T",
  pump: "U",
  liquefier: "L",
  precipitator: "C",
  select: "↖",
  extractor: "1",
  "deep-extractor": "0",
  "atmospheric-intake": "K",
  sinterer: "N",
  factory: "2",
  crusher: "3",
  furnace: "4",
  "sealed-furnace": "8",
  "oversealed-furnace": "9",
  "relief-furnace": "Q",
  belt: "5",
  port: "6",
  depot: "7",
  demolish: "X",
};
/**
 * Stable structural fingerprint for Phaser rebuild invalidation.
 * Every placed-geometry collection the renderer draws must appear here;
 * otherwise topology edits leave stale world visuals until an unrelated
 * change happens to invalidate.
 */
export function structureKey(s: PlayerSnapshot): string {
  const adjacent = new Set(
    s.belts
      .filter((b) => b.junction)
      .flatMap((b) =>
        [
          [b.x + 1, b.y],
          [b.x - 1, b.y],
          [b.x, b.y + 1],
          [b.x, b.y - 1],
        ].map(([x, y]) => x + "," + y),
      ),
  );
  return JSON.stringify([
    s.terminalModules.map((d) => [
      d.id,
      d.installed,
      d.unlocked,
      d.contents.quantity >= d.capacity,
    ]),
    s.machines.map((m) => [m.id, m.x, m.y, m.direction]),
    s.atmosphericSources.map((source) => [
      source.id,
      source.x,
      source.y,
      source.width,
      source.height,
      source.material,
    ]),
    s.factories.map((f) => [
      f.id,
      f.x,
      f.y,
      f.width,
      f.height,
      f.ports.map((p) => [p.id, p.x, p.y, p.direction, p.role]),
    ]),
    s.belts.map((b) => [
      b.id,
      b.x,
      b.y,
      b.direction,
      b.alternate,
      b.switched,
      b.junction ?? null,
    ]),
    s.belts
      .filter((b) => adjacent.has(b.x + "," + b.y))
      .map((b) => [b.id, !!b.cargo]),
    s.pressureLines.map((p) => [p.id, p.x, p.y, p.inlet, p.outlet]),
    s.pressureVessels.map((p) => [p.id, p.x, p.y, p.direction]),
    s.compressors.map((p) => [p.id, p.x, p.y, p.direction]),
    s.pipes.map((p) => [
      p.id,
      p.x,
      p.y,
      p.inlet,
      p.outlet,
      p.containmentProfileId,
    ]),
    s.tanks.map((t) => [t.id, t.x, t.y, t.direction, t.containmentProfileId]),
    s.pumps.map((p) => [
      p.id,
      p.x,
      p.y,
      p.direction,
      p.containmentProfileId,
      !!p.incident,
      p.incident?.drainEnabled,
    ]),
    s.storages.map((t) => [t.id, t.definitionId, t.x, t.y, t.direction]),
  ]);
}
export type WorldMode = {
  containmentProfileId: string;
  tool: Tool;
  direction: number;
  selected: string | null;
  openFactories: string[];
};
export const DEFAULT_MODE: WorldMode = {
  containmentProfileId: "standard",
  tool: "select",
  direction: 0,
  selected: null,
  openFactories: [],
};
export function toggleFactoryOpen(mode: WorldMode, id: string): WorldMode {
  return {
    ...mode,
    openFactories: mode.openFactories.includes(id)
      ? mode.openFactories.filter((factoryId) => factoryId !== id)
      : [...mode.openFactories, id],
  };
}
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
  const t = s.storages.find((t) => contains(t, p));
  if (t) return t.id;
  const vessel = s.pressureVessels.find((t) => contains(t, p));
  if (vessel) return vessel.id;
  const gas = [...s.pressureLines, ...s.compressors].find(
    (t) => t.x === p.x && t.y === p.y,
  );
  if (gas) return gas.id;
  const tank = s.tanks.find((t) => contains(t, p));
  if (tank) return tank.id;
  const liquid = [...s.pipes, ...s.pumps].find(
    (t) => t.x === p.x && t.y === p.y,
  );
  if (liquid) return liquid.id;
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
  if (
    [
      "vaporizer",
      "gas-collector",
      "liquefier",
      "precipitator",
      "extractor",
      "deep-extractor",
      "atmospheric-intake",
      "sinterer",
      "crusher",
      "furnace",
      "sealed-furnace",
      "oversealed-furnace",
      "relief-furnace",
    ].includes(mode.tool)
  )
    return {
      type: "placeMachine",
      definitionId: mode.tool,
      ...p,
      direction: mode.direction,
    };
  if (s.storageDefinitions.some((d) => d.id === mode.tool))
    return {
      type: "placeStorage",
      definitionId: mode.tool,
      ...p,
      direction: mode.direction,
    };
  if (mode.tool === "pressure-vessel" || mode.tool === "compressor")
    return {
      type:
        mode.tool === "pressure-vessel"
          ? "placePressureVessel"
          : "placeCompressor",
      ...p,
      direction: mode.direction,
    };
  if (mode.tool === "tank" || mode.tool === "pump")
    return {
      type: mode.tool === "tank" ? "placeTank" : "placePump",
      containmentProfileId: mode.containmentProfileId,
      ...p,
      direction: mode.direction,
    };
  if (mode.tool === "pipe" || mode.tool === "pressure-line") {
    const path = beltPath(anchor ?? p, p);
    const facing = (a: Point, b: Point) =>
      b.x > a.x ? 0 : b.y > a.y ? 1 : b.x < a.x ? 2 : 3;
    return {
      type: mode.tool === "pipe" ? "placePipes" : "placePressureLines",
      ...(mode.tool === "pipe"
        ? { containmentProfileId: mode.containmentProfileId }
        : {}),
      points: path.map((point, i) => {
        const inlet = i
          ? (facing(path[i - 1], point) + 2) % 4
          : ((path[1] ? facing(point, path[1]) : mode.direction) + 2) % 4;
        const outlet = path[i + 1]
          ? facing(point, path[i + 1])
          : i
            ? facing(path[i - 1], point)
            : mode.direction;
        return { ...point, inlet, outlet };
      }),
    };
  }
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
