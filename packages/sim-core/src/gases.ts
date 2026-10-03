import type { TransportMoveEvent } from "./production";
import type { Content } from "@site/content";
import { key, next, socket, contains, footprint } from "./geometry";
import {
  amount,
  change,
  total,
  type Save,
  type Compressor,
  type Point,
  type GasContents,
} from "./types";

export const gasMaterial = (c: Content, id: string) =>
  c.materials.find((m) => m.id === id)?.handlingState === "gas";
type Source = {
  id: string;
  material: string;
  units: number;
  take: (n: number) => void;
};
type Target = {
  id: string;
  material: string | null;
  quantity: number;
  capacity: number;
  put: (material: string, n: number) => void;
};
function contentsTarget(
  id: string,
  item: GasContents,
  capacity: number,
): Target {
  return {
    id,
    material: item.materialId,
    quantity: item.quantity,
    capacity,
    put: (material, n) => {
      item.materialId = material;
      item.quantity += n;
    },
  };
}
function takeContents(item: GasContents, n: number) {
  item.quantity -= n;
  if (!item.quantity) item.materialId = null;
}

function compressorSource(c: Content, s: Save, p: Compressor): Source | null {
  for (const tank of Object.values(s.pressureVessels).sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (
      tank.direction !== p.direction ||
      key(socket(tank, c.gasLogistics!.vessel, true)) !== key(p) ||
      !tank.materialId ||
      !tank.quantity
    )
      continue;
    return {
      id: "tank:" + tank.id,
      material: tank.materialId,
      units: tank.quantity,
      take: (n) => takeContents(tank, n),
    };
  }
  for (const m of Object.values(s.machines).sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const d = c.machines.find((d) => d.id === m.definitionId)!;
    if (m.direction !== p.direction || key(socket(m, d, true)) !== key(p))
      continue;
    const material = Object.keys(m.output)
      .sort()
      .find(
        (id) =>
          amount(m.output, id) > 0 &&
          gasMaterial(c, id) &&
          d.outputStates.includes("gas"),
      );
    if (material)
      return {
        id: "machine:" + m.id + ":" + material,
        material,
        units: amount(m.output, material),
        take: (n) => change(m.output, material, -n),
      };
  }
  return null;
}
function targetAt(
  c: Content,
  s: Save,
  point: Point,
  direction: number,
  pipeOnly = false,
): Target | null {
  const pipe = s.pressureLines[key(point)];
  if (pipe)
    return pipe.inlet === (direction + 2) % 4
      ? contentsTarget("pipe:" + pipe.id, pipe, c.gasLogistics!.line.capacity)
      : null;
  if (pipeOnly) return null;
  for (const tank of Object.values(s.pressureVessels).sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (
      tank.direction === direction &&
      contains(footprint(tank, c.gasLogistics!.vessel), point) &&
      key(socket(tank, c.gasLogistics!.vessel, false)) ===
        key(next(point, (direction + 2) % 4))
    )
      return contentsTarget(
        "tank:" + tank.id,
        tank,
        c.gasLogistics!.vessel.capacity,
      );
  }
  for (const m of Object.values(s.machines).sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const d = c.machines.find((d) => d.id === m.definitionId)!;
    if (
      d.role === "processor" &&
      d.inputStates.includes("gas") &&
      m.direction === direction &&
      contains(footprint(m, d), point) &&
      key(socket(m, d, false)) === key(next(point, (direction + 2) % 4))
    ) {
      const ids = Object.keys(m.input).filter((id) => m.input[id] > 0);
      // One material identity in this gas interface; incompatible contents retain backpressure.
      return {
        id: "machine:" + m.id,
        material:
          ids.length === 1 ? ids[0] : ids.length ? "incompatible" : null,
        quantity: total(m.input),
        capacity: d.capacity,
        put: (material, n) => change(m.input, material, n),
      };
    }
  }
  // #111 owns compatible gas terminal staging; dry terminal never admits it here.
  return null;
}
export type GasCompressorStatus =
  | "disabled"
  | "needs-fuel"
  | "needs-input"
  | "incompatible"
  | "output-full"
  | "ready";
