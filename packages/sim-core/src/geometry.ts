import type { Content } from "@site/content";
import type { Point, Rect, Save, Factory } from "./types";
export type FootprintDef = { width: number; height: number };
export const key = (p: Point) => p.x + "," + p.y;
export const vectors = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];
export const next = (p: Point, d: number) => ({
  x: p.x + vectors[d].x,
  y: p.y + vectors[d].y,
});
export const contains = (r: Rect, p: Point) =>
  p.x >= r.x && p.y >= r.y && p.x < r.x + r.width && p.y < r.y + r.height;
export const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;
export const footprint = (
  m: Point & { direction: number },
  d: FootprintDef,
): Rect => ({
  ...m,
  width: m.direction % 2 ? d.height : d.width,
  height: m.direction % 2 ? d.width : d.height,
});
export function socket(
  m: Point & { direction: number },
  d: FootprintDef,
  output: boolean,
): Point {
  const r = footprint(m, d),
    direction = (m.direction + (output ? 0 : 2)) % 4;
  if (direction === 0)
    return { x: r.x + r.width, y: r.y + Math.floor(r.height / 2) };
  if (direction === 1)
    return { x: r.x + Math.floor(r.width / 2), y: r.y + r.height };
  if (direction === 2) return { x: r.x - 1, y: r.y + Math.floor(r.height / 2) };
  return { x: r.x + Math.floor(r.width / 2), y: r.y - 1 };
}
export const wall = (f: Factory | Rect, p: Point) =>
  contains(f, p) &&
  (p.x === f.x ||
    p.y === f.y ||
    p.x === f.x + f.width - 1 ||
    p.y === f.y + f.height - 1);
export const inside = (f: Rect, r: Rect) =>
  r.x > f.x &&
  r.y > f.y &&
  r.x + r.width < f.x + f.width &&
  r.y + r.height < f.y + f.height;
export const bounds = (c: Content, r: Rect) =>
  r.x >= 0 &&
  r.y >= 0 &&
  r.x + r.width <= c.site.width &&
  r.y + r.height <= c.site.height;
export function factoryError(c: Content, s: Save, r: Rect): string | null {
  if (!bounds(c, r)) return "Outside the site boundary";
  if (
    r.width < c.site.factoryMin ||
    r.height < c.site.factoryMin ||
    r.width > c.site.factoryMax ||
    r.height > c.site.factoryMax
  )
    return (
      "Factory sides must be " +
      c.site.factoryMin +
      "–" +
      c.site.factoryMax +
      " cells"
    );
  if (
    overlaps(r, c.site.terminal) ||
    c.site.deposits.some((d) => overlaps(r, d))
  )
    return "Keep buildings clear of the terminal and deposits";
  if (
    Object.values(s.factories).some((f) => overlaps(r, f)) ||
    Object.values(s.machines).some((m) =>
      overlaps(
        r,
        footprint(
          m,
          c.machines.find((d) => d.id === m.definitionId)!,
        ),
      ),
    ) ||
    Object.values(s.storages).some((t) =>
      overlaps(
        r,
        footprint(
          t,
          c.storages.find((d) => d.id === t.definitionId)!,
        ),
      ),
    ) ||
    Object.values(s.belts).some((b) => contains(r, b)) ||
    liquidRects(c, s).some((other) => overlaps(r, other))
  )
    return "Space is already occupied";
  return null;
}
export function storageError(
  c: Content,
  s: Save,
  d: FootprintDef,
  p: Point & { direction: number },
): string | null {
  const r = footprint(p, d);
  if (!bounds(c, r)) return "Outside the site boundary";
  if (
    overlaps(r, c.site.terminal) ||
    c.site.deposits.some((a) => overlaps(r, a))
  )
    return "Keep buildings clear of the terminal and deposits";
  if (
    Object.values(s.factories).some((f) => overlaps(r, f)) ||
    Object.values(s.machines).some((m) =>
      overlaps(
        r,
        footprint(
          m,
          c.machines.find((a) => a.id === m.definitionId)!,
        ),
      ),
    ) ||
    Object.values(s.storages).some((t) =>
      overlaps(
        r,
        footprint(
          t,
          c.storages.find((a) => a.id === t.definitionId)!,
        ),
      ),
    ) ||
    Object.values(s.belts).some((b) => contains(r, b)) ||
    liquidRects(c, s).some((other) => overlaps(r, other))
  )
    return "Space is already occupied";
  return null;
}
export function machinePlacement(
  c: Content,
  s: Save,
  p: Point & { direction: number; definitionId: string },
): { error?: string; factoryId: string | null; depositId: string | null } {
  const fail = (error: string) => ({ error, factoryId: null, depositId: null });
  const d = c.machines.find((d) => d.id === p.definitionId);
  if (!d) return fail("Unknown machine type");
  const r = footprint(p, d);
  if (!bounds(c, r)) return fail("Outside the site boundary");
  if (
    overlaps(r, c.site.terminal) ||
    Object.values(s.machines).some((m) =>
      overlaps(
        r,
        footprint(
          m,
          c.machines.find((d) => d.id === m.definitionId)!,
        ),
      ),
    ) ||
    Object.values(s.storages).some((t) =>
      overlaps(
        r,
        footprint(
          t,
          c.storages.find((d) => d.id === t.definitionId)!,
        ),
      ),
    ) ||
    Object.values(s.belts).some((b) => contains(r, b)) ||
    liquidRects(c, s).some((other) => overlaps(r, other))
  )
    return fail("Space is already occupied");
  if (d.role === "extractor") {
    if (Object.values(s.factories).some((f) => overlaps(f, r)))
      return fail("Extractors belong outside factories");
    const deposit = c.site.deposits.find(
      (a) =>
        r.x >= a.x &&
        r.y >= a.y &&
        r.x + r.width <= a.x + a.width &&
        r.y + r.height <= a.y + a.height,
    );
    if (!deposit) return fail("Place the extractor entirely over a deposit");
    return { factoryId: null, depositId: deposit.id };
  }
  const f = Object.values(s.factories).find((f) => inside(f, r));
  if (!f) return fail("Place processing machines inside a factory");
  return { factoryId: f.id, depositId: null };
}
export function portError(
  f: Factory,
  p: Point,
  direction: number,
): string | null {
  if (!wall(f, p)) return "Place a port on a factory wall";
  const vertical = p.x === f.x || p.x === f.x + f.width - 1,
    horizontal = p.y === f.y || p.y === f.y + f.height - 1;
  if (vertical && horizontal) return "Ports cannot occupy corners";
  if ((vertical && direction % 2 !== 0) || (horizontal && direction % 2 !== 1))
    return "Rotate the port to cross the wall";
  if (f.ports.some((a) => key(a) === key(p)))
    return "A port already occupies this cell";
  return null;
}
export function beltError(
  c: Content,
  s: Save,
  p: Point,
  direction: number,
): string | null {
  if (!bounds(c, { ...p, width: 1, height: 1 }))
    return "Outside the site boundary";
  if (
    contains(c.site.terminal, p) ||
    Object.values(s.machines).some((m) =>
      contains(
        footprint(
          m,
          c.machines.find((d) => d.id === m.definitionId)!,
        ),
        p,
      ),
    )
  )
    return "A machine occupies this cell";
  if (
    Object.values(s.storages).some((t) =>
      contains(
        footprint(
          t,
          c.storages.find((d) => d.id === t.definitionId)!,
        ),
        p,
      ),
    )
  )
    return "A structure occupies this cell";
  if (liquidRects(c, s).some((r) => contains(r, p)))
    return "Liquid infrastructure occupies this cell";
  if (Object.hasOwn(s.belts, key(p)))
    return "A belt already occupies this cell";
  const f = Object.values(s.factories).find((f) => wall(f, p));
  if (f && !f.ports.some((a) => key(a) === key(p) && a.direction === direction))
    return "Cross factory walls through a matching directional port";
  return null;
}

