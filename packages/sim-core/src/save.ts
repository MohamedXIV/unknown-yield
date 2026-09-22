import { z } from "zod";
import type { Content } from "@site/content";
import { emptyFlows, total, type Save } from "./types";
import {
  factoryError,
  machinePlacement,
  portError,
  beltError,
  key,
} from "./geometry";
const count = z.number().int().nonnegative().max(1000000000),
  positive = count.positive();
const safeId = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/)
  .refine((s) => !["constructor", "prototype", "tostring"].includes(s));
const point = { x: count, y: count },
  direction = z.number().int().min(0).max(3);
const inventory = z.record(safeId, count);
const flows = z.object({
  consumed: inventory,
  produced: inventory,
  exported: inventory,
  discarded: inventory,
});
const port = z.object({ ...point, id: safeId, direction });
const factory = z.object({
  ...point,
  id: safeId,
  width: positive,
  height: positive,
  ports: z.array(port),
});
const machine = z.object({
  ...point,
  id: safeId,
  definitionId: safeId,
  direction,
  factoryId: safeId.nullable(),
  depositId: safeId.nullable(),
  operation: safeId.nullable(),
  enabled: z.boolean(),
  input: inventory,
  output: inventory,
  job: z
    .object({ remaining: positive, reaction: safeId.nullable() })
    .nullable(),
});
const belt = z.object({
  ...point,
  id: safeId,
  direction,
  cargo: safeId.nullable(),
});
const schema = z.object({
  schemaVersion: z.literal(3),
  contentVersion: z.string(),
  tick: count,
  remainder: z.number().finite().nonnegative(),
  nextId: positive,
  fuel: count,
  debt: count,
  exported: count,
  flows,
  stock: inventory,
  knowledge: z.array(safeId),
  deposits: inventory,
  machines: z.record(safeId, machine),
  factories: z.record(safeId, factory),
  belts: z.record(z.string().regex(/^\d+,\d+$/), belt),
  policies: z.record(safeId, z.enum(["keep", "export"])),
});
export function initialState(c: Content): Save {
  return {
    schemaVersion: 3,
    contentVersion: c.version,
    tick: 0,
    remainder: 0,
    nextId: 1,
    fuel: c.economy.startFuel,
    debt: 0,
    exported: 0,
    flows: emptyFlows(),
    stock: { [c.site.buildMaterial]: c.site.startStock },
    knowledge: c.reactions.filter((r) => r.known).map((r) => r.id),
    deposits: Object.fromEntries(c.site.deposits.map((d) => [d.id, d.units])),
    machines: {},
    factories: {},
    belts: {},
    policies: Object.fromEntries(
      c.materials.filter((m) => m.known).map((m) => [m.id, "keep"]),
    ),
  };
}
export function parseSave(input: unknown, c: Content): Save {
  const s = schema.parse(input);
  if (s.contentVersion !== c.version || s.remainder >= c.tickMs)
    throw new Error("Incompatible content or timing");
  if (
    new Set(s.knowledge).size !== s.knowledge.length ||
    s.knowledge.some((id) => !c.reactions.some((r) => r.id === id)) ||
    c.reactions.some((r) => r.known && !s.knowledge.includes(r.id))
  )
    throw new Error("Invalid knowledge");
  const known = new Set(c.materials.filter((m) => m.known).map((m) => m.id));
  c.reactions
    .filter((r) => s.knowledge.includes(r.id))
    .forEach((r) => {
      known.add(r.input);
      known.add(r.output);
    });
  if (
    Object.keys(s.deposits).sort().join() !==
      c.site.deposits
        .map((d) => d.id)
        .sort()
        .join() ||
    c.site.deposits.some((d) => s.deposits[d.id] > d.units)
  )
    throw new Error("Invalid deposit state");
  const ids = new Set<string>();
  const takeId = (id: string, prefix: string) => {
    if (
      !new RegExp("^" + prefix + "[1-9][0-9]*$").test(id) ||
      ids.has(id) ||
      Number(id.slice(1)) >= s.nextId
    )
      throw new Error("Invalid or duplicate entity ID");
    ids.add(id);
  };
  const stage = initialState(c);
  for (const [id, f] of Object.entries(s.factories)) {
    takeId(id, "f");
    if (f.id !== id) throw new Error("Mismatched factory ID");
    const error = factoryError(c, stage, f);
    if (error) throw new Error(error);
    stage.factories[id] = { ...f, ports: [] };
    for (const p of f.ports) {
      takeId(p.id, "p");
      const error = portError(stage.factories[id], p, p.direction);
      if (error) throw new Error(error);
      stage.factories[id].ports.push(p);
    }
  }
  for (const [id, m] of Object.entries(s.machines)) {
    takeId(id, "m");
    if (m.id !== id) throw new Error("Mismatched machine ID");
    const placement = machinePlacement(c, stage, m);
    if (
      placement.error ||
      placement.factoryId !== m.factoryId ||
      placement.depositId !== m.depositId
    )
      throw new Error(placement.error ?? "Invalid machine ownership");
    const d = c.machines.find((d) => d.id === m.definitionId)!;
    if (
      d.role === "processor"
        ? !m.operation || !d.operations.includes(m.operation)
        : m.operation !== null
    )
      throw new Error("Invalid operation");
    if (total(m.input) > d.capacity || total(m.output) > d.capacity)
      throw new Error("Capacity exceeded");
    if (d.role === "extractor" && total(m.input))
      throw new Error("Extractor cannot contain inputs");
    for (const material of Object.keys(m.output)) {
      const valid =
        d.role === "extractor"
          ? c.site.deposits.find((a) => a.id === m.depositId)?.material ===
            material
          : c.reactions.some(
              (r) =>
                d.operations.includes(r.operation) && r.output === material,
            );
      if (!valid) throw new Error("Impossible machine output");
    }
    if (m.job) {
      const r = c.reactions.find((r) => r.id === m.job!.reaction);
      if (
        m.job.remaining > d.durationTicks ||
        (d.role === "extractor"
          ? m.job.reaction !== null
          : !r || r.operation !== m.operation) ||
        total(m.output) + (r?.outputAmount ?? 1) > d.capacity
      )
        throw new Error("Invalid active batch");
    }
    stage.machines[id] = m;
  }
  for (const [location, b] of Object.entries(s.belts)) {
    takeId(b.id, "b");
    if (location !== key(b)) throw new Error("Invalid belt location");
    const error = beltError(c, stage, b, b.direction);
    if (error) throw new Error(error);
    if (b.cargo && !known.has(b.cargo)) throw new Error("Unknown cargo");
    stage.belts[location] = b;
  }
  for (const inv of [
    s.stock,
    ...Object.values(s.flows),
    ...Object.values(s.machines).flatMap((m) => [m.input, m.output]),
  ])
    if (Object.keys(inv).some((id) => !known.has(id)))
      throw new Error("Unknown inventory material");
  for (const [id, policy] of Object.entries(s.policies))
    if (
      !known.has(id) ||
      (policy === "export" &&
        !c.materials.find((m) => m.id === id)?.exportValue)
    )
      throw new Error("Invalid terminal policy");
  return s;
}
