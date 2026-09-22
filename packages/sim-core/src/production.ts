import type { Content } from "@site/content";
import { amount, change, total, type Save, type Machine } from "./types";
import { key, next, socket, contains, footprint } from "./geometry";
export function recipe(c: Content, m: Machine) {
  return c.reactions.find(
    (r) =>
      r.operation === m.operation && amount(m.input, r.input) >= r.inputAmount,
  );
}
export function status(c: Content, s: Save, m: Machine): string {
  if (m.job) return "Processing";
  if (!m.enabled) return "Disabled";
  const d = c.machines.find((d) => d.id === m.definitionId)!;
  const r = recipe(c, m);
  if (d.role === "extractor" && (!m.depositId || s.deposits[m.depositId] === 0))
    return "Deposit exhausted";
  if (d.role === "processor" && !r)
    return total(m.input) ? "Needs compatible input" : "Needs input";
  if (total(m.output) + (r?.outputAmount ?? 1) > d.capacity)
    return "Output full";
  if (s.fuel < d.fuel) return "Needs fuel";
  return "Ready";
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
        }
        change(m.output, material, r?.outputAmount ?? 1);
        if (r && !s.knowledge.includes(r.id)) {
          s.knowledge.push(r.id);
          onDiscovery?.(r.id, m);
          const mat = c.materials.find((a) => a.id === material)!;
          s.policies[material] = mat.exportValue > 0 ? "export" : "keep";
        }
        m.job = null;
      }
    } else if (status(c, s, m) === "Ready") {
      const r = recipe(c, m);
      s.fuel -= d.fuel;
      if (r) change(m.input, r.input, -r.inputAmount);
      else s.deposits[m.depositId!]--;
      m.job = { remaining: d.durationTicks, reaction: r?.id ?? null };
    }
  }
}
export function transport(c: Content, s: Save) {
  const belts = Object.values(s.belts).sort((a, b) => a.y - b.y || a.x - b.x);
  const occupied = new Set(belts.filter((b) => b.cargo).map(key));
  const reserved = new Set<string>();
  const received = new Map<string, number>();
  const moves: {
    from: string;
    to: string | null;
    machine: string | null;
    material: string;
  }[] = [];
  for (const b of belts) {
    if (!b.cargo) continue;
    const target = next(b, b.direction),
      targetKey = key(target);
    if (contains(c.site.terminal, target)) {
      moves.push({ from: key(b), to: null, machine: null, material: b.cargo });
      continue;
    }
    const targetBelt = s.belts[targetKey];
    if (targetBelt && !occupied.has(targetKey) && !reserved.has(targetKey)) {
      reserved.add(targetKey);
      moves.push({
        from: key(b),
        to: targetKey,
        machine: null,
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
          to: null,
          machine: m.id,
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
    else change(s.stock, move.material, 1);
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
  for (const material of c.materials) {
    const n = amount(s.stock, material.id);
    if (
      n > 0 &&
      s.policies[material.id] === "export" &&
      material.exportValue > 0
    ) {
      const value = n * material.exportValue,
        repaid = Math.min(value, s.debt);
      s.debt -= repaid;
      s.fuel += value - repaid;
      s.exported += n;
      change(s.flows.exported, material.id, n);
      change(s.stock, material.id, -n);
    }
  }
}
