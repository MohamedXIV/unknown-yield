import { liquidConstructionCost } from "./containment";
import {
  undergroundLiquidCost,
  undergroundSolidCost,
} from "./underground";
import { elevatedSolidCost } from "./elevated";
import {
  dispatchShipmentCommand,
  moduleCommand,
  shipmentQuantityCommand,
} from "./terminal";
import { pumpRepairEligible } from "./pump-recovery";
import { z } from "zod";
import type { Content } from "@site/content";
import { amount, change, total, type Save, type CommandResult } from "./types";
import { machineUnlocked } from "./progression";
import { exchangeDefinition } from "./market";
import { applyAssistance, assistanceEligibility } from "./assistance";
import { applySensingObservation } from "./sensing";
import { requestImportCommand } from "./imports";
import {
  factoryConnectionRequirements,
  factoryRelocationResumeError,
} from "./factory-lifecycle";
import {
  factoryError,
  factoryReshapeError,
  factoryRelocationError,
  machinePlacement,
  portError,
  beltError,
  storageError,
  wall,
  key,
  contains,
  gasPlacementError,
  gasRects,
  liquidPlacementError,
  liquidRects,
  overlaps,
  next,
  inside,
  footprint,
  undergroundDirection,
  undergroundPlacementError,
  elevatedPlacementError,
} from "./geometry";
const coordinate = z.number().int().min(0).max(10000),
  direction = z.number().int().min(0).max(3),
  point = { x: coordinate, y: coordinate };
const schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("repairPump"), id: z.string() }),
  z.object({
    type: z.literal("setPumpRecoveryDrain"),
    id: z.string(),
    enabled: z.boolean(),
  }),
  z.object({
    type: z.literal("installTerminalModule"),
    definitionId: z.string(),
  }),
  z.object({
    type: z.literal("removeTerminalModule"),
    definitionId: z.string(),
  }),
  z.object({
    type: z.literal("setLiquidContainmentProfile"),
    id: z.string(),
    containmentProfileId: z.string(),
  }),
  z.object({
    type: z.literal("placePressureLines"),
    points: z
      .array(z.object({ ...point, inlet: direction, outlet: direction }))
      .min(1)
      .max(4800),
  }),
  z.object({ type: z.literal("placePressureVessel"), ...point, direction }),
  z.object({ type: z.literal("placeCompressor"), ...point, direction }),
  z.object({
    type: z.literal("setCompressorEnabled"),
    id: z.string(),
    enabled: z.boolean(),
  }),
  z.object({
    type: z.literal("configurePressureLine"),
    id: z.string(),
    inlet: direction,
    outlet: direction,
  }),

  z.object({
    type: z.literal("placePipes"),
    containmentProfileId: z.string().default("standard"),
    points: z
      .array(z.object({ ...point, inlet: direction, outlet: direction }))
      .min(1)
      .max(4800),
  }),
  z.object({
    type: z.literal("placeTank"),
    containmentProfileId: z.string().default("standard"),
    ...point,
    direction,
  }),
  z.object({
    type: z.literal("placePump"),
    containmentProfileId: z.string().default("standard"),
    ...point,
    direction,
  }),
  z.object({
    type: z.literal("setPumpEnabled"),
    id: z.string(),
    enabled: z.boolean(),
  }),
  z.object({
    type: z.literal("configurePipe"),
    id: z.string(),
    inlet: direction,
    outlet: direction,
  }),

  z.object({
    type: z.literal("placeFactory"),
    ...point,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("reshapeFactory"),
    factoryId: z.string(),
    ...point,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("relocateFactory"),
    factoryId: z.string(),
    ...point,
  }),
  z.object({
    type: z.literal("placeMachine"),
    ...point,
    definitionId: z.string(),
    direction,
  }),
  z.object({
    type: z.literal("recoverMachineIncident"),
    machineId: z.string(),
  }),
  z.object({
    type: z.literal("placeStorage"),
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
  z.object({
    type: z.literal("placeUndergroundSolid"),
    entry: z.object(point),
    exit: z.object(point),
  }),
  z.object({
    type: z.literal("placeElevatedSolid"),
    entry: z.object(point),
    exit: z.object(point),
  }),
  z.object({
    type: z.literal("placeUndergroundLiquid"),
    entry: z.object(point),
    exit: z.object(point),
    containmentProfileId: z.string().default("standard"),
  }),
  z.object({
    type: z.literal("configureJunction"),
    beltId: z.string(),
    definitionId: z.string().nullable(),
    direction,
    branch: z.union([z.literal(1), z.literal(-1)]),
  }),
  z.object({ type: z.literal("rotateDivert"), beltId: z.string() }),
  z.object({ type: z.literal("switchDivert"), beltId: z.string() }),
  z.object({
    type: z.literal("setDivertRoute"),
    beltId: z.string(),
    route: z.enum(["primary", "alternate"]),
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
    type: z.literal("setPolicy"),
    materialId: z.string(),
    policy: z.enum(["keep", "export"]),
  }),
  z.object({
    type: z.literal("setShipmentQuantity"),
    materialId: z.string(),
    quantity: z.number().int().nonnegative().max(1000000000),
  }),
  z.object({ type: z.literal("dispatchShipment") }),
  z.object({ type: z.literal("requestImport"), supplyId: z.string() }),
  z.object({
    type: z.literal("sense"),
    capabilityId: z.string(),
    ...point,
  }),
  z.object({ type: z.literal("assistance"), packageId: z.string().optional() }),
]);
const liquidMessages: Record<string, string> = {
  "Unknown liquid containment profile":
    "ui.containment.command.unknown-profile",
  "Unknown liquid structure": "ui.containment.command.unknown-structure",
  "Drain liquid contents before changing containment":
    "ui.containment.command.drain-first",
  "Disable the pump before changing containment":
    "ui.containment.command.disable-first",
  "Liquid containment updated": "ui.containment.command.updated",
  "Liquid infrastructure is not authored": "ui.liquid.command.unavailable",
  "Invalid directed pipe path": "ui.liquid.command.invalid-path",
  "Pipe endpoints must connect": "ui.liquid.command.disconnected",
  "Place pipes": "ui.liquid.command.place-pipes",
  "Pipes placed": "ui.liquid.command.pipes-placed",
  "Place liquid structure": "ui.liquid.command.place-structure",
  "Liquid structure placed": "ui.liquid.command.placed",
  "Unknown pump": "ui.liquid.command.unknown-pump",
  "Pump updated": "ui.liquid.command.pump-updated",
  "Unknown pipe": "ui.liquid.command.unknown-pipe",
  "Drain the pipe before rerouting": "ui.liquid.command.drain-pipe",
  "Pipe inlet and outlet must differ": "ui.liquid.command.different-ends",
  "Pipe updated": "ui.liquid.command.pipe-updated",
  "Drain liquid contents before dismantling": "ui.liquid.command.drain-first",
  "Liquid structure reclaimed": "ui.liquid.command.reclaimed",
  "Remove liquid infrastructure on this port first":
    "ui.liquid.command.remove-port",
};
const gasMessages: Record<string, string> = {
  "Gas infrastructure is not authored": "ui.gas.command.unavailable",
  "Invalid directed pressure line path": "ui.gas.command.invalid-path",
  "Pressure line endpoints must connect": "ui.gas.command.disconnected",
  "Place pressure lines": "ui.gas.command.place-pipes",
  "Pressure lines placed": "ui.gas.command.lines-placed",
  "Place gas structure": "ui.gas.command.place-structure",
  "Gas structure placed": "ui.gas.command.placed",
  "Unknown compressor": "ui.gas.command.unknown-pump",
  "Compressor updated": "ui.gas.command.compressor-updated",
  "Unknown pressure line": "ui.gas.command.unknown-pipe",
  "Drain the pressure line before rerouting": "ui.gas.command.drain-pipe",
  "Pressure line inlet and outlet must differ": "ui.gas.command.different-ends",
  "Pressure line updated": "ui.gas.command.line-updated",
  "Drain gas contents before dismantling": "ui.gas.command.drain-first",
  "Gas structure reclaimed": "ui.gas.command.reclaimed",
  "Remove gas infrastructure on this port first": "ui.gas.command.remove-port",
};
const fail = (message: string): CommandResult => ({
  ok: false,
  message,
  ...((liquidMessages[message] ?? gasMessages[message])
    ? { messageKey: liquidMessages[message] ?? gasMessages[message] }
    : {}),
});
const ok = (message: string, cost = 0, id?: string): CommandResult => ({
  ok: true,
  message,
  ...((liquidMessages[message] ?? gasMessages[message])
    ? { messageKey: liquidMessages[message] ?? gasMessages[message] }
    : {}),
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
    case "sense":
      return applySensingObservation(
        c,
        s,
        cmd.capabilityId,
        cmd.x,
        cmd.y,
        apply,
      );
    case "installTerminalModule":
    case "removeTerminalModule":
      return moduleCommand(
        c,
        s,
        cmd.definitionId,
        cmd.type === "installTerminalModule",
        apply,
      );
    case "placePressureLines": {
      const cfg = c.gasLogistics;
      if (!cfg) return fail("Gas infrastructure is not authored");
      const stage = structuredClone(s),
        seen = new Set<string>();
      for (let i = 0; i < cmd.points.length; i++) {
        const point = cmd.points[i],
          prev = cmd.points[i - 1];
        if (seen.has(key(point)) || point.inlet === point.outlet)
          return fail("Invalid directed pressure line path");
        if (
          prev &&
          (key(next(prev, prev.outlet)) !== key(point) ||
            point.inlet !== (prev.outlet + 2) % 4)
        )
          return fail("Pressure line endpoints must connect");
        const error = gasPlacementError(c, stage, point, "line");
        if (error) return fail(error);
        seen.add(key(point));
        stage.pressureLines[key(point)] = {
          ...point,
          id: "preview",
          materialId: null,
          quantity: 0,
        };
      }
      const cost = cmd.points.length * cfg.line.cost;
      if (!affordable(cost)) return fail("Not enough structural plates");
      if (!apply) return ok("Place pressure lines", cost);
      pay(cost);
      for (const point of cmd.points)
        s.pressureLines[key(point)] = {
          ...point,
          id: issue("g"),
          materialId: null,
          quantity: 0,
        };
      return ok("Pressure lines placed", cost);
    }
    case "placePressureVessel":
    case "placeCompressor": {
      const cfg = c.gasLogistics;
      if (!cfg) return fail("Gas infrastructure is not authored");
      const kind = cmd.type === "placePressureVessel" ? "vessel" : "compressor",
        error = gasPlacementError(c, s, cmd, kind);
      if (error) return fail(error);
      if (
        kind === "compressor" &&
        Object.values(s.factories).some(
          (factory) => factory.relocation && contains(factory, cmd),
        )
      )
        return fail("Finish factory relocation before adding equipment");
      const cost = cfg[kind].cost;
      if (!affordable(cost)) return fail("Not enough structural plates");
      if (!apply) return ok("Place gas structure", cost);
      const id = issue(kind === "vessel" ? "v" : "c");
      pay(cost);
      if (kind === "vessel")
        s.pressureVessels[id] = {
          id,
          x: cmd.x,
          y: cmd.y,
          direction: cmd.direction,
          materialId: null,
          quantity: 0,
        };
      else
        s.compressors[id] = {
          id,
          x: cmd.x,
          y: cmd.y,
          direction: cmd.direction,
          enabled: true,
        };
      return ok("Gas structure placed", cost, id);
    }
    case "setCompressorEnabled": {
      const pump = Object.hasOwn(s.compressors, cmd.id)
        ? s.compressors[cmd.id]
        : undefined;
      if (!pump) return fail("Unknown compressor");
      const factory = Object.values(s.factories).find((candidate) =>
        contains(candidate, pump),
      );
      if (cmd.enabled && factory?.relocation) {
        const error = factoryRelocationResumeError(c, s, factory);
        if (error) return fail(error);
        if (apply) delete factory.relocation;
      }
      if (apply) pump.enabled = cmd.enabled;
      return ok("Compressor updated");
    }
    case "configurePressureLine": {
      const pipe = Object.values(s.pressureLines).find((p) => p.id === cmd.id);
      if (!pipe) return fail("Unknown pressure line");
      if (pipe.quantity)
        return fail("Drain the pressure line before rerouting");
      if (cmd.inlet === cmd.outlet)
        return fail("Pressure line inlet and outlet must differ");
      const stage = structuredClone(s);
      delete stage.pressureLines[key(pipe)];
      const error = gasPlacementError(
        c,
        stage,
        { ...pipe, inlet: cmd.inlet, outlet: cmd.outlet },
        "line",
      );
      if (error) return fail(error);
      if (apply) {
        pipe.inlet = cmd.inlet;
        pipe.outlet = cmd.outlet;
      }
      return ok("Pressure line updated");
    }

    case "placePipes": {
      const cfg = c.liquidLogistics;
      if (!cfg) return fail("Liquid infrastructure is not authored");
      if (
        !cfg.containmentProfiles.some((p) => p.id === cmd.containmentProfileId)
      )
        return fail("Unknown liquid containment profile");
      const stage = structuredClone(s),
        seen = new Set<string>();
      for (let i = 0; i < cmd.points.length; i++) {
        const point = cmd.points[i],
          prev = cmd.points[i - 1];
        if (seen.has(key(point)) || point.inlet === point.outlet)
          return fail("Invalid directed pipe path");
        if (
          prev &&
          (key(next(prev, prev.outlet)) !== key(point) ||
            point.inlet !== (prev.outlet + 2) % 4)
        )
          return fail("Pipe endpoints must connect");
        const error = liquidPlacementError(c, stage, point, "pipe");
        if (error) return fail(error);
        seen.add(key(point));
        stage.pipes[key(point)] = {
          ...point,
          id: "preview",
          containmentProfileId: cmd.containmentProfileId,
          materialId: null,
          quantity: 0,
        };
      }
      const cost =
        cmd.points.length *
        liquidConstructionCost(c, "pipe", cmd.containmentProfileId);
      if (!affordable(cost)) return fail("Not enough structural plates");
      if (!apply) return ok("Place pipes", cost);
      pay(cost);
      for (const point of cmd.points)
        s.pipes[key(point)] = {
          ...point,
          id: issue("l"),
          containmentProfileId: cmd.containmentProfileId,
          materialId: null,
          quantity: 0,
        };
      return ok("Pipes placed", cost);
    }
    case "placeTank":
    case "placePump": {
      const cfg = c.liquidLogistics;
      if (!cfg) return fail("Liquid infrastructure is not authored");
      if (
        !cfg.containmentProfiles.some((p) => p.id === cmd.containmentProfileId)
      )
        return fail("Unknown liquid containment profile");
      const kind = cmd.type === "placeTank" ? "tank" : "pump",
        error = liquidPlacementError(c, s, cmd, kind);
      if (error) return fail(error);
      if (
        kind === "pump" &&
        Object.values(s.factories).some(
          (factory) => factory.relocation && contains(factory, cmd),
        )
      )
        return fail("Finish factory relocation before adding equipment");
      const cost = liquidConstructionCost(c, kind, cmd.containmentProfileId);
      if (!affordable(cost)) return fail("Not enough structural plates");
      if (!apply) return ok("Place liquid structure", cost);
      const id = issue(kind === "tank" ? "t" : "u");
      pay(cost);
      if (kind === "tank")
        s.tanks[id] = {
          id,
          x: cmd.x,
          y: cmd.y,
          direction: cmd.direction,
          containmentProfileId: cmd.containmentProfileId,
          materialId: null,
          quantity: 0,
        };
      else
        s.pumps[id] = {
          id,
          x: cmd.x,
          y: cmd.y,
          direction: cmd.direction,
          containmentProfileId: cmd.containmentProfileId,
          enabled: true,
          incident: null,
        };
      return ok("Liquid structure placed", cost, id);
    }
    case "setLiquidContainmentProfile": {
      const pipe = Object.values(s.pipes).find((p) => p.id === cmd.id),
        tank = Object.hasOwn(s.tanks, cmd.id) ? s.tanks[cmd.id] : undefined,
        pump = Object.hasOwn(s.pumps, cmd.id) ? s.pumps[cmd.id] : undefined;
      const item = pipe ?? tank ?? pump;
      if (!item) return fail("Unknown liquid structure");
      if (
        !c.liquidLogistics?.containmentProfiles.some(
          (p) => p.id === cmd.containmentProfileId,
        )
      )
        return fail("Unknown liquid containment profile");
      if (pipe?.quantity || tank?.quantity || pump?.incident?.quantity)
        return fail("Drain liquid contents before changing containment");
      if (pump?.enabled)
        return fail("Disable the pump before changing containment");
      const kind = pipe ? "pipe" : tank ? "tank" : "pump",
        delta =
          liquidConstructionCost(c, kind, cmd.containmentProfileId) -
          liquidConstructionCost(c, kind, item.containmentProfileId);
      if (delta > 0 && !affordable(delta))
        return fail("Not enough structural plates");
      if (apply) {
        pay(delta);
        item.containmentProfileId = cmd.containmentProfileId;
      }
      return ok("Liquid containment updated", delta);
    }
    case "setPumpEnabled": {
      const pump = Object.hasOwn(s.pumps, cmd.id) ? s.pumps[cmd.id] : undefined;
      if (!pump) return fail("Unknown pump");
      if (cmd.enabled && pump.incident)
        return {
          ok: false,
          message: "Repair the pump before restarting",
          messageKey: "ui.recovery.repair-first",
        };
      const factory = Object.values(s.factories).find((candidate) =>
        contains(candidate, pump),
      );
      if (cmd.enabled && factory?.relocation) {
        const error = factoryRelocationResumeError(c, s, factory);
        if (error) return fail(error);
        if (apply) delete factory.relocation;
      }
      if (apply) pump.enabled = cmd.enabled;
      return ok("Pump updated");
    }
    case "setPumpRecoveryDrain": {
      const p = Object.hasOwn(s.pumps, cmd.id) ? s.pumps[cmd.id] : undefined;
      if (!p?.incident || p.enabled)
        return {
          ok: false,
          message: "No stopped pump incident",
          messageKey: "ui.recovery.no-incident",
        };
      if (apply) p.incident.drainEnabled = cmd.enabled;
      return {
        ok: true,
        message: "Recovery outlet updated",
        messageKey: "ui.recovery.drain-updated",
      };
    }
    case "repairPump": {
      const p = Object.hasOwn(s.pumps, cmd.id) ? s.pumps[cmd.id] : undefined;
      if (!p || !pumpRepairEligible(c, p))
        return {
          ok: false,
          message: "Drain and protect the pump before repair",
          messageKey: "ui.recovery.not-repairable",
        };
      if (apply) p.incident = null;
      return {
        ok: true,
        message: "Pump repaired",
        messageKey: "ui.recovery.repaired",
      };
    }
    case "configurePipe": {
      const pipe = Object.values(s.pipes).find((p) => p.id === cmd.id);
      if (!pipe) return fail("Unknown pipe");
      if (pipe.quantity) return fail("Drain the pipe before rerouting");
      if (cmd.inlet === cmd.outlet)
        return fail("Pipe inlet and outlet must differ");
      const stage = structuredClone(s);
      delete stage.pipes[key(pipe)];
      const error = liquidPlacementError(
        c,
        stage,
        { ...pipe, inlet: cmd.inlet, outlet: cmd.outlet },
        "pipe",
      );
      if (error) return fail(error);
      if (apply) {
        pipe.inlet = cmd.inlet;
        pipe.outlet = cmd.outlet;
      }
      return ok("Pipe updated");
    }
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
    case "reshapeFactory": {
      const factory = Object.hasOwn(s.factories, cmd.factoryId)
        ? s.factories[cmd.factoryId]
        : undefined;
      if (!factory) return fail("Unknown factory");
      const error = factoryReshapeError(c, s, factory, cmd);
      if (error) return fail(error);
      const oldArea = factory.width * factory.height,
        newArea = cmd.width * cmd.height,
        cost = (newArea - oldArea) * c.site.factoryCellCost;
      if (cost > 0 && !affordable(cost))
        return fail("Not enough structural plates");
      if (!apply) return ok("Reshape factory shell", cost);
      pay(cost);
      factory.x = cmd.x;
      factory.y = cmd.y;
      factory.width = cmd.width;
      factory.height = cmd.height;
      return ok("Factory shell reshaped", cost, factory.id);
    }
    case "relocateFactory": {
      const factory = Object.hasOwn(s.factories, cmd.factoryId)
        ? s.factories[cmd.factoryId]
        : undefined;
      if (!factory) return fail("Unknown factory");
      const error = factoryRelocationError(c, s, factory, cmd);
      if (error) return fail(error);
      const dx = cmd.x - factory.x,
        dy = cmd.y - factory.y,
        distance = Math.abs(dx) + Math.abs(dy),
        fuelCost = distance * c.site.factoryRelocationFuelPerStep,
        requirements = factoryConnectionRequirements(c, s, factory);
      if (s.fuel < fuelCost) return fail("Not enough fuel for relocation");
      if (!apply) return ok("Relocate factory", fuelCost);

      const belts = Object.values(s.belts).filter((belt) =>
          contains(factory, belt),
        ),
        pipes = Object.values(s.pipes).filter((pipe) =>
          contains(factory, pipe),
        ),
        lines = Object.values(s.pressureLines).filter((line) =>
          contains(factory, line),
        ),
        machines = Object.values(s.machines).filter(
          (machine) => machine.factoryId === factory.id,
        ),
        pumps = Object.values(s.pumps).filter((pump) =>
          contains(factory, pump),
        ),
        tanks = c.liquidLogistics
          ? Object.values(s.tanks).filter((tank) =>
              inside(factory, footprint(tank, c.liquidLogistics!.tank)),
            )
          : [],
        compressors = Object.values(s.compressors).filter((compressor) =>
          contains(factory, compressor),
        ),
        vessels = c.gasLogistics
          ? Object.values(s.pressureVessels).filter((vessel) =>
              inside(factory, footprint(vessel, c.gasLogistics!.vessel)),
            )
          : [];

      for (const belt of belts) delete s.belts[key(belt)];
      for (const pipe of pipes) delete s.pipes[key(pipe)];
      for (const line of lines) delete s.pressureLines[key(line)];

      s.fuel -= fuelCost;
      factory.x += dx;
      factory.y += dy;
      for (const port of factory.ports) {
        port.x += dx;
        port.y += dy;
      }
      for (const machine of machines) {
        machine.x += dx;
        machine.y += dy;
      }
      for (const belt of belts) {
        belt.x += dx;
        belt.y += dy;
        s.belts[key(belt)] = belt;
      }
      for (const pipe of pipes) {
        pipe.x += dx;
        pipe.y += dy;
        s.pipes[key(pipe)] = pipe;
      }
      for (const line of lines) {
        line.x += dx;
        line.y += dy;
        s.pressureLines[key(line)] = line;
      }
      for (const item of [
        ...pumps,
        ...tanks,
        ...compressors,
        ...vessels,
      ]) {
        item.x += dx;
        item.y += dy;
      }
      factory.relocation = {
        startedAt: s.tick,
        readyAt: s.tick + c.site.factoryRelocationDowntimeTicks,
        requirements,
      };
      return ok("Factory relocated", fuelCost, factory.id);
    }
    case "placeMachine": {
      const def = c.machines.find((d) => d.id === cmd.definitionId);
      if (!def) return fail("Unknown machine type");
      if (!machineUnlocked(s, def))
        return fail("Capability locked by unconfirmed knowledge");
      const placement = machinePlacement(c, s, cmd);
      if (placement.error) return fail(placement.error);
      if (
        placement.factoryId &&
        s.factories[placement.factoryId]?.relocation
      )
        return fail("Finish factory relocation before adding equipment");
      if (!affordable(def.cost)) return fail("Not enough structural plates");
      if (!apply) return ok("Place machine", def.cost);
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
        incident: null,
        incidentInventory: {},
        input: {},
        output: {},
        job: null,
      };
      return ok("Machine placed", def.cost, id);
    }
    case "placeStorage": {
      const def = c.storages.find((d) => d.id === cmd.definitionId);
      if (!def) return fail("Unknown storage type");
      const error = storageError(c, s, def, cmd);
      if (error) return fail(error);
      if (!affordable(def.cost)) return fail("Not enough structural plates");
      if (!apply) return ok("Place storage", def.cost);
      const id = issue("s");
      pay(def.cost);
      s.storages[id] = {
        id,
        x: cmd.x,
        y: cmd.y,
        direction: cmd.direction,
        definitionId: def.id,
        inventory: {},
      };
      return ok("Storage placed", def.cost, id);
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
    case "placeElevatedSolid": {
      const error = elevatedPlacementError(c, s, cmd.entry, cmd.exit);
      if (error) return fail(error);
      const direction = undergroundDirection(cmd.entry, cmd.exit)!,
        draft = { entry: cmd.entry, exit: cmd.exit },
        cost = elevatedSolidCost(c, draft);
      if (!affordable(cost)) return fail("Not enough structural plates");
      if (!apply) return ok("Place elevated solid gantry", cost);
      const id = issue("e");
      pay(cost);
      s.elevatedSolids[id] = {
        id,
        entry: { ...cmd.entry },
        exit: { ...cmd.exit },
        direction,
        cargo: null,
      };
      return ok("Elevated solid gantry placed", cost, id);
    }
    case "placeUndergroundSolid":
    case "placeUndergroundLiquid": {
      const error = undergroundPlacementError(c, s, cmd.entry, cmd.exit);
      if (error) return fail(error);
      const direction = undergroundDirection(cmd.entry, cmd.exit)!;
      if (cmd.type === "placeUndergroundLiquid") {
        const cfg = c.liquidLogistics;
        if (!cfg) return fail("Liquid infrastructure is not authored");
        if (
          !cfg.containmentProfiles.some(
            (profile) => profile.id === cmd.containmentProfileId,
          )
        )
          return fail("Unknown liquid containment profile");
        const draft = {
          entry: cmd.entry,
          exit: cmd.exit,
          containmentProfileId: cmd.containmentProfileId,
        };
        const cost = undergroundLiquidCost(c, draft);
        if (!affordable(cost)) return fail("Not enough structural plates");
        if (!apply) return ok("Place underground liquid route", cost);
        const id = issue("w");
        pay(cost);
        s.undergroundLiquids[id] = {
          id,
          entry: { ...cmd.entry },
          exit: { ...cmd.exit },
          direction,
          containmentProfileId: cmd.containmentProfileId,
          materialId: null,
          quantity: 0,
          remainingSteps: 0,
        };
        return ok("Underground liquid route placed", cost, id);
      }
      const draft = { entry: cmd.entry, exit: cmd.exit };
      const cost = undergroundSolidCost(c, draft);
      if (!affordable(cost)) return fail("Not enough structural plates");
      if (!apply) return ok("Place underground solid route", cost);
      const id = issue("q");
      pay(cost);
      s.undergroundSolids[id] = {
        id,
        entry: { ...cmd.entry },
        exit: { ...cmd.exit },
        direction,
        cargo: null,
      };
      return ok("Underground solid route placed", cost, id);
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
        s.belts[key(p)] = {
          ...p,
          id: issue("b"),
          cargo: null,
          alternate: null,
          switched: false,
        };
      return ok("Belt path built", cost);
    }
    case "configureJunction": {
      const b = Object.values(s.belts).find((b) => b.id === cmd.beltId);
      if (!b) return fail("Unknown belt");
      const reject = (name: string) => ({
        ...fail(name),
        messageKey: "ui.junction." + name,
      });
      if (b.cargo) return reject("loaded");
      if (Object.values(s.factories).some((f) => wall(f, b)))
        return reject("wall");
      const def =
        cmd.definitionId === null
          ? null
          : c.junctions.find((d) => d.id === cmd.definitionId);
      if (cmd.definitionId !== null && !def) return reject("unknown");
      const old = c.junctions.find((d) => d.id === b.junction?.definitionId);
      const cost = (def?.cost ?? 0) - (old?.cost ?? 0);
      if (cost > 0 && !affordable(cost)) return reject("cost");
      if (apply) {
        pay(cost);
        const cursor = old?.id === def?.id ? (b.junction?.cursor ?? 0) : 0;
        const crossing =
          def?.kind === "crossing"
            ? ((old?.id === def.id ? b.junction?.crossing : undefined) ?? {
                axis: 0 as const,
                remaining: def.windowSteps!,
                pending: null,
                held: null,
              })
            : undefined;
        b.junction = def
          ? {
              definitionId: def.id,
              branch: cmd.branch,
              cursor: def.kind === "crossing" ? 0 : cursor,
              ...(crossing ? { crossing } : {}),
            }
          : null;
        b.direction = cmd.direction;
        b.alternate = null;
        b.switched = false;
      }
      return {
        ...ok("Junction updated", cost),
        messageKey: "ui.junction.updated",
      };
    }
    case "rotateDivert": {
      const belt = Object.values(s.belts).find((b) => b.id === cmd.beltId);
      if (!belt) return fail("Unknown belt");
      if (belt.junction)
        return {
          ...fail("Use junction configuration"),
          messageKey: "ui.junction.manual",
        };
      // A wall/port belt may only ever exit through its matching port
      // direction; an alternate could reverse or bypass that one-way rule.
      if (Object.values(s.factories).some((f) => wall(f, belt)))
        return fail("Diverters cannot sit on factory walls");
      // Cycle the alternate exit through every non-primary direction,
      // then clear it. Cargo in the slot is untouched.
      let next: number | null;
      if (belt.alternate === null) next = (belt.direction + 1) % 4;
      else if ((belt.alternate + 1) % 4 === belt.direction) next = null;
      else next = (belt.alternate + 1) % 4;
      if (apply) {
        belt.alternate = next;
        if (next === null) belt.switched = false;
      }
      return ok(
        next === null ? "Alternate exit cleared" : "Alternate exit set",
      );
    }
    case "switchDivert": {
      const belt = Object.values(s.belts).find((b) => b.id === cmd.beltId);
      if (!belt) return fail("Unknown belt");
      if (belt.alternate === null)
        return fail("No alternate exit to switch to");
      const next = !belt.switched;
      if (apply) belt.switched = next;
      return ok(next ? "Flow switched" : "Flow restored");
    }
    case "setDivertRoute": {
      const belt = Object.values(s.belts).find((b) => b.id === cmd.beltId);
      if (!belt) return fail("Unknown belt");
      if (belt.junction)
        return {
          ...fail("Use junction configuration"),
          messageKey: "ui.junction.manual",
        };
      if (Object.values(s.factories).some((f) => wall(f, belt)))
        return fail("Diverters cannot sit on factory walls");
      if (cmd.route === "alternate" && belt.alternate === null)
        return {
          ...fail("No alternate exit to select"),
          messageKey: "ui.diverter.no-alternate",
        };
      if (apply) belt.switched = cmd.route === "alternate";
      return {
        ...ok(
          cmd.route === "alternate"
            ? "Alternate feed selected"
            : "Primary feed selected",
        ),
        messageKey:
          cmd.route === "alternate"
            ? "ui.diverter.route-alternate"
            : "ui.diverter.route-primary",
      };
    }
    case "recoverMachineIncident": {
      const machine = s.machines[cmd.machineId];
      if (!machine) return fail("Unknown machine");
      if (!machine.incident || total(machine.incidentInventory) === 0)
        return fail("No trapped hazard material to recover");
      const definition = c.machines.find(
        (entry) => entry.id === machine.definitionId,
      )!;
      if (
        total(machine.output) + total(machine.incidentInventory) >
        definition.capacity
      )
        return fail("Clear machine output before recovering hazard material");
      if (apply) {
        for (const [materialId, quantity] of Object.entries(
          machine.incidentInventory,
        ))
          change(machine.output, materialId, quantity);
        machine.incidentInventory = {};
        machine.incident = null;
        machine.enabled = false;
      }
      return ok("Hazard material reclaimed to machine output");
    }
    case "setEnabled": {
      const machine = s.machines[cmd.machineId],
        recovering = cmd.enabled && machine.incident !== null;
      if (recovering && total(machine.incidentInventory) > 0)
        return fail("Physical hazard consequence blocks restart");
      const factory = machine.factoryId
        ? s.factories[machine.factoryId]
        : undefined;
      if (cmd.enabled && factory?.relocation) {
        const error = factoryRelocationResumeError(c, s, factory);
        if (error) return fail(error);
        if (apply) delete factory.relocation;
      }
      if (apply) {
        machine.enabled = cmd.enabled;
        if (cmd.enabled) machine.incident = null;
      }
      return ok(
        recovering
          ? "Incident acknowledged; automatic operation enabled"
          : cmd.enabled
            ? "Automatic operation enabled"
            : "Stopping after current batch",
      );
    }
    case "setOperation": {
      const m = s.machines[cmd.machineId],
        d = c.machines.find((d) => d.id === m.definitionId)!;
      if (!d.operations.includes(cmd.operation))
        return fail("Unsupported operation");
      if (m.job) return fail("Wait for the current batch to finish");
      if (apply) m.operation = cmd.operation;
      return ok("Operation selected");
    }
    case "setPolicy": {
      const mat = c.materials.find((m) => m.id === cmd.materialId);
      const known =
        mat?.known ||
        c.reactions.some(
          (r) => s.knowledge.includes(r.id) && r.output === cmd.materialId,
        );
      if (!mat || !known) return fail("Unknown material");
      if (cmd.policy === "export" && !exchangeDefinition(c, mat.id))
        return fail("The company does not accept this material");
      if (apply) s.policies[cmd.materialId] = cmd.policy;
      return ok("Terminal policy updated");
    }
    case "setShipmentQuantity":
      return shipmentQuantityCommand(
        c,
        s,
        cmd.materialId,
        cmd.quantity,
        apply,
      );
    case "dispatchShipment":
      return dispatchShipmentCommand(c, s, apply);
    case "requestImport":
      return requestImportCommand(c, s, cmd.supplyId, apply);
    case "assistance": {
      const eligibility = assistanceEligibility(c, s, cmd.packageId);
      if (!eligibility.definition)
        return {
          ...fail("Unknown assistance package"),
          messageKey: "ui.terminal.assistance.result.unknown",
        };
      if (!eligibility.eligible)
        return {
          ...fail(
            eligibility.reason === "obligation-open"
              ? "Make export repayment progress before requesting recovery continuation"
              : "Emergency allocation requires depleted fuel",
          ),
          messageKey:
            eligibility.reason === "obligation-open"
              ? "ui.terminal.assistance.result.obligation-open"
              : "ui.terminal.assistance.result.fuel-not-depleted",
        };
      if (apply) applyAssistance(c, s, cmd.packageId);
      return {
        ...ok("Corporate assistance approved; exports repay the obligation"),
        messageKey: "ui.terminal.assistance.result.approved",
      };
    }
    case "dismantle": {
      {
        const elevated = Object.hasOwn(s.elevatedSolids, cmd.id)
          ? s.elevatedSolids[cmd.id]
          : undefined;
        if (elevated) {
          if (elevated.cargo)
            return fail("Drain elevated gantry contents before dismantling");
          const cost = elevatedSolidCost(c, elevated);
          if (apply) {
            delete s.elevatedSolids[cmd.id];
            change(s.stock, c.site.buildMaterial, cost);
          }
          return ok("Elevated gantry reclaimed", cost);
        }
      }
      {
        const solid = Object.hasOwn(s.undergroundSolids, cmd.id)
            ? s.undergroundSolids[cmd.id]
            : undefined,
          liquid = Object.hasOwn(s.undergroundLiquids, cmd.id)
            ? s.undergroundLiquids[cmd.id]
            : undefined;
        if (solid || liquid) {
          if (solid?.cargo || (liquid?.quantity ?? 0) > 0)
            return fail("Drain underground route contents before dismantling");
          const cost = solid
            ? undergroundSolidCost(c, solid)
            : undergroundLiquidCost(c, liquid!);
          if (apply) {
            if (solid) delete s.undergroundSolids[cmd.id];
            else delete s.undergroundLiquids[cmd.id];
            change(s.stock, c.site.buildMaterial, cost);
          }
          return ok("Underground route reclaimed", cost);
        }
      }
      {
        const pipe = Object.values(s.pressureLines).find(
            (p) => p.id === cmd.id,
          ),
          tank = Object.hasOwn(s.pressureVessels, cmd.id)
            ? s.pressureVessels[cmd.id]
            : undefined,
          pump = Object.hasOwn(s.compressors, cmd.id)
            ? s.compressors[cmd.id]
            : undefined;
        if (pipe || tank || pump) {
          if (pipe?.quantity || tank?.quantity)
            return fail("Drain gas contents before dismantling");
          const kind = pipe ? "line" : tank ? "vessel" : "compressor",
            cost = c.gasLogistics![kind].cost;
          if (apply) {
            if (pipe) delete s.pressureLines[key(pipe)];
            else if (tank) delete s.pressureVessels[cmd.id];
            else delete s.compressors[cmd.id];
            change(s.stock, c.site.buildMaterial, cost);
          }
          return ok("Gas structure reclaimed");
        }
      }

      const pipe = Object.values(s.pipes).find((p) => p.id === cmd.id),
        tank = Object.hasOwn(s.tanks, cmd.id) ? s.tanks[cmd.id] : undefined,
        pump = Object.hasOwn(s.pumps, cmd.id) ? s.pumps[cmd.id] : undefined;
      if (pipe || tank || pump) {
        if (pipe?.quantity || tank?.quantity || pump?.incident?.quantity)
          return fail("Drain liquid contents before dismantling");
        const kind = pipe ? "pipe" : tank ? "tank" : "pump",
          cost = liquidConstructionCost(
            c,
            kind,
            (pipe ?? tank ?? pump)!.containmentProfileId,
          );
        if (apply) {
          if (pipe) delete s.pipes[key(pipe)];
          else if (tank) delete s.tanks[cmd.id];
          else delete s.pumps[cmd.id];
          change(s.stock, c.site.buildMaterial, cost);
        }
        return ok("Liquid structure reclaimed");
      }

      if (Object.hasOwn(s.machines, cmd.id)) {
        const m = s.machines[cmd.id],
          def = c.machines.find((d) => d.id === m.definitionId)!;
        if (m.job)
          return fail("Disable this machine and wait for its batch to finish");
        // Conservative reclaim (Issue #5): buffer contents are real material
        // in a real place. Dismantling must not teleport them across the map,
        // so a buffered machine cannot be reclaimed until its contents leave
        // through belts (output drains; incompatible input needs rerouting).
        if (
          total(m.input) +
            total(m.output) +
            total(m.incidentInventory) >
          0
        )
          return fail(
            "Empty the machine buffers through compatible transport first",
          );
        if (apply) {
          change(s.stock, c.site.buildMaterial, def.cost);
          delete s.machines[cmd.id];
        }
        return ok("Machine reclaimed");
      }
      if (Object.hasOwn(s.factories, cmd.id)) {
        const f = s.factories[cmd.id];
        if (
          [...liquidRects(c, s), ...gasRects(c, s)].some((r) =>
            overlaps(f, r),
          ) ||
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
      if (Object.hasOwn(s.storages, cmd.id)) {
        const t = s.storages[cmd.id],
          def = c.storages.find((d) => d.id === t.definitionId)!;
        if (total(t.inventory) > 0)
          return fail("Empty storage contents before dismantling");
        if (apply) {
          change(s.stock, c.site.buildMaterial, def.cost);
          delete s.storages[cmd.id];
        }
        return ok("Storage reclaimed");
      }
      if (belt) {
        // Belt cargo is real material in a real place: construction plates
        // return to the build reserve, but dismantling must not teleport
        // other cargo across the map, so a loaded belt stays until its cargo
        // moves on. Nothing is deleted.
        if (belt.junction && belt.cargo)
          return {
            ...fail("Empty junction first"),
            messageKey: "ui.junction.loaded",
          };
        if (belt.cargo && belt.cargo !== c.site.buildMaterial)
          return fail("Route the cargo out first");
        if (apply) {
          if (belt.cargo) change(s.stock, belt.cargo, 1);
          change(
            s.stock,
            c.site.buildMaterial,
            c.site.beltCost +
              (c.junctions.find((d) => d.id === belt.junction?.definitionId)
                ?.cost ?? 0),
          );
          delete s.belts[key(belt)];
        }
        return ok("Belt and cargo reclaimed");
      }
      for (const f of Object.values(s.factories)) {
        const p = f.ports.find((p) => p.id === cmd.id);
        if (p) {
          if (
            f.relocation?.requirements.some(
              (requirement) => requirement.portId === p.id,
            )
          )
            return fail("Required relocation port must remain until restart");
          if (
            s.pressureLines[key(p)] ||
            Object.values(s.compressors).some((a) => key(a) === key(p)) ||
            s.pipes[key(p)] ||
            Object.values(s.pumps).some((a) => key(a) === key(p))
          )
            return fail("Remove liquid infrastructure on this port first");
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