export function gasCompressorStatus(
  c: Content,
  s: Save,
  p: Compressor,
): GasCompressorStatus {
  if (!p.enabled) return "disabled";
  if (!c.gasLogistics || s.fuel < c.gasLogistics.compressor.fuel)
    return "needs-fuel";
  const source = compressorSource(c, s, p);
  if (!source) {
    const liquidSource =
      c.liquidLogistics &&
      Object.values(s.tanks).some(
        (tank) =>
          tank.direction === p.direction &&
          key(socket(tank, c.liquidLogistics!.tank, true)) === key(p),
      );
    const incompatibleMachine = Object.values(s.machines).some((machine) => {
      const definition = c.machines.find((d) => d.id === machine.definitionId)!;
      return (
        machine.direction === p.direction &&
        key(socket(machine, definition, true)) === key(p) &&
        !definition.outputStates.includes("gas")
      );
    });
    return liquidSource || incompatibleMachine ? "incompatible" : "needs-input";
  }
  const outlet = next(p, p.direction);
  const target = targetAt(c, s, outlet, p.direction, true);
  if (!target)
    return s.pipes[key(outlet)] || s.belts[key(outlet)]
      ? "incompatible"
      : "output-full";
  if (target.material !== null && target.material !== source.material)
    return "incompatible";
  return target.quantity >= target.capacity ? "output-full" : "ready";
}
export function transportGases(
  c: Content,
  s: Save,
  onMove?: (event: TransportMoveEvent) => void,
): void {
  const cfg = c.gasLogistics;
  if (!cfg) return;
  const plans: (() => void)[] = [],
    sources = new Map<string, number>(),
    targets = new Map<string, { quantity: number; material: string | null }>();
  let fuel = s.fuel;
  const admit = (
    source: Source,
    target: Target | null,
    limit: number,
    cost = 0,
    from?: Point,
    direction?: number,
  ) => {
    if (!target || !gasMaterial(c, source.material) || fuel < cost) return;
    const reserved = targets.get(target.id) ?? {
      quantity: target.quantity,
      material: target.material,
    };
    if (reserved.material !== null && reserved.material !== source.material)
      return;
    const n = Math.min(
      limit,
      source.units - (sources.get(source.id) ?? 0),
      target.capacity - reserved.quantity,
    );
    if (n <= 0) return;
    reserved.material = source.material;
    reserved.quantity += n;
    targets.set(target.id, reserved);
    sources.set(source.id, (sources.get(source.id) ?? 0) + n);
    fuel -= cost;
    plans.push(() => {
      source.take(n);
      target.put(source.material, n);
      s.fuel -= cost;
      if (from && direction !== undefined)
        onMove?.({ from, direction, material: source.material, units: n });
    });
  };
  for (const p of Object.values(s.pressureLines).sort(
    (a, b) => a.y - b.y || a.x - b.x,
  )) {
    if (!p.materialId || !p.quantity) continue;
    admit(
      {
        id: "pipe:" + p.id,
        material: p.materialId,
        units: p.quantity,
        take: (n) => takeContents(p, n),
      },
      targetAt(c, s, next(p, p.outlet), p.outlet),
      cfg.line.transfer,
      0,
      p,
      p.outlet,
    );
  }
  for (const pump of Object.values(s.compressors).sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (!pump.enabled) continue;
    const source = compressorSource(c, s, pump);
    if (source)
      admit(
        source,
        targetAt(c, s, next(pump, pump.direction), pump.direction, true),
        cfg.compressor.transfer,
        cfg.compressor.fuel,
        pump,
        pump.direction,
      );
  }
  for (const commit of plans) commit();
}