export function liquidRects(c: Content, s: Save): Rect[] {
  return [
    ...Object.values(s.pipes).map((p) => ({ ...p, width: 1, height: 1 })),
    ...Object.values(s.pumps).map((p) => ({ ...p, width: 1, height: 1 })),
    ...Object.values(s.tanks).map((t) => footprint(t, c.liquidLogistics!.tank)),
  ];
}
export function liquidPlacementError(
  c: Content,
  s: Save,
  p: Point & { direction?: number; outlet?: number; inlet?: number },
  kind: "pipe" | "tank" | "pump",
): string | null {
  if (!c.liquidLogistics) return "Liquid infrastructure is not authored";
  const r =
    kind === "tank"
      ? footprint({ ...p, direction: p.direction! }, c.liquidLogistics.tank)
      : { ...p, width: 1, height: 1 };
  if (!bounds(c, r)) return "Outside the site boundary";
  if (
    overlaps(r, c.site.terminal) ||
    c.site.deposits.some((d) => overlaps(r, d)) ||
    Object.values(s.machines).some((m) =>
      overlaps(
        r,
        footprint(
          m,
          c.machines.find((d) => d.id === m.definitionId)!,
        ),
      ),
    ) ||
    Object.values(s.storages).some((t) =>
      overlaps(
        r,
        footprint(
          t,
          c.storages.find((d) => d.id === t.definitionId)!,
        ),
      ),
    ) ||
    Object.values(s.belts).some((b) => contains(r, b)) ||
    liquidRects(c, s).some((other) => overlaps(r, other))
  )
    return "Space is already occupied";
  for (const f of Object.values(s.factories)) {
    if (!overlaps(r, f)) continue;
    if (kind === "tank") {
      if (!inside(f, r)) return "Keep tanks inside or outside factory walls";
    } else if (wall(f, p)) {
      const d = p.outlet ?? p.direction!;
      if (
        (kind === "pipe" && p.inlet !== (d + 2) % 4) ||
        !f.ports.some((port) => key(port) === key(p) && port.direction === d)
      )
        return "Cross factory walls through a matching directional port";
    }
  }
  return null;
}
