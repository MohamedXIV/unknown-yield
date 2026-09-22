import { z } from "zod";
import type { Content } from "@site/content";
import { amount, change, type Save, type CommandResult } from "./types";
import {
  factoryError,
  machinePlacement,
  portError,
  beltError,
  key,
  contains,
} from "./geometry";
const coordinate = z.number().int().min(0).max(10000),
  direction = z.number().int().min(0).max(3),
  point = { x: coordinate, y: coordinate };
const schema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("placeFactory"),
    ...point,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("placeMachine"),
    ...point,
    definitionId: z.string(),
    direction,
  }),
  z.object({
    type: z.literal("placePort"),
    ...point,
    factoryId: z.string(),
    direction,
  }),
  z.object({
    type: z.literal("placeBelts"),
    points: z.array(z.object(point)).min(1).max(4800),
    direction,
  }),
  z.object({ type: z.literal("dismantle"), id: z.string() }),
  z.object({
    type: z.literal("setEnabled"),
    machineId: z.string(),
    enabled: z.boolean(),
  }),
  z.object({
    type: z.literal("setOperation"),
    machineId: z.string(),
    operation: z.string(),
  }),
  z.object({
    type: z.literal("discard"),
    machineId: z.string(),
    buffer: z.enum(["input", "output"]),
  }),
  z.object({
    type: z.literal("setPolicy"),
    materialId: z.string(),
    policy: z.enum(["keep", "export"]),
  }),
  z.object({ type: z.literal("assistance") }),
]);
const fail = (message: string): CommandResult => ({ ok: false, message });
const ok = (message: string, cost = 0, id?: string): CommandResult => ({
  ok: true,
  message,
  cost,
  id,
});
export function applyCommand(
  c: Content,
  s: Save,
  input: unknown,
  apply: boolean,
): CommandResult {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("Invalid command");
  const cmd = parsed.data;
  const affordable = (cost: number) =>
    amount(s.stock, c.site.buildMaterial) >= cost;
  const pay = (cost: number) => change(s.stock, c.site.buildMaterial, -cost);
  const issue = (prefix: string) => prefix + s.nextId++;
  if ("machineId" in cmd && !Object.hasOwn(s.machines, cmd.machineId))
    return fail("Unknown machine");
  switch (cmd.type) {
    case "placeFactory": {
      const cost = cmd.width * cmd.height * c.site.factoryCellCost,
        error = factoryError(c, s, cmd);
      if (error) return fail(error);
      if (!affordable(cost)) return fail("Not enough structural plates");
      if (!apply) return ok("Build factory", cost);
      const id = issue("f");
      pay(cost);
      s.factories[id] = {
        id,
        x: cmd.x,
        y: cmd.y,
        width: cmd.width,
        height: cmd.height,
        ports: [],
      };
      return ok("Factory built", cost, id);
    }
    case "placeMachine": {
      const placement = machinePlacement(c, s, cmd);
      if (placement.error) return fail(placement.error);
      const def = c.machines.find((d) => d.id === cmd.definitionId)!;
      if (!affordable(def.cost)) return fail("Not enough structural plates");
      if (!apply) return ok("Place " + def.name, def.cost);
      const id = issue("m");
      pay(def.cost);
      s.machines[id] = {
        id,
        x: cmd.x,
        y: cmd.y,
        direction: cmd.direction,
        definitionId: def.id,
        factoryId: placement.factoryId,
        depositId: placement.depositId,
        operation: def.operations[0] ?? null,
        enabled: true,
        input: {},
        output: {},
        job: null,
      };
      return ok(def.name + " placed", def.cost, id);
    }
    case "placePort": {
      const f = Object.hasOwn(s.factories, cmd.factoryId)
        ? s.factories[cmd.factoryId]
        : null;
      if (!f) return fail("Unknown factory");
      const error = portError(f, cmd, cmd.direction);
      if (error) return fail(error);
      if (!affordable(c.site.portCost))
        return fail("Not enough structural plates");
      if (!apply) return ok("Place wall port", c.site.portCost);
      const id = issue("p");
      pay(c.site.portCost);
      f.ports.push({ id, x: cmd.x, y: cmd.y, direction: cmd.direction });
      return ok("Wall port placed", c.site.portCost, id);
    }
    case "placeBelts": {
      const seen = new Set<string>();
      const segments = [];
      for (let i = 0; i < cmd.points.length; i++) {
        const p = cmd.points[i],
          n = cmd.points[i + 1];
        if (seen.has(key(p))) return fail("A path cannot cross itself");
        seen.add(key(p));
        if (n && Math.abs(n.x - p.x) + Math.abs(n.y - p.y) !== 1)
          return fail("Draw adjacent cardinal cells");
        const dir = n
          ? n.x > p.x
            ? 0
            : n.y > p.y
              ? 1
              : n.x < p.x
                ? 2
                : 3
          : cmd.direction;
        const error = beltError(c, s, p, dir);
        if (error) return fail(error);
        segments.push({ ...p, direction: dir });
      }
      const cost = segments.length * c.site.beltCost;
      if (!affordable(cost)) return fail("Not enough structural plates");
      if (!apply) return ok("Build " + segments.length + " belt cells", cost);
      pay(cost);
      for (const p of segments)
        s.belts[key(p)] = { ...p, id: issue("b"), cargo: null };
      return ok("Belt path built", cost);
    }
    case "setEnabled":
      if (apply) s.machines[cmd.machineId].enabled = cmd.enabled;
      return ok(
        cmd.enabled
          ? "Automatic operation enabled"
          : "Stopping after current batch",
      );
    case "setOperation": {
      const m = s.machines[cmd.machineId],
        d = c.machines.find((d) => d.id === m.definitionId)!;
      if (!d.operations.includes(cmd.operation))
        return fail("Unsupported operation");
      if (m.job) return fail("Wait for the current batch to finish");
      if (apply) m.operation = cmd.operation;
      return ok("Operation selected");
    }
    case "discard":
      if (apply) {
        // Prototype shortcut (see Issue #5): account every discarded unit as
        // an explicit sink instead of silently deleting it.
        for (const [id, n] of Object.entries(
          s.machines[cmd.machineId][cmd.buffer],
        ))
          change(s.flows.discarded, id, n);
        s.machines[cmd.machineId][cmd.buffer] = {};
      }
      return ok("Buffer discarded");
    case "setPolicy": {
      const mat = c.materials.find((m) => m.id === cmd.materialId);
      const known =
        mat?.known ||
        c.reactions.some(
          (r) => s.knowledge.includes(r.id) && r.output === cmd.materialId,
        );
      if (!mat || !known) return fail("Unknown material");
      if (cmd.policy === "export" && !mat.exportValue)
        return fail("The company does not accept this material");
      if (apply) s.policies[cmd.materialId] = cmd.policy;
      return ok("Terminal policy updated");
    }
    case "assistance":
      if (s.fuel >= c.economy.assistanceBelow)
        return fail("Emergency allocation requires depleted fuel");
      if (apply) {
        s.fuel += c.economy.grant;
        s.debt += c.economy.grant;
      }
      return ok("Emergency fuel received; exports repay the obligation");
    case "dismantle": {
      if (Object.hasOwn(s.machines, cmd.id)) {
        const m = s.machines[cmd.id],
          def = c.machines.find((d) => d.id === m.definitionId)!;
        if (m.job)
          return fail("Disable this machine and wait for its batch to finish");
        if (apply) {
          for (const inv of [m.input, m.output])
            for (const [id, n] of Object.entries(inv)) change(s.stock, id, n);
          change(s.stock, c.site.buildMaterial, def.cost);
          delete s.machines[cmd.id];
        }
        return ok("Machine reclaimed");
      }
      if (Object.hasOwn(s.factories, cmd.id)) {
        const f = s.factories[cmd.id];
        if (
          f.ports.length ||
          Object.values(s.machines).some((m) => m.factoryId === f.id) ||
          Object.values(s.belts).some((b) => contains(f, b))
        )
          return fail("Empty the factory, belts and ports first");
        if (apply) {
          change(
            s.stock,
            c.site.buildMaterial,
            f.width * f.height * c.site.factoryCellCost,
          );
          delete s.factories[f.id];
        }
        return ok("Factory reclaimed");
      }
      const belt = Object.values(s.belts).find((b) => b.id === cmd.id);
      if (belt) {
        if (apply) {
          if (belt.cargo) change(s.stock, belt.cargo, 1);
          change(s.stock, c.site.buildMaterial, c.site.beltCost);
          delete s.belts[key(belt)];
        }
        return ok("Belt and cargo reclaimed");
      }
      for (const f of Object.values(s.factories)) {
        const p = f.ports.find((p) => p.id === cmd.id);
        if (p) {
          if (Object.hasOwn(s.belts, key(p)))
            return fail("Remove the belt on this port first");
          if (apply) {
            f.ports = f.ports.filter((a) => a.id !== p.id);
            change(s.stock, c.site.buildMaterial, c.site.portCost);
          }
          return ok("Port reclaimed");
        }
      }
      return fail("Unknown structure");
    }
  }
}
