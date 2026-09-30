import { z } from "zod";
import type { Content } from "@site/content";
import {
  emptyFlows,
  experimentEvidenceKey,
  total,
  type ExperimentEvidence,
  type Save,
} from "./types";
import { initializeKnownMarkets, exchangeDefinition } from "./market";
import { machineUnlocked } from "./progression";
import {
  milestoneSatisfied,
  refreshMilestones,
} from "./milestones";
import { assistanceDefinition } from "./assistance";
import {
  factoryError,
  machinePlacement,
  portError,
  beltError,
  storageError,
  wall,
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
  incident: safeId.nullable().default(null),
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
  alternate: z.number().int().min(0).max(3).nullable().default(null),
  switched: z.boolean().default(false),
});
const storage = z.object({
  ...point,
  id: safeId,
  definitionId: safeId,
  direction,
  inventory,
});
const evidence = z.object({
  operationId: safeId,
  inputId: safeId,
  processConditionId: safeId.nullable(),
  state: z.enum(["hinted", "confirmed"]),
});
const schema = z.object({
  schemaVersion: z.union([
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
    z.literal(9),
    z.literal(10),
    z.literal(11),
  ]),
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
  evidence: z.record(z.string().min(1), evidence).default({}),
  deposits: inventory,
  machines: z.record(safeId, machine),
  factories: z.record(safeId, factory),
  belts: z.record(z.string().regex(/^\d+,\d+$/), belt),
  storages: z.record(safeId, storage),
  staging: inventory,
  policies: z.record(safeId, z.enum(["keep", "export"])),
  market: z
    .record(
      safeId,
      z.object({
        demandBps: z.number().int().min(1000).max(20000),
        saturationBps: z.number().int().min(0).max(10000),
      }),
    )
    .default({}),
  opportunities: z
    .record(
      safeId,
      z.object({
        status: z.enum(["offered", "completed", "expired"]),
        offeredAt: count,
        expiresAt: positive,
        progress: count,
        completedAt: count.nullable(),
      }),
    )
    .default({}),
  milestones: z
    .record(
      safeId,
      z.object({
        completedAt: count,
      }),
    )
    .default({}),
  company: z
    .object({
      standing: z.enum(["clear", "recovery"]),
      interventionStreak: count,
      recoveryNetFuel: count,
      recoveryPackageId: safeId.nullable(),
    })
    .default({
      standing: "clear",
      interventionStreak: 0,
      recoveryNetFuel: 0,
      recoveryPackageId: null,
    }),
});
export function initialState(c: Content): Save {
  const state: Save = {
    schemaVersion: 11,
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
    evidence: Object.fromEntries(
      c.reactions
        .filter((r) => r.known)
        .map((r) => {
          const value: ExperimentEvidence = {
            operationId: r.operation,
            inputId: r.input,
            processConditionId: r.processConditionId ?? null,
            state: "confirmed",
          };
          return [
            experimentEvidenceKey(
              value.operationId,
              value.inputId,
              value.processConditionId,
            ),
            value,
          ];
        }),
    ),
    deposits: Object.fromEntries(c.site.deposits.map((d) => [d.id, d.units])),
    machines: {},
    factories: {},
    belts: {},
    storages: {},
    staging: {},
    policies: Object.fromEntries(
      c.materials.filter((m) => m.known).map((m) => [m.id, "keep"]),
    ),
    market: {},
    opportunities: {},
    milestones: {},
    company: {
      standing: "clear",
      interventionStreak: 0,
      recoveryNetFuel: 0,
      recoveryPackageId: null,
    },
  };
  initializeKnownMarkets(c, state);
  return state;
}
export function parseSave(input: unknown, c: Content): Save {
  const s = schema.parse(input);
  // Schema 4 predates belt diverters; every belt was plain, so stamping the
  // defaults is an exact migration rather than a guess.
  if (s.schemaVersion === 4) s.schemaVersion = 5;
  // Schema 5 predates persisted experiment evidence. Confirmed knowledge can
  // migrate exactly from reaction IDs; an undiscovered active processor batch
  // migrates to a hinted attempt without exposing its authored output.
  if (s.schemaVersion === 5) {
    for (const reactionId of s.knowledge) {
      const r = c.reactions.find((r) => r.id === reactionId);
      if (!r) continue;
      const value: ExperimentEvidence = {
        operationId: r.operation,
        inputId: r.input,
        processConditionId: r.processConditionId ?? null,
        state: "confirmed",
      };
      s.evidence[
        experimentEvidenceKey(
          value.operationId,
          value.inputId,
          value.processConditionId,
        )
      ] = value;
    }
    for (const m of Object.values(s.machines)) {
      if (!m.job?.reaction) continue;
      const r = c.reactions.find((r) => r.id === m.job!.reaction);
      if (!r || s.knowledge.includes(r.id)) continue;
      const value: ExperimentEvidence = {
        operationId: r.operation,
        inputId: r.input,
        processConditionId: r.processConditionId ?? null,
        state: "hinted",
      };
      s.evidence[
        experimentEvidenceKey(
          value.operationId,
          value.inputId,
          value.processConditionId,
        )
      ] ??= value;
    }
    s.schemaVersion = 6;
  }
  // Schema 6 predates persisted machine incidents. The parser defaults every
  // existing machine to no incident, which is an exact migration.
  if (s.schemaVersion === 6) s.schemaVersion = 7;
  // Schema 7 predates market memory. No historical demand/saturation state
  // existed, so known listings begin at their authored baseline on migration.
  if (s.schemaVersion === 7) {
    s.schemaVersion = 8;
    initializeKnownMarkets(c, s);
  }
  // Schema 8 predates company opportunities. There was no historical offer,
  // progress, expiry or reward state, so migration starts with empty history.
  if (s.schemaVersion === 8) s.schemaVersion = 9;
  // Schema 9 predates evidence milestones and terminal handling capability
  // state. Existing authoritative evidence remains sufficient to derive any
  // newly satisfied milestone without inventing progress.
  if (s.schemaVersion === 9) s.schemaVersion = 10;
  // Schema 10 predates persisted company standing/intervention state. Existing
  // debt is already authoritative obligation history, so preserve it exactly:
  // an open legacy obligation resumes in recovery standing; a debt-free save
  // starts clear. No fuel, debt or recovery progress is invented.
  if (s.schemaVersion === 10) {
    s.company =
      s.debt > 0
        ? {
            standing: "recovery",
            interventionStreak: 1,
            recoveryNetFuel: 0,
            recoveryPackageId:
              c.economy.defaultAssistancePackageId ?? null,
          }
        : {
            standing: "clear",
            interventionStreak: 0,
            recoveryNetFuel: 0,
            recoveryPackageId: null,
          };
    s.schemaVersion = 11;
  }
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
  const expectedMarkets = c.economy.exchange
    .filter((listing) => known.has(listing.materialId))
    .map((listing) => listing.materialId)
    .sort();
  if (
    Object.keys(s.market).sort().join() !== expectedMarkets.join() ||
    Object.keys(s.market).some((materialId) => !exchangeDefinition(c, materialId))
  )
    throw new Error("Invalid market state");
  for (const [id, state] of Object.entries(s.opportunities)) {
    const order = c.economy.orders.find((entry) => entry.id === id),
      directive = c.economy.directives.find((entry) => entry.id === id),
      definition = order ?? directive;
    if (!definition) throw new Error("Unknown company opportunity");
    const target = order ? order.quantity : 1;
    if (order) {
      if (!known.has(order.materialId) || !Object.hasOwn(s.market, order.materialId))
        throw new Error("Ineligible corporate order state");
    } else if (
      !known.has(directive!.inputMaterialId) ||
      !c.machines.some(
        (machine) =>
          machine.role === "processor" &&
          machine.operations.includes(directive!.operationId) &&
          machine.processConditionId === directive!.processConditionId &&
          machineUnlocked(s, machine),
      )
    )
      throw new Error("Ineligible directive state");
    if (
      state.offeredAt > s.tick ||
      state.expiresAt !== state.offeredAt + definition.durationTicks ||
      state.progress > target ||
      (state.status === "expired" && s.tick < state.expiresAt)
    )
      throw new Error("Invalid company opportunity timing or progress");
    if (state.status === "completed") {
      if (
        state.completedAt === null ||
        state.completedAt < state.offeredAt ||
        state.completedAt >= state.expiresAt ||
        state.completedAt > s.tick ||
        state.progress !== target
      )
        throw new Error("Invalid completed company opportunity");
      if (directive) {
        const evidenceId = experimentEvidenceKey(
          directive.operationId,
          directive.inputMaterialId,
          directive.processConditionId ?? null,
        );
        if (s.evidence[evidenceId]?.state !== "confirmed")
          throw new Error("Directive completion lacks confirmed evidence");
      }
    } else {
      if (state.completedAt !== null)
        throw new Error("Incomplete company opportunity has completion time");
      if (
        (order && state.progress >= target) ||
        (directive && state.progress !== 0)
      )
        throw new Error("Invalid active company opportunity progress");
    }
  }
  if (s.company.standing === "clear") {
    if (
      s.debt !== 0 ||
      s.company.interventionStreak !== 0 ||
      s.company.recoveryNetFuel !== 0 ||
      s.company.recoveryPackageId !== null
    )
      throw new Error("Invalid clear company standing");
  } else {
    const definition = assistanceDefinition(c, s.company.recoveryPackageId);
    if (
      !definition ||
      s.company.interventionStreak < 1 ||
      (c.economy.assistancePackages.length > 0 &&
        s.company.recoveryPackageId === null) ||
      s.company.recoveryNetFuel >= definition.recoveryNetFuel ||
      (s.debt > 0 && s.company.recoveryNetFuel !== 0)
    )
      throw new Error("Invalid recovery company standing");
  }

  for (const [id, state] of Object.entries(s.milestones)) {
    const definition = c.economy.milestones.find((entry) => entry.id === id);
    if (
      !definition ||
      state.completedAt > s.tick ||
      !milestoneSatisfied(c, s, definition)
    )
      throw new Error("Invalid milestone state");
  }
  refreshMilestones(c, s);

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
    if (m.incident) {
      const hazard = c.reactions.find(
        (r) =>
          r.hazard?.id === m.incident &&
          r.operation === m.operation &&
          r.processConditionId === d.processConditionId,
      );
      if (!hazard || m.enabled || m.job)
        throw new Error("Invalid machine incident state");
    }
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
                d.operations.includes(r.operation) &&
                r.processConditionId === d.processConditionId &&
                r.output === material,
            );
      if (!valid) throw new Error("Impossible machine output");
    }
    if (m.job) {
      const r = c.reactions.find((r) => r.id === m.job!.reaction);
      if (
        m.job.remaining > d.durationTicks ||
        (d.role === "extractor"
          ? m.job.reaction !== null
          :
            !r ||
            r.operation !== m.operation ||
            r.processConditionId !== d.processConditionId) ||
        total(m.output) + (r?.outputAmount ?? 1) > d.capacity
      )
        throw new Error("Invalid active batch");
    }
    stage.machines[id] = m;
  }
  for (const [id, entry] of Object.entries(s.evidence)) {
    const expected = experimentEvidenceKey(
      entry.operationId,
      entry.inputId,
      entry.processConditionId,
    );
    if (id !== expected) throw new Error("Invalid experiment evidence ID");
    const reaction = c.reactions.find(
      (r) =>
        r.operation === entry.operationId &&
        r.input === entry.inputId &&
        (r.processConditionId ?? null) === entry.processConditionId,
    );
    if (!reaction) throw new Error("Unknown experiment evidence");
    const confirmed = s.knowledge.includes(reaction.id);
    if ((entry.state === "confirmed") !== confirmed)
      throw new Error("Experiment evidence disagrees with knowledge");
    if (
      entry.state === "hinted" &&
      !Object.values(s.machines).some(
        (m) => m.job?.reaction === reaction.id,
      )
    )
      throw new Error("Hinted evidence has no active experiment");
  }
  for (const reactionId of s.knowledge) {
    const reaction = c.reactions.find((r) => r.id === reactionId)!;
    const id = experimentEvidenceKey(
      reaction.operation,
      reaction.input,
      reaction.processConditionId ?? null,
    );
    if (s.evidence[id]?.state !== "confirmed")
      throw new Error("Confirmed knowledge is missing evidence");
  }
  for (const [location, b] of Object.entries(s.belts)) {
    takeId(b.id, "b");
    if (location !== key(b)) throw new Error("Invalid belt location");
    const error = beltError(c, stage, b, b.direction);
    if (error) throw new Error(error);
    if (b.cargo && !known.has(b.cargo)) throw new Error("Unknown cargo");
    if (b.switched && b.alternate === null)
      throw new Error("Belt switched with no alternate exit");
    if (b.alternate !== null && b.alternate === b.direction)
      throw new Error("Alternate exit must differ");
    if (
      b.alternate !== null &&
      Object.values(stage.factories).some((f) => wall(f, b))
    )
      throw new Error("Alternate exit not allowed on factory walls");
    stage.belts[location] = b;
  }
  for (const [id, t] of Object.entries(s.storages)) {
    takeId(id, "s");
    if (t.id !== id) throw new Error("Mismatched storage ID");
    const def = c.storages.find((d) => d.id === t.definitionId);
    if (!def) throw new Error("Unknown storage type");
    const error = storageError(c, stage, def, t);
    if (error) throw new Error(error);
    if (total(t.inventory) > def.capacity)
      throw new Error("Storage capacity exceeded");
    stage.storages[id] = t;
  }
  if (total(s.staging) > c.site.stagingCapacity)
    throw new Error("Terminal staging capacity exceeded");
  for (const inv of [
    s.stock,
    s.staging,
    ...Object.values(s.flows),
    ...Object.values(s.machines).flatMap((m) => [m.input, m.output]),
    ...Object.values(s.storages).map((t) => t.inventory),
  ])
    if (Object.keys(inv).some((id) => !known.has(id)))
      throw new Error("Unknown inventory material");
  for (const [id, policy] of Object.entries(s.policies))
    if (
      !known.has(id) ||
      (policy === "export" && !exchangeDefinition(c, id))
    )
      throw new Error("Invalid terminal policy");
  return s;
}
