import { z } from "zod";
import type { Content } from "@site/content";
import { checkContainment } from "@site/content";
import { liquidContainment } from "./containment";
import { validatePumpIncident } from "./pump-recovery";
import { validateTerminalModules } from "./terminal";
import {
  emptyFlows,
  experimentEvidenceKey,
  SENSING_DEPTH_BANDS,
  SENSING_SIGNAL_BANDS,
  total,
  type ExperimentEvidence,
  type Save,
} from "./types";
import {
  createSensingObservation,
  sensingCapabilityUnlocked,
  sensingObservationKey,
} from "./sensing";
import { initializeKnownMarkets, exchangeDefinition } from "./market";
import { machineUnlocked } from "./progression";
import { hazardDefinition } from "./hazards";
import { milestoneSatisfied, refreshMilestones } from "./milestones";
import { assistanceDefinition } from "./assistance";
import { depositDefinition, hiddenDepositDefinition } from "./deposits";
import {
  atmosphericSourceDefinition,
  atmosphericSourceForRect,
} from "./atmosphere";
import {
  factoryError,
  machinePlacement,
  portError,
  beltError,
  storageError,
  wall,
  key,
  gasPlacementError,
  liquidPlacementError,
  footprint,
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
  incidentInventory: inventory.default({}),
  input: inventory,
  output: inventory,
  job: z
    .object({ remaining: positive, reaction: safeId.nullable() })
    .nullable(),
});
const belt = z.object({
  junction: z
    .object({
      definitionId: safeId,
      branch: z.union([z.literal(1), z.literal(-1)]),
      cursor: z.union([z.literal(0), z.literal(1)]),
      crossing: z
        .object({
          axis: z.union([z.literal(0), z.literal(1)]),
          remaining: count,
          pending: z.union([z.literal(0), z.literal(1)]).nullable(),
          held: z.union([z.literal(0), z.literal(1)]).nullable(),
        })
        .strict()
        .optional(),
    })
    .strict()
    .nullable()
    .optional(),
  ...point,
  id: safeId,
  direction,
  cargo: safeId.nullable(),
  alternate: z.number().int().min(0).max(3).nullable().default(null),
  switched: z.boolean().default(false),
});
const liquidContents = { materialId: safeId.nullable(), quantity: count };
const pipe = z.object({
  ...point,
  ...liquidContents,
  id: safeId,
  inlet: direction,
  outlet: direction,
});
const tank = z.object({ ...point, ...liquidContents, id: safeId, direction });
const pump = z.object({
  ...point,
  id: safeId,
  direction,
  enabled: z.boolean(),
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
    z.literal(12),
    z.literal(13),
    z.literal(14),
    z.literal(15),
    z.literal(16),
    z.literal(17),
    z.literal(18),
    z.literal(19),
    z.literal(20),
    z.literal(21),
  ]),
  contentVersion: z.string(),
  terminalModules: z
    .record(
      safeId,
      z.object({ materialId: safeId.nullable(), quantity: count }).strict(),
    )
    .optional(),
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
  hazardEvidence: z.array(safeId).default([]),
  sensingObservations: z
    .record(
      z.string().min(1),
      z
        .object({
          capabilityId: safeId,
          mode: z.enum(["scan", "probe"]),
          x: count,
          y: count,
          observedAtTick: count,
          signalBand: z.enum(SENSING_SIGNAL_BANDS),
          depthBand: z.enum(SENSING_DEPTH_BANDS),
        })
        .strict(),
    )
    .default({}),
  discoveredDeposits: z.array(safeId).default([]),
  deposits: inventory,
  atmosphericSources: inventory.default({}),
  machines: z.record(safeId, machine),
  factories: z.record(safeId, factory),
  belts: z.record(z.string().regex(/^\d+,\d+$/), belt),
  storages: z.record(safeId, storage),
  pressureLines: z.record(z.string().regex(/^\d+,\d+$/), pipe).default({}),
  pressureVessels: z.record(safeId, tank).default({}),
  compressors: z.record(safeId, pump).default({}),
  pipes: z
    .record(
      z.string().regex(/^\d+,\d+$/),
      pipe.extend({ containmentProfileId: safeId.default("standard") }),
    )
    .default({}),
  tanks: z
    .record(
      safeId,
      tank.extend({ containmentProfileId: safeId.default("standard") }),
    )
    .default({}),
  pumps: z
    .record(
      safeId,
      pump
        .extend({
          containmentProfileId: safeId.default("standard"),
          incident: z
            .object({
              definitionId: safeId,
              materialId: safeId,
              quantity: count,
              startedAt: count,
              drainEnabled: z.boolean(),
            })
            .strict()
            .nullable()
            .default(null),
        })
        .strict(),
    )
    .default({}),
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
      repaidSinceAssistanceFuel: count.default(0),
    })
    .default({
      standing: "clear",
      interventionStreak: 0,
      recoveryNetFuel: 0,
      recoveryPackageId: null,
      repaidSinceAssistanceFuel: 0,
    }),
});
export function initialState(c: Content): Save {
  const state: Save = {
    schemaVersion: 21,
    terminalModules: {},
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
    hazardEvidence: [],
    sensingObservations: {},
    discoveredDeposits: [],
    // Hidden deposits are deliberately absent until discovery so raw saves do
    // not leak source identity before the player earns that knowledge.
    deposits: Object.fromEntries(c.site.deposits.map((d) => [d.id, d.units])),
    // Hidden atmospheric source IDs remain absent until a qualifying probe.
    atmosphericSources: {},
    machines: {},
    factories: {},
    belts: {},
    pressureLines: {},
    pressureVessels: {},
    compressors: {},
    pipes: {},
    tanks: {},
    pumps: {},
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
      repaidSinceAssistanceFuel: 0,
    },
  };
  initializeKnownMarkets(c, state);
  return state;
}
export function parseSave(input: unknown, c: Content): Save {
  const parsed = schema.parse(input);
  if (parsed.schemaVersion < 18 && c.liquidLogistics?.pump.containmentFailure)
    throw Error("Incompatible pump recovery save schema");
  if (
    parsed.schemaVersion < 18 &&
    Object.values(parsed.pumps).some((p) => p.incident)
  )
    throw Error("Legacy schema cannot contain pump incidents");
  if (parsed.schemaVersion >= 18) {
    const raw = input as { pumps?: Record<string, unknown> };
    if (
      Object.values(raw.pumps ?? {}).some(
        (p) =>
          !p ||
          typeof p !== "object" ||
          !Object.hasOwn(p, "incident") ||
          !Object.hasOwn(p, "containmentProfileId"),
      )
    )
      throw Error("Missing pump incident state");
  }
  if (
    parsed.schemaVersion < 17 &&
    (c.version === "world-01-v10" || c.site.terminalModules.length)
  )
    throw Error("Incompatible terminal save schema");
  if (parsed.schemaVersion >= 17 && !parsed.terminalModules)
    throw Error("Missing terminal module state");
  if (
    parsed.schemaVersion < 17 &&
    Object.keys(parsed.terminalModules ?? {}).length
  )
    throw Error("Legacy schema cannot contain terminal modules");
  const s = { ...parsed, terminalModules: parsed.terminalModules ?? {} };
  if (
    s.schemaVersion < 15 &&
    [s.pressureLines, s.pressureVessels, s.compressors].some(
      (r) => Object.keys(r).length,
    )
  )
    throw new Error("Legacy schema cannot contain gas locations");
  if (
    s.schemaVersion < 14 &&
    [s.pipes, s.tanks, s.pumps].some((r) => Object.keys(r).length)
  )
    throw new Error("Legacy schema cannot contain liquid locations");
  if (s.schemaVersion < 12 && Object.values(s.belts).some((b) => b.junction))
    throw new Error("Legacy save contains junction state");
  if (
    s.schemaVersion < 13 &&
    Object.values(s.belts).some(
      (b) =>
        b.junction?.crossing ||
        c.junctions.find((d) => d.id === b.junction?.definitionId)?.kind ===
          "crossing",
    )
  )
    throw new Error("Legacy save contains crossing state");
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
            recoveryPackageId: c.economy.defaultAssistancePackageId ?? null,
            repaidSinceAssistanceFuel: 0,
          }
        : {
            standing: "clear",
            interventionStreak: 0,
            recoveryNetFuel: 0,
            recoveryPackageId: null,
            repaidSinceAssistanceFuel: 0,
          };
    s.schemaVersion = 11;
  }
  if (s.schemaVersion === 11) s.schemaVersion = 12;
  if (s.schemaVersion === 12) s.schemaVersion = 13;
  if (s.schemaVersion === 13) s.schemaVersion = 14;
  if (s.schemaVersion === 14) s.schemaVersion = 15;
  if (s.schemaVersion === 15) s.schemaVersion = 16;
  if (s.schemaVersion === 16) s.schemaVersion = 17;
  if (s.schemaVersion === 17) s.schemaVersion = 18;
  // Schema 18 predates persisted sensing observations. No sensing knowledge
  // existed, so the exact migration is an empty observation record.
  if (s.schemaVersion === 18) s.schemaVersion = 19;
  if (s.schemaVersion === 19) s.schemaVersion = 20;
  // Schema 20 predates identified atmospheric source inventory. No source ID
  // can be inferred from historical sensing alone, so migration stays empty.
  if (s.schemaVersion === 20) s.schemaVersion = 21;
  if (s.contentVersion !== c.version || s.remainder >= c.tickMs)
    throw new Error("Incompatible content or timing");
  if (
    new Set(s.knowledge).size !== s.knowledge.length ||
    s.knowledge.some((id) => !c.reactions.some((r) => r.id === id)) ||
    c.reactions.some((r) => r.known && !s.knowledge.includes(r.id))
  )
    throw new Error("Invalid knowledge");
  if (
    new Set(s.hazardEvidence).size !== s.hazardEvidence.length ||
    s.hazardEvidence.some((hazardId) => {
      const hazard = hazardDefinition(c, hazardId);
      return !hazard || !s.knowledge.includes(hazard.reaction.id);
    })
  )
    throw new Error("Invalid hazard evidence");

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
    Object.keys(s.market).some(
      (materialId) => !exchangeDefinition(c, materialId),
    )
  )
    throw new Error("Invalid market state");
  for (const [id, state] of Object.entries(s.opportunities)) {
    const order = c.economy.orders.find((entry) => entry.id === id),
      directive = c.economy.directives.find((entry) => entry.id === id),
      definition = order ?? directive;
    if (!definition) throw new Error("Unknown company opportunity");
    const target = order ? order.quantity : 1;
    if (order) {
      if (
        !known.has(order.materialId) ||
        !Object.hasOwn(s.market, order.materialId)
      )
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
      s.company.recoveryPackageId !== null ||
      s.company.repaidSinceAssistanceFuel !== 0
    )
      throw new Error("Invalid clear company standing");
  } else {
    const definition = assistanceDefinition(c, s.company.recoveryPackageId);
    if (
      !definition ||
      s.company.interventionStreak < 1 ||
      (c.economy.assistancePackages.length > 0 &&
        s.company.recoveryPackageId === null) ||
      s.company.recoveryNetFuel >= definition.recoveryNetFuel
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

  for (const [key, observation] of Object.entries(s.sensingObservations)) {
    const capability = c.site.sensingCapabilities.find(
      (entry) => entry.id === observation.capabilityId,
    );
    if (
      !capability ||
      capability.mode !== observation.mode ||
      !sensingCapabilityUnlocked(s, capability) ||
      observation.observedAtTick > s.tick ||
      sensingObservationKey(observation.capabilityId, observation.x, observation.y) !==
        key
    )
      throw new Error("Invalid sensing observation");
    const expected = createSensingObservation(
      c,
      capability,
      observation.x,
      observation.y,
      observation.observedAtTick,
    );
    if (
      expected.capabilityId !== observation.capabilityId ||
      expected.mode !== observation.mode ||
      expected.x !== observation.x ||
      expected.y !== observation.y ||
      expected.observedAtTick !== observation.observedAtTick ||
      expected.signalBand !== observation.signalBand ||
      expected.depthBand !== observation.depthBand
    )
      throw new Error("Invalid sensing observation");
  }

  const discovered = new Set<string>();
  for (const id of s.discoveredDeposits) {
    if (discovered.has(id)) throw new Error("Duplicate discovered deposit");
    discovered.add(id);
    const deposit = hiddenDepositDefinition(c, id);
    if (!deposit) throw new Error("Unknown discovered deposit");
    const signal = c.site.surveySignals.find(
      (entry) => entry.id === deposit.surveySignalId,
    )!;
    const observation =
      s.sensingObservations[
        sensingObservationKey(
          deposit.requiredSensingCapabilityId,
          signal.x,
          signal.y,
        )
      ];
    if (
      !observation ||
      observation.mode !== "probe" ||
      observation.signalBand === "none"
    )
      throw new Error("Discovered deposit lacks probe evidence");
  }

  for (const [id, units] of Object.entries(s.atmosphericSources)) {
    const source = atmosphericSourceDefinition(c, id);
    if (!source || units > source.units)
      throw new Error("Invalid atmospheric source state");
    const signal = c.site.surveySignals.find(
      (entry) => entry.id === source.surveySignalId,
    )!;
    const observation =
      s.sensingObservations[
        sensingObservationKey(
          source.requiredSensingCapabilityId,
          signal.x,
          signal.y,
        )
      ];
    if (
      !observation ||
      observation.mode !== "probe" ||
      observation.signalBand === "none"
    )
      throw new Error("Atmospheric source lacks probe evidence");
  }

  validateTerminalModules(c, s, known);

  const expectedDepositIds = [
    ...c.site.deposits.map((deposit) => deposit.id),
    ...s.discoveredDeposits,
  ].sort();
  if (
    Object.keys(s.deposits).sort().join() !== expectedDepositIds.join() ||
    Object.entries(s.deposits).some(([id, units]) => {
      const definition = depositDefinition(c, id);
      return !definition || units > definition.units;
    })
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
  stage.discoveredDeposits = [...s.discoveredDeposits];
  stage.atmosphericSources = { ...s.atmosphericSources };
  for (const depositId of s.discoveredDeposits)
    stage.deposits[depositId] = s.deposits[depositId];
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
    if (!machineUnlocked(s, d))
      throw new Error("Machine locked by unconfirmed knowledge");
    if (m.incident) {
      const hazard = hazardDefinition(c, m.incident);
      if (
        !hazard ||
        hazard.reaction.operation !== m.operation ||
        hazard.reaction.processConditionId !== d.processConditionId ||
        m.enabled ||
        m.job
      )
        throw new Error("Invalid machine incident state");
      if (
        Object.keys(m.incidentInventory).some(
          (materialId) => materialId !== hazard.reaction.output,
        ) ||
        total(m.incidentInventory) !==
          hazard.classDefinition.strandedOutputUnits
      )
        throw new Error("Invalid machine hazard inventory");
    } else if (total(m.incidentInventory) > 0)
      throw new Error("Hazard inventory requires an incident");
    if (
      d.role === "processor"
        ? !m.operation || !d.operations.includes(m.operation)
        : m.operation !== null
    )
      throw new Error("Invalid operation");
    for (const [inv, states] of [
      [m.input, d.inputStates],
      [m.output, d.outputStates],
    ] as const)
      if (
        Object.entries(inv).some(
          ([id, n]) =>
            n > 0 &&
            !states.includes(
              c.materials.find((a) => a.id === id)?.handlingState ?? "solid",
            ),
        )
      )
        throw new Error("Machine handling state mismatch");
    if (total(m.input) > d.capacity || total(m.output) > d.capacity)
      throw new Error("Capacity exceeded");
    if (d.role === "extractor" && total(m.input))
      throw new Error("Extractor cannot contain inputs");
    for (const material of Object.keys(m.output)) {
      const valid =
        d.role === "extractor"
          ? (d.sourceKind === "atmosphere"
              ? atmosphericSourceForRect(c, s, footprint(m, d))?.material
              : depositDefinition(c, m.depositId)?.material) === material
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
          : !r ||
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
      !Object.values(s.machines).some((m) => m.job?.reaction === reaction.id)
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
    if (
      b.cargo &&
      c.materials.find((m) => m.id === b.cargo)?.handlingState !== "solid"
    )
      throw new Error("Belt handling state mismatch");
    if (b.switched && b.alternate === null)
      throw new Error("Belt switched with no alternate exit");
    if (b.alternate !== null && b.alternate === b.direction)
      throw new Error("Alternate exit must differ");
    if (
      b.alternate !== null &&
      Object.values(stage.factories).some((f) => wall(f, b))
    )
      throw new Error("Alternate exit not allowed on factory walls");
    if (b.junction) {
      const definition = c.junctions.find(
        (d) => d.id === b.junction!.definitionId,
      );
      if (!definition) throw new Error("Unknown junction definition");
      const signal = b.junction.crossing;
      if (definition.kind === "crossing") {
        if (
          !signal ||
          b.junction.cursor !== 0 ||
          signal.remaining > definition.windowSteps! ||
          (signal.pending === null
            ? signal.remaining === 0
            : signal.remaining !== 0 || signal.pending === signal.axis) ||
          (b.cargo === null
            ? signal.held !== null
            : signal.held !== signal.axis)
        )
          throw new Error("Impossible crossing phase or held route");
      } else if (signal) throw new Error("Crossing state on T junction");
      if (
        b.alternate !== null ||
        b.switched ||
        Object.values(stage.factories).some((f) => wall(f, b))
      )
        throw new Error("Invalid junction topology");
    }
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
  for (const [kind, records] of [
    ["pipe", s.pipes],
    ["tank", s.tanks],
    ["pump", s.pumps],
  ] as const) {
    for (const [location, entity] of Object.entries(records)) {
      if (!c.liquidLogistics)
        throw new Error("Liquid infrastructure is not authored");
      takeId(entity.id, kind === "pipe" ? "l" : kind === "tank" ? "t" : "u");
      if ((kind === "pipe" ? key(entity) : entity.id) !== location)
        throw new Error("Invalid liquid location or ID");
      if (
        !c.liquidLogistics.containmentProfiles.some(
          (p) => p.id === entity.containmentProfileId,
        )
      )
        throw Error("Unknown liquid containment profile");
      const error = liquidPlacementError(c, stage, entity, kind);
      if (error) throw new Error(error);
      if (kind === "pipe") {
        const item = s.pipes[location];
        if (item.inlet === item.outlet)
          throw new Error("Pipe inlet and outlet coincide");
        stage.pipes[location] = item;
      } else if (kind === "tank") stage.tanks[location] = s.tanks[location];
      else {
        validatePumpIncident(c, s.pumps[location], s.tick, known);
        stage.pumps[location] = s.pumps[location];
      }
      if ("quantity" in entity) {
        const cap =
          kind === "pipe"
            ? c.liquidLogistics.pipe.capacity
            : c.liquidLogistics.tank.capacity;
        if (
          entity.quantity > cap ||
          (entity.quantity === 0) !== (entity.materialId === null) ||
          (entity.materialId !== null &&
            (!known.has(entity.materialId) ||
              c.materials.find((m) => m.id === entity.materialId)
                ?.handlingState !== "liquid"))
        )
          throw new Error("Invalid liquid quantity or identity");
      }
    }
  }
  for (const [kind, records] of [
    ["line", s.pressureLines],
    ["vessel", s.pressureVessels],
    ["compressor", s.compressors],
  ] as const) {
    for (const [location, entity] of Object.entries(records)) {
      if (!c.gasLogistics)
        throw new Error("Gas infrastructure is not authored");
      takeId(entity.id, kind === "line" ? "g" : kind === "vessel" ? "v" : "c");
      if ((kind === "line" ? key(entity) : entity.id) !== location)
        throw new Error("Invalid gas location or ID");
      const error = gasPlacementError(c, stage, entity, kind);
      if (error) throw new Error(error);
      if (kind === "line") {
        const item = s.pressureLines[location];
        if (item.inlet === item.outlet)
          throw new Error("Pressure line inlet and outlet coincide");
        stage.pressureLines[location] = item;
      } else if (kind === "vessel")
        stage.pressureVessels[location] = s.pressureVessels[location];
      else stage.compressors[location] = s.compressors[location];
      if ("quantity" in entity) {
        const cap =
          kind === "line"
            ? c.gasLogistics.line.capacity
            : c.gasLogistics.vessel.capacity;
        if (
          entity.quantity > cap ||
          (entity.quantity === 0) !== (entity.materialId === null) ||
          (entity.materialId !== null &&
            (!known.has(entity.materialId) ||
              c.materials.find((m) => m.id === entity.materialId)
                ?.handlingState !== "gas"))
        )
          throw new Error("Invalid gas quantity or identity");
      }
    }
  }
  for (const inv of [
    s.stock,
    s.staging,
    ...Object.values(s.storages).map((t) => t.inventory),
  ])
    if (
      Object.entries(inv).some(
        ([id, n]) =>
          n > 0 &&
          c.materials.find((m) => m.id === id)?.handlingState !== "solid",
      )
    )
      throw new Error("Dry inventory handling state mismatch");
  const protect = (
    inv: Record<string, number>,
    states: ("solid" | "liquid" | "gas")[],
    caps: string[],
  ) => {
    for (const [id, n] of Object.entries(inv))
      if (n > 0 && !checkContainment(c, id, states, caps).ok)
        throw Error("Inventory containment mismatch");
  };
  protect(s.stock, ["solid"], c.site.dryContainment);
  protect(s.staging, ["solid"], c.site.dryContainment);
  for (const t of Object.values(s.storages))
    protect(
      t.inventory,
      ["solid"],
      c.storages.find((d) => d.id === t.definitionId)!.containmentCapabilities,
    );
  for (const b of Object.values(s.belts))
    if (b.cargo) protect({ [b.cargo]: 1 }, ["solid"], c.site.beltContainment);
  for (const m of Object.values(s.machines)) {
    const d = c.machines.find((d) => d.id === m.definitionId)!;
    protect(m.input, d.inputStates, d.inputContainment);
    protect(m.output, d.outputStates, d.outputContainment);
    const r = c.reactions.find((r) => r.id === m.job?.reaction);
    if (r) {
      protect({ [r.input]: r.inputAmount }, d.inputStates, d.inputContainment);
      protect(
        { [r.output]: r.outputAmount },
        d.outputStates,
        d.outputContainment,
      );
    }
  }
  for (const [kind, records] of [
    ["pipe", s.pipes],
    ["tank", s.tanks],
  ] as const)
    for (const t of Object.values(records))
      if (t.materialId)
        protect(
          { [t.materialId]: t.quantity },
          ["liquid"],
          liquidContainment(c, kind, t.containmentProfileId),
        );
  for (const [kind, records] of [
    ["line", s.pressureLines],
    ["vessel", s.pressureVessels],
  ] as const)
    for (const t of Object.values(records))
      if (t.materialId)
        protect(
          { [t.materialId]: t.quantity },
          ["gas"],
          c.gasLogistics![kind].containmentCapabilities,
        );
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
    if (!known.has(id) || (policy === "export" && !exchangeDefinition(c, id)))
      throw new Error("Invalid terminal policy");
  return s;
}
