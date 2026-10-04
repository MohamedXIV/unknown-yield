import { checkContainment } from "@site/content";
import { pumpExposureEligible, pumpFailureDefinition } from "./pump-recovery";
import { terminalReceiver, terminalInletDiagnostic } from "./terminal";
import {
  liquidContainment,
  receivingDiagnostic,
  type TransportDiagnostic,
} from "./containment";
import type { TransportMoveEvent } from "./production";
import type { Content } from "@site/content";
import { key, next, socket, contains, footprint } from "./geometry";
import {
  amount,
  change,
  total,
  type Save,
  type Pump,
  type Point,
  type LiquidContents,
} from "./types";

export const liquidMaterial = (c: Content, id: string) =>
  c.materials.find((m) => m.id === id)?.handlingState === "liquid";
type Source = {
  id: string;
  material: string;
  units: number;
  take: (n: number) => void;
};
type Target = {
  capabilities: string[];
  id: string;
  material: string | null;
  quantity: number;
  capacity: number;
  put: (material: string, n: number) => void;
};
function contentsTarget(
  id: string,
  item: LiquidContents,
  capacity: number,
  capabilities: string[],
): Target {
  return {
    capabilities,
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
function takeContents(item: LiquidContents, n: number) {
  item.quantity -= n;
  if (!item.quantity) item.materialId = null;
}

function pumpSource(c: Content, s: Save, p: Pump): Source | null {
  for (const tank of Object.values(s.tanks).sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (
      tank.direction !== p.direction ||
      key(socket(tank, c.liquidLogistics!.tank, true)) !== key(p) ||
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
          liquidMaterial(c, id) &&
          d.outputStates.includes("liquid"),
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
  const pipe = s.pipes[key(point)];
  if (pipe)
    return pipe.inlet === (direction + 2) % 4
      ? contentsTarget(
          "pipe:" + pipe.id,
          pipe,
          c.liquidLogistics!.pipe.capacity,
          liquidContainment(c, "pipe", pipe.containmentProfileId),
        )
      : null;
  if (pipeOnly) return null;
  for (const tank of Object.values(s.tanks).sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (
      tank.direction === direction &&
      contains(footprint(tank, c.liquidLogistics!.tank), point) &&
      key(socket(tank, c.liquidLogistics!.tank, false)) ===
        key(next(point, (direction + 2) % 4))
    )
      return contentsTarget(
        "tank:" + tank.id,
        tank,
        c.liquidLogistics!.tank.capacity,
        liquidContainment(c, "tank", tank.containmentProfileId),
      );
  }
  for (const m of Object.values(s.machines).sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const d = c.machines.find((d) => d.id === m.definitionId)!;
    if (
      d.role === "processor" &&
      d.inputStates.includes("liquid") &&
      m.direction === direction &&
      contains(footprint(m, d), point) &&
      key(socket(m, d, false)) === key(next(point, (direction + 2) % 4))
    ) {
      const ids = Object.keys(m.input).filter((id) => m.input[id] > 0);
      // One material identity in this liquid interface; incompatible contents retain backpressure.
      return {
        capabilities: d.inputContainment,
        id: "machine:" + m.id,
        material:
          ids.length === 1 ? ids[0] : ids.length ? "incompatible" : null,
        quantity: total(m.input),
        capacity: d.capacity,
        put: (material, n) => change(m.input, material, n),
      };
    }
  }
  return terminalReceiver(c, s, point, direction, "liquid");
}
export type LiquidPumpStatus =
  | "incident"
  | "disabled"
  | "needs-fuel"
  | "needs-input"
  | "incompatible"
  | "output-full"
  | "ready";
export function liquidPumpStatus(
  c: Content,
  s: Save,
  p: Pump,
): LiquidPumpStatus {
  if (p.incident) return "incident";
  if (!p.enabled) return "disabled";
  if (!c.liquidLogistics || s.fuel < c.liquidLogistics.pump.fuel)
    return "needs-fuel";
  const source = pumpSource(c, s, p);
  if (!source) return "needs-input";
  const target = targetAt(c, s, next(p, p.direction), p.direction, true);
  if (!target) return "output-full";
  if (
    !checkContainment(
      c,
      source.material,
      ["liquid"],
      liquidContainment(c, "pump", p.containmentProfileId),
    ).ok ||
    !checkContainment(c, source.material, ["liquid"], target.capabilities).ok
  )
    return "incompatible";
  if (target.material !== null && target.material !== source.material)
    return "incompatible";
  return target.quantity >= target.capacity ? "output-full" : "ready";
}
export function pumpRecoveryDiagnostic(
  c: Content,
  s: Save,
  p: Pump,
): TransportDiagnostic | null {
  if (!p.incident) return null;
  if (!p.incident.quantity) return { reason: "needs-input" };
  if (!p.incident.drainEnabled) return { reason: "disabled" };
  const target = targetAt(c, s, next(p, p.direction), p.direction, true);
  return receivingDiagnostic(
    c,
    p.incident.materialId,
    "liquid",
    target?.capabilities ?? [],
    target,
    p.containmentProfileId,
  );
}
export function liquidDiagnostics(
  c: Content,
  s: Save,
): Record<string, TransportDiagnostic> {
  const result: Record<string, TransportDiagnostic> = {};
  if (!c.liquidLogistics) return result;
  for (const p of Object.values(s.pipes)) {
    if (!p.materialId) continue;
    const target = targetAt(c, s, next(p, p.outlet), p.outlet);
    result[p.id] =
      terminalInletDiagnostic(
        c,
        s,
        next(p, p.outlet),
        p.outlet,
        "liquid",
        p.materialId,
      ) ??
      receivingDiagnostic(
        c,
        p.materialId,
        "liquid",
        target?.capabilities ?? [],
        target,
      );
  }
  for (const p of Object.values(s.pumps)) {
    if (p.incident) {
      result[p.id] = {
        reason: "incident",
        containmentProfileId: p.containmentProfileId,
      };
      continue;
    }
    if (!p.enabled) {
      result[p.id] = {
        reason: "disabled",
        containmentProfileId: p.containmentProfileId,
      };
      continue;
    }
    if (s.fuel < c.liquidLogistics.pump.fuel) {
      result[p.id] = {
        reason: "needs-fuel",
        containmentProfileId: p.containmentProfileId,
      };
      continue;
    }
    const source = pumpSource(c, s, p);
    if (!source) {
      result[p.id] = {
        reason: "needs-input",
        containmentProfileId: p.containmentProfileId,
      };
      continue;
    }
    const target = targetAt(c, s, next(p, p.direction), p.direction, true);
    const own = receivingDiagnostic(
      c,
      source.material,
      "liquid",
      liquidContainment(c, "pump", p.containmentProfileId),
      { material: null, quantity: 0, capacity: Infinity },
      p.containmentProfileId,
    );
    result[p.id] =
      own.reason === "missing-containment" || own.reason === "handling-state"
        ? own
        : receivingDiagnostic(
            c,
            source.material,
            "liquid",
            target?.capabilities ?? [],
            target,
            p.containmentProfileId,
          );
  }
  return result;
}
export function transportLiquids(
  c: Content,
  s: Save,
  onMove?: (event: TransportMoveEvent) => void,
): void {
  const cfg = c.liquidLogistics;
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
    if (
      !target ||
      !liquidMaterial(c, source.material) ||
      fuel < cost ||
      !checkContainment(c, source.material, ["liquid"], target.capabilities).ok
    )
      return;
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
  for (const p of Object.values(s.pipes).sort(
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
      cfg.pipe.transfer,
      0,
      p,
      p.outlet,
    );
  }
  for (const pump of Object.values(s.pumps).sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const incident = pump.incident;
    if (incident) {
      if (!pump.enabled && incident.drainEnabled && incident.quantity > 0)
        admit(
          {
            id: "pump-incident:" + pump.id,
            material: incident.materialId,
            units: incident.quantity,
            take: (n) => {
              incident.quantity -= n;
            },
          },
          targetAt(c, s, next(pump, pump.direction), pump.direction, true),
          cfg.pump.transfer,
          0,
          pump,
          pump.direction,
        );
      continue;
    }
    if (!pump.enabled) continue;
    const source = pumpSource(c, s, pump);
    const target = targetAt(
      c,
      s,
      next(pump, pump.direction),
      pump.direction,
      true,
    );
    if (
      source &&
      target &&
      fuel >= cfg.pump.fuel &&
      pumpExposureEligible(c, pump, source.material) &&
      checkContainment(c, source.material, ["liquid"], target.capabilities).ok
    ) {
      const reserved = targets.get(target.id) ?? {
        quantity: target.quantity,
        material: target.material,
      };
      if (reserved.material !== null && reserved.material !== source.material)
        continue;
      const definition = pumpFailureDefinition(c)!;
      const n = Math.min(
        definition.trappedCapacity,
        cfg.pump.transfer,
        source.units - (sources.get(source.id) ?? 0),
        target.capacity - reserved.quantity,
      );
      if (n > 0) {
        sources.set(source.id, (sources.get(source.id) ?? 0) + n);
        plans.push(() => {
          source.take(n);
          pump.incident = {
            definitionId: definition.id,
            materialId: source.material,
            quantity: n,
            startedAt: s.tick,
            drainEnabled: false,
          };
          pump.enabled = false;
        });
      }
      continue;
    }
    if (
      source &&
      checkContainment(
        c,
        source.material,
        ["liquid"],
        liquidContainment(c, "pump", pump.containmentProfileId),
      ).ok
    )
      admit(
        source,
        targetAt(c, s, next(pump, pump.direction), pump.direction, true),
        cfg.pump.transfer,
        cfg.pump.fuel,
        pump,
        pump.direction,
      );
  }
  for (const commit of plans) commit();
}
