import type { Content } from "@site/content";
import {
  amount,
  change,
  experimentEvidenceKey,
  total,
  type MachineStatus,
  type Save,
  type Machine,
  type Point,
} from "./types";
import { key, next, socket, contains, footprint } from "./geometry";
import {
  applyExportCompensation,
  ensureMarket,
  exchangeDefinition,
} from "./market";
import {
  recordDirectiveExperiment,
  recordOrderExport,
} from "./opportunities";
export function recipe(c: Content, m: Machine) {
  const definition = c.machines.find((d) => d.id === m.definitionId);
  return c.reactions.find(
    (r) =>
      r.operation === m.operation &&
      r.processConditionId === definition?.processConditionId &&
      amount(m.input, r.input) >= r.inputAmount,
  );
}
export function status(c: Content, s: Save, m: Machine): MachineStatus {
  if (m.job) return "processing";
  if (m.incident) return "incident";
  if (!m.enabled) return "disabled";
  const d = c.machines.find((d) => d.id === m.definitionId)!;
  const r = recipe(c, m);
  if (d.role === "extractor" && (!m.depositId || s.deposits[m.depositId] === 0))
    return "deposit-exhausted";
  if (d.role === "processor" && !r)
    return total(m.input) ? "needs-compatible-input" : "needs-input";
  if (total(m.output) + (r?.outputAmount ?? 1) > d.capacity)
    return "output-full";
  if (s.fuel < d.fuel) return "needs-fuel";
  return "ready";
}
export function completeAndStart(
  c: Content,
  s: Save,
  complete: boolean,
  onDiscovery?: (reactionId: string, machine: Machine) => void,
) {
  for (const m of Object.values(s.machines)) {
    const d = c.machines.find((d) => d.id === m.definitionId)!;
    if (complete) {
      if (m.job && --m.job.remaining === 0) {
        const r = c.reactions.find((r) => r.id === m.job!.reaction);
        const material =
          r?.output ??
          c.site.deposits.find((a) => a.id === m.depositId)!.material;
        if (r) {
          // A defined transformation: record the consumed inputs and the
          // created outputs so the ledger can reconcile the identity change.
          change(s.flows.consumed, r.input, r.inputAmount);
          change(s.flows.produced, material, r.outputAmount);
          const id = experimentEvidenceKey(
            r.operation,
            r.input,
            r.processConditionId ?? null,
          );
          s.evidence[id] = {
            operationId: r.operation,
            inputId: r.input,
            processConditionId: r.processConditionId ?? null,
            state: "confirmed",
          };
          recordDirectiveExperiment(
            c,
            s,
            r.operation,
            r.input,
            r.processConditionId ?? null,
          );
        }
        change(m.output, material, r?.outputAmount ?? 1);
        if (r && !s.knowledge.includes(r.id)) {
          s.knowledge.push(r.id);
          onDiscovery?.(r.id, m);
          s.policies[material] = exchangeDefinition(c, material)
            ? "export"
            : "keep";
          ensureMarket(c, s, material);
        }
        if (r?.hazard) {
          m.incident = r.hazard.id;
          m.enabled = false;
        }
        m.job = null;
      }
    } else if (status(c, s, m) === "ready") {
      const r = recipe(c, m);
      s.fuel -= d.fuel;
      if (r) {
        change(m.input, r.input, -r.inputAmount);
        const id = experimentEvidenceKey(
          r.operation,
          r.input,
          r.processConditionId ?? null,
        );
        s.evidence[id] ??= {
          operationId: r.operation,
          inputId: r.input,
          processConditionId: r.processConditionId ?? null,
          state: "hinted",
        };
      } else s.deposits[m.depositId!]--;
      m.job = { remaining: d.durationTicks, reaction: r?.id ?? null };
    }
  }
}
export type TransportMoveEvent = {
  from: Point;
  direction: number;
  material: string;
};

export function transport(
  c: Content,
  s: Save,
  onMove?: (event: TransportMoveEvent) => void,
) {
  const belts = Object.values(s.belts).sort((a, b) => a.y - b.y || a.x - b.x);
  const occupied = new Set(belts.filter((b) => b.cargo).map(key));
  const reserved = new Set<string>();
  const received = new Map<string, number>();
  const moves: {
    from: string;
    fromPoint: Point;
    direction: number;
    to: string | null;
    machine: string | null;
    storage: string | null;
    staging: boolean;
    material: string;
  }[] = [];
  for (const b of belts) {
    if (!b.cargo) continue;
    // A switched diverter exits through its player-set alternate direction.
    // In-transit cargo is untouched; only the next edge changes.
    const exit = b.alternate !== null && b.switched ? b.alternate : b.direction;
    const target = next(b, exit),
      targetKey = key(target);
    if (contains(c.site.terminal, target)) {
      if (b.cargo === c.site.buildMaterial) {
        moves.push({
          from: key(b),
          fromPoint: { x: b.x, y: b.y },
          direction: exit,
          to: null,
          machine: null,
          storage: null,
          staging: false,
          material: b.cargo,
        });
        continue;
      }
      // Terminal staging is a bounded physical location: when it is full the
      // arrival waits on its belt and blocks upstream flow deterministically.
      const staged = received.get("staging") ?? 0;
      if (total(s.staging) + staged < c.site.stagingCapacity) {
        received.set("staging", staged + 1);
        moves.push({
          from: key(b),
          fromPoint: { x: b.x, y: b.y },
          direction: exit,
          to: null,
          machine: null,
          storage: null,
          staging: true,
          material: b.cargo,
        });
      }
      continue;
    }
    const targetBelt = s.belts[targetKey];
    if (targetBelt && !occupied.has(targetKey) && !reserved.has(targetKey)) {
      reserved.add(targetKey);
      moves.push({
        from: key(b),
        fromPoint: { x: b.x, y: b.y },
        direction: exit,
        to: targetKey,
        machine: null,
        storage: null,
        staging: false,
        material: b.cargo,
      });
      continue;
    }
    const m = Object.values(s.machines).find((m) => {
      const d = c.machines.find((d) => d.id === m.definitionId)!;
      return (
        d.role === "processor" &&
        contains(footprint(m, d), target) &&
        key(socket(m, d, false)) === key(b)
      );
    });
    if (m) {
      const d = c.machines.find((d) => d.id === m.definitionId)!;
      const n = received.get(m.id) ?? 0;
      if (total(m.input) + n < d.capacity) {
        received.set(m.id, n + 1);
        moves.push({
          from: key(b),
          fromPoint: { x: b.x, y: b.y },
          direction: exit,
          to: null,
          machine: m.id,
          storage: null,
          staging: false,
          material: b.cargo,
        });
      }
      continue;
    }
    const depot = Object.values(s.storages).find((t) => {
      const d = c.storages.find((d) => d.id === t.definitionId)!;
      return (
        contains(footprint(t, d), target) &&
        key(socket(t, d, false)) === key(b)
      );
    });
    if (depot) {
      const d = c.storages.find((d) => d.id === depot.definitionId)!;
      const n = received.get(depot.id) ?? 0;
      if (total(depot.inventory) + n < d.capacity) {
        received.set(depot.id, n + 1);
        moves.push({
          from: key(b),
          fromPoint: { x: b.x, y: b.y },
          direction: exit,
          to: null,
          machine: null,
          storage: depot.id,
          staging: false,
          material: b.cargo,
        });
      }
    }
  }
  // Clear sources before applying arrivals. All eligibility used old occupancy.
  for (const move of moves) s.belts[move.from].cargo = null;
  for (const move of moves) {
    if (move.to) s.belts[move.to].cargo = move.material;
    else if (move.machine)
      change(s.machines[move.machine].input, move.material, 1);
    else if (move.storage)
      change(s.storages[move.storage].inventory, move.material, 1);
    else if (move.staging) change(s.staging, move.material, 1);
    else change(s.stock, move.material, 1);
    onMove?.({
      from: move.fromPoint,
      direction: move.direction,
      material: move.material,
    });
  }
  for (const m of Object.values(s.machines)) {
    const d = c.machines.find((d) => d.id === m.definitionId)!,
      p = key(socket(m, d, true)),
      b = s.belts[p];
    if (!b || b.cargo || occupied.has(p) || reserved.has(p)) continue;
    const material = Object.keys(m.output)
      .sort()
      .find((id) => m.output[id] > 0);
    if (material) {
      b.cargo = material;
      change(m.output, material, -1);
      reserved.add(p);
    }
  }
  for (const t of Object.values(s.storages)) {
    const d = c.storages.find((d) => d.id === t.definitionId)!,
      p = key(socket(t, d, true)),
      b = s.belts[p];
    if (!b || b.cargo || occupied.has(p) || reserved.has(p)) continue;
    const material = Object.keys(t.inventory)
      .sort()
      .find((id) => t.inventory[id] > 0);
    if (material) {
      b.cargo = material;
      change(t.inventory, material, -1);
      reserved.add(p);
    }
  }
  for (const material of c.materials) {
    const n = amount(s.staging, material.id);
    if (
      n > 0 &&
      s.policies[material.id] === "export" &&
      exchangeDefinition(c, material.id)
    ) {
      applyExportCompensation(c, s, material.id, n);
      recordOrderExport(c, s, material.id, n);
      s.exported += n;
      change(s.flows.exported, material.id, n);
      change(s.staging, material.id, -n);
    }
  }
}
