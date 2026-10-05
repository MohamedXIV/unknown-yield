import { checkContainment } from "./containment";
import { z } from "zod";
import { enCatalog, localeKeySchema, validateLocaleCoverage } from "./locale";
const id = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/)
  .refine((v) => !["constructor", "prototype", "tostring"].includes(v));
const capabilities = z.array(id).default([]);
const positive = z.number().int().positive().max(1000000);
const count = z.number().int().nonnegative().max(1000000);
const pos = z.number().int().nonnegative();
export const standardContainmentProfile = {
  id: "standard",
  nameKey: "containment.profile.standard.name",
  capabilities: [],
  additionalCost: { pipe: 0, tank: 0, pump: 0 },
};
export const contentSchema = z.object({
  version: z.string().min(1),
  tickMs: z.number().int().min(20).max(1000),
  containmentCapabilities: z
    .array(z.object({ id, nameKey: localeKeySchema }))
    .default([]),
  hazardClasses: z
    .array(
      z.object({
        id,
        nameKey: localeKeySchema,
        evidenceKey: localeKeySchema,
        machineEffect: z.literal("lockout"),
        strandedOutputUnits: count.default(0),
      }),
    )
    .default([]),
  materials: z
    .array(
      z.object({
        id,
        nameKey: localeKeySchema,
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        handlingState: z.enum(["solid", "liquid", "gas"]).default("solid"),
        requiredContainment: capabilities,
        known: z.boolean(),
      }),
    )
    .min(1),
  operations: z.array(z.object({ id, nameKey: localeKeySchema })).min(1),
  machines: z
    .array(
      z.object({
        id,
        nameKey: localeKeySchema,
        role: z.enum(["extractor", "processor"]),
        maxExtractionDepth: count.default(0),
        sourceKind: z.enum(["atmosphere"]).optional(),
        processConditionId: id.optional(),
        unlock: z
          .union([
            z.object({
              reactionId: id,
              hintKey: localeKeySchema,
            }),
            z.object({
              hazardEvidenceId: id,
              hintKey: localeKeySchema,
            }),
          ])
          .optional(),
        inputContainment: capabilities,
        outputContainment: capabilities,
        inputStates: z
          .array(z.enum(["solid", "liquid", "gas"]))
          .min(1)
          .default(["solid"]),
        outputStates: z
          .array(z.enum(["solid", "liquid", "gas"]))
          .min(1)
          .default(["solid"]),
        operations: z.array(id),
        capacity: positive,
        fuel: positive,
        durationTicks: positive,
        width: positive,
        height: positive,
        cost: positive,
      }),
    )
    .min(1),
  gasLogistics: z
    .object({
      line: z.object({
        containmentCapabilities: capabilities,
        capacity: positive,
        transfer: positive,
        cost: positive,
      }),
      vessel: z.object({
        containmentCapabilities: capabilities,
        capacity: positive,
        width: positive,
        height: positive,
        cost: positive,
      }),
      compressor: z.object({
        containmentCapabilities: capabilities,
        transfer: positive,
        fuel: positive,
        cost: positive,
      }),
    })
    .optional(),
  liquidLogistics: z
    .object({
      pipe: z.object({
        containmentCapabilities: capabilities,
        capacity: positive,
        transfer: positive,
        cost: positive,
      }),
      tank: z.object({
        containmentCapabilities: capabilities,
        capacity: positive,
        width: positive,
        height: positive,
        cost: positive,
      }),
      pump: z.object({
        containmentCapabilities: capabilities,
        transfer: positive,
        fuel: positive,
        cost: positive,
        containmentFailure: z.object({
          id, nameKey: localeKeySchema, descriptionKey: localeKeySchema,
          exposedProfileId: id, missingCapabilityId: id, trappedCapacity: positive,
        }).optional(),
      }),
      containmentProfiles: z
        .array(
          z.object({
            id,
            nameKey: localeKeySchema,
            capabilities,
            additionalCost: z.object({ pipe: count, tank: count, pump: count }),
          }),
        )
        .default([standardContainmentProfile]),
    })
    .optional(),
  storages: z
    .array(
      z.object({
        id,
        nameKey: localeKeySchema,
        containmentCapabilities: capabilities,
        capacity: positive,
        width: positive,
        height: positive,
        cost: positive,
      }),
    )
    .min(1),
  junctions: z
    .array(
      z
        .object({
          id,
          kind: z.enum(["splitter", "merger", "crossing"]),
          nameKey: localeKeySchema,
          cost: positive,
          windowSteps: positive.optional(),
        })
        .refine(
          (d) =>
            d.kind === "crossing"
              ? d.windowSteps !== undefined
              : d.windowSteps === undefined,
          "Only crossings require a positive transport-step window",
        ),
    )
    .default([]),
  reactions: z
    .array(
      z.object({
        id,
        operation: id,
        processConditionId: id.optional(),
        input: id,
        inputAmount: positive,
        output: id,
        outputAmount: positive,
        observationKey: localeKeySchema,
        hazard: z
          .object({
            id,
            classId: id,
            nameKey: localeKeySchema,
            observationKey: localeKeySchema,
            saferHintKey: localeKeySchema,
          })
          .optional(),
        known: z.boolean(),
      }),
    )
    .min(1),
  site: z.object({
    sensingCapabilities: z
      .array(
        z.object({
          id,
          nameKey: localeKeySchema,
          mode: z.enum(["scan", "probe"]),
          range: positive,
          requiredMilestoneId: id.optional(),
        }),
      )
      .default([]),
    surveySignals: z
      .array(
        z.object({
          id,
          x: pos,
          y: pos,
          strength: positive,
          depth: positive,
        }),
      )
      .default([]),
    hiddenDeposits: z
      .array(
        z.object({
          id,
          material: id,
          x: pos,
          y: pos,
          width: positive,
          height: positive,
          units: positive,
          surveySignalId: id,
          requiredSensingCapabilityId: id,
        }),
      )
      .default([]),
    atmosphericSources: z
      .array(
        z.object({
          id,
          nameKey: localeKeySchema,
          material: id,
          x: pos,
          y: pos,
          width: positive,
          height: positive,
          units: positive,
          surveySignalId: id,
          requiredSensingCapabilityId: id,
        }),
      )
      .default([]),
    terminalModules: z.array(z.object({
      id, nameKey: localeKeySchema,
      handlingState: z.enum(["liquid", "gas"]),
      containmentCapabilities: capabilities,
      capacity: positive, cost: positive,
      requiredTerminalCapabilityId: id,
      inlet: z.object({ x: pos, y: pos, side: z.number().int().min(0).max(3) }),
    })).default([]),
    beltContainment: capabilities,
    dryContainment: capabilities,
    width: positive,
    height: positive,
    buildMaterial: id,
    startStock: positive,
    factoryMin: positive,
    factoryMax: positive,
    factoryCellCost: positive,
    beltCost: positive,
    portCost: positive,
    transportEveryTicks: positive,
    stagingCapacity: positive,
    terminal: z.object({ x: pos, y: pos, width: positive, height: positive }),
    deposits: z
      .array(
        z.object({
          id,
          material: id,
          x: pos,
          y: pos,
          width: positive,
          height: positive,
          units: positive,
        }),
      )
      .min(1),
  }),
  economy: z.object({
    startFuel: count,
    grant: positive,
    assistanceBelow: positive,
    milestoneExports: positive,
    marketEveryTicks: positive,
    defaultAssistancePackageId: id.optional(),
    assistancePackages: z
      .array(
        z.object({
          id,
          nameKey: localeKeySchema,
          briefKey: localeKeySchema,
          fuelBelow: positive,
          grantFuel: positive,
          baseObligationFuel: positive,
          repeatObligationStepFuel: count,
          continuationObligationFuel: positive,
          recoveryNetFuel: positive,
        }),
      )
      .default([]),
    exchange: z
      .array(
        z.object({
          materialId: id,
          baseCompensation: positive,
          floorCompensation: positive,
          baseDemandBps: z.number().int().min(1000).max(20000),
          saturationPerUnitBps: z.number().int().positive().max(10000),
          recoveryPerMarketTickBps: z.number().int().positive().max(10000),
          requiredTerminalCapabilityId: id.optional(),
        }),
      )
      .min(1),
    orders: z
      .array(
        z.object({
          id,
          nameKey: localeKeySchema,
          briefKey: localeKeySchema,
          materialId: id,
          quantity: positive,
          durationTicks: positive,
          rewardFuel: positive,
        }),
      )
      .default([]),
    directives: z
      .array(
        z.object({
          id,
          nameKey: localeKeySchema,
          briefKey: localeKeySchema,
          operationId: id,
          inputMaterialId: id,
          processConditionId: id.optional(),
          durationTicks: positive,
          rewardFuel: positive,
        }),
      )
      .default([]),
    terminalCapabilities: z
      .array(
        z.object({
          id,
          nameKey: localeKeySchema,
        }),
      )
      .default([]),
    milestones: z
      .array(
        z.object({
          id,
          nameKey: localeKeySchema,
          hintKey: localeKeySchema,
          requires: z
            .array(
              z.discriminatedUnion("type", [
                z.object({
                  type: z.literal("reaction-confirmed"),
                  reactionId: id,
                }),
                z.object({
                  type: z.literal("material-exported"),
                  materialId: id,
                  units: positive,
                }),
                z.object({
                  type: z.literal("order-completed"),
                  orderId: id,
                }),
                z.object({
                  type: z.literal("directive-completed"),
                  directiveId: id,
                }),
                z.object({
                  type: z.literal("milestone-completed"),
                  milestoneId: id,
                }),
                z.object({
                  type: z.literal("terminal-capability"),
                  capabilityId: id,
                }),
              ]),
            )
            .min(1),
          unlockTerminalCapabilityIds: z.array(id).default([]),
        }),
      )
      .default([]),
  }),
});
export type Content = z.infer<typeof contentSchema>;
export type MachineDefinition = Content["machines"][number];
export type StorageDefinition = Content["storages"][number];
function validateContentInternal(
  input: unknown,
  catalog: Record<string, string> | null,
): Content {
  const c = contentSchema.parse(input);
  for (const table of [
    c.containmentCapabilities,
    c.hazardClasses,
    c.materials,
    c.operations,
    c.machines,
    c.storages,
    c.junctions,
    c.reactions,
    c.site.deposits,
    c.site.hiddenDeposits,
    c.site.atmosphericSources,
  ])
    if (new Set(table.map((r) => r.id)).size !== table.length)
      throw new Error("Duplicate content ID");
  if (
    new Set(
      [...c.site.deposits, ...c.site.hiddenDeposits].map((deposit) => deposit.id),
    ).size !==
    c.site.deposits.length + c.site.hiddenDeposits.length
  )
    throw new Error("Duplicate deposit ID");
  validateContainmentDefinitions(c);
  const materials = new Set(c.materials.map((m) => m.id)),
    operations = new Set(c.operations.map((o) => o.id));
  if (!c.materials.find((m) => m.id === c.site.buildMaterial)?.known)
    throw new Error("Construction material must be initially known");
  if (c.site.factoryMin < 4 || c.site.factoryMax < c.site.factoryMin)
    throw new Error("Invalid factory size");
  const hazardClassIds = new Set(c.hazardClasses.map((entry) => entry.id));
  for (const hazardClass of c.hazardClasses)
    if (
      hazardClass.nameKey !== "hazard.class." + hazardClass.id + ".name" ||
      hazardClass.evidenceKey !==
        "hazard.class." + hazardClass.id + ".evidence"
    )
      throw new Error("Localization key must match its hazard class");

  const matches = new Set<string>(),
    hazardIds = new Set<string>();
  for (const r of c.reactions) {
    if (
      !materials.has(r.input) ||
      !materials.has(r.output) ||
      !operations.has(r.operation)
    )
      throw new Error("Missing reaction reference");
    const key =
      r.operation + "/" + r.input + "/" + (r.processConditionId ?? "");
    if (matches.has(key)) throw new Error("Ambiguous reaction");
    matches.add(key);
    if (r.hazard) {
      if (!r.processConditionId)
        throw new Error("Hazard requires an explicit process condition");
      if (!hazardClassIds.has(r.hazard.classId))
        throw new Error("Missing hazard class");
      const hazardClass = c.hazardClasses.find(
        (entry) => entry.id === r.hazard!.classId,
      )!;
      if (hazardClass.strandedOutputUnits > r.outputAmount)
        throw new Error("Hazard consequence exceeds reaction output");
      if (hazardIds.has(r.hazard.id)) throw new Error("Duplicate hazard ID");
      hazardIds.add(r.hazard.id);
      if (
        r.hazard.nameKey !== "hazard." + r.hazard.id + ".name" ||
        r.hazard.observationKey !== "hazard." + r.hazard.id + ".observation" ||
        r.hazard.saferHintKey !== "hazard." + r.hazard.id + ".safer-hint"
      )
        throw new Error("Localization key must match its hazard");
    }
    const capable = c.machines.filter(
      (m) =>
        m.role === "processor" &&
        m.operations.includes(r.operation) &&
        m.processConditionId === r.processConditionId,
    );
    const inputState = c.materials.find((m) => m.id === r.input)!.handlingState;
    const outputState = c.materials.find(
      (m) => m.id === r.output,
    )!.handlingState;
    if (
      capable.some(
        (m) =>
          !m.inputStates.includes(inputState) ||
          !m.outputStates.includes(outputState),
      )
    )
      throw new Error("Reaction handling state mismatches machine interface");
    if (
      capable.some(
        (m) =>
          !checkContainment(c, r.input, m.inputStates, m.inputContainment).ok ||
          !checkContainment(c, r.output, m.outputStates, m.outputContainment)
            .ok,
      )
    )
      throw new Error("Reaction containment mismatches machine interface");
    if (!capable.length)
      throw new Error("Missing process condition capability");
    if (
      capable.some((m) => m.capacity < Math.max(r.inputAmount, r.outputAmount))
    )
      throw new Error("Reaction exceeds machine capacity");
    if (
      r.known &&
      (!c.materials.find((m) => m.id === r.input)?.known ||
        !c.materials.find((m) => m.id === r.output)?.known)
    )
      throw new Error("Known reaction references hidden material");
  }
  for (const m of c.machines) {
    if (m.unlock) {
      if (
        "reactionId" in m.unlock
          ? !c.reactions.some((r) => r.id === m.unlock.reactionId)
          : !c.reactions.some(
              (r) => r.hazard?.id === m.unlock.hazardEvidenceId,
            )
      )
        throw new Error(
          "reactionId" in m.unlock
            ? "Missing machine unlock reaction"
            : "Missing machine unlock hazard evidence",
        );
      if (m.unlock.hintKey !== "machine." + m.id + ".unlock-hint")
        throw new Error("Localization key must match its machine unlock");
    }
    if (m.role === "processor" && m.maxExtractionDepth !== 0)
      throw new Error("Processor cannot have extraction depth");
    if (m.role === "processor" && m.sourceKind)
      throw new Error("Processor cannot have an extraction source kind");
    if (m.sourceKind === "atmosphere" && m.maxExtractionDepth !== 0)
      throw new Error("Atmospheric intake cannot have extraction depth");
    if (
      m.role === "processor" &&
      (!m.operations.length ||
        m.operations.some(
          (o) =>
            !operations.has(o) ||
            !c.reactions.some(
              (r) =>
                r.operation === o &&
                r.processConditionId === m.processConditionId,
            ),
        ))
    )
      throw new Error("Missing machine capability");
    if (
      m.role === "extractor" &&
      (m.operations.length || m.processConditionId !== undefined)
    )
      throw new Error("Extractor has no processing operation");
  }
  const regions = [c.site.terminal, ...c.site.deposits];
  for (const r of [
    ...regions,
    ...c.site.hiddenDeposits,
    ...c.site.atmosphericSources,
  ])
    if (r.x + r.width > c.site.width || r.y + r.height > c.site.height)
      throw new Error("Site entity outside map");
  for (let a = 0; a < regions.length; a++)
    for (let b = a + 1; b < regions.length; b++) {
      const x = regions[a],
        y = regions[b];
      if (
        x.x < y.x + y.width &&
        x.x + x.width > y.x &&
        x.y < y.y + y.height &&
        x.y + x.height > y.y
      )
        throw new Error("Overlapping site regions");
    }
  for (const d of c.site.deposits) {
    if (
      c.machines
        .filter((m) => m.role === "extractor" && m.sourceKind !== "atmosphere")
        .some(
          (m) =>
            !checkContainment(
              c,
              d.material,
              m.outputStates,
              m.outputContainment,
            ).ok,
        )
    )
      throw new Error("Extractor containment mismatches material");
  }
  for (const d of c.site.deposits)
    if (!c.materials.find((m) => m.id === d.material)?.known)
      throw new Error("Deposit material must be known");

  const hiddenSignalIds = new Set<string>();
  for (const deposit of c.site.hiddenDeposits) {
    if (!materials.has(deposit.material))
      throw new Error("Missing hidden deposit material");
    const signal = c.site.surveySignals.find(
      (entry) => entry.id === deposit.surveySignalId,
    );
    if (!signal) throw new Error("Missing hidden deposit survey signal");
    if (hiddenSignalIds.has(signal.id))
      throw new Error("Survey signal maps to multiple hidden sources");
    hiddenSignalIds.add(signal.id);
    if (
      signal.x < deposit.x ||
      signal.y < deposit.y ||
      signal.x >= deposit.x + deposit.width ||
      signal.y >= deposit.y + deposit.height
    )
      throw new Error("Hidden deposit survey signal must lie inside source");
    const capability = c.site.sensingCapabilities.find(
      (entry) => entry.id === deposit.requiredSensingCapabilityId,
    );
    if (!capability || capability.mode !== "probe")
      throw new Error("Hidden deposit requires a probe capability");
  }
  for (const source of c.site.atmosphericSources) {
    const material = c.materials.find((entry) => entry.id === source.material);
    if (!material || material.handlingState !== "gas")
      throw new Error("Atmospheric source requires a gas material");
    const signal = c.site.surveySignals.find(
      (entry) => entry.id === source.surveySignalId,
    );
    if (!signal) throw new Error("Missing atmospheric source survey signal");
    if (hiddenSignalIds.has(signal.id))
      throw new Error("Survey signal maps to multiple hidden sources");
    hiddenSignalIds.add(signal.id);
    if (
      signal.x < source.x ||
      signal.y < source.y ||
      signal.x >= source.x + source.width ||
      signal.y >= source.y + source.height
    )
      throw new Error("Atmospheric source survey signal must lie inside source");
    const capability = c.site.sensingCapabilities.find(
      (entry) => entry.id === source.requiredSensingCapabilityId,
    );
    if (!capability || capability.mode !== "probe")
      throw new Error("Atmospheric source requires a probe capability");
    if (source.nameKey !== "source." + source.id + ".name")
      throw new Error("Localization key must match atmospheric source");
    if (
      c.machines
        .filter(
          (machine) =>
            machine.role === "extractor" &&
            machine.sourceKind === "atmosphere",
        )
        .some(
          (machine) =>
            !checkContainment(
              c,
              source.material,
              machine.outputStates,
              machine.outputContainment,
            ).ok,
        )
    )
      throw new Error("Atmospheric intake containment mismatches material");
  }
  const exchangeMaterials = new Set<string>();
  for (const listing of c.economy.exchange) {
    if (!materials.has(listing.materialId))
      throw new Error("Missing exchange material");
    if (exchangeMaterials.has(listing.materialId))
      throw new Error("Duplicate exchange material");
    exchangeMaterials.add(listing.materialId);
    if (listing.floorCompensation > listing.baseCompensation)
      throw new Error("Exchange floor exceeds base compensation");
  }
  const opportunityIds = new Set<string>(),
    directiveExperiments = new Set<string>();
  for (const order of c.economy.orders) {
    if (opportunityIds.has(order.id))
      throw new Error("Duplicate company opportunity ID");
    opportunityIds.add(order.id);
    if (
      !materials.has(order.materialId) ||
      !exchangeMaterials.has(order.materialId)
    )
      throw new Error("Corporate order requires an exchange material");
    if (
      order.nameKey !== "order." + order.id + ".name" ||
      order.briefKey !== "order." + order.id + ".brief"
    )
      throw new Error("Localization key must match its corporate order");
  }
  for (const directive of c.economy.directives) {
    if (opportunityIds.has(directive.id))
      throw new Error("Duplicate company opportunity ID");
    opportunityIds.add(directive.id);
    const experimentKey = [
      directive.operationId,
      directive.inputMaterialId,
      directive.processConditionId ?? "",
    ].join("/");
    if (directiveExperiments.has(experimentKey))
      throw new Error("Duplicate directive experiment");
    directiveExperiments.add(experimentKey);
    if (
      !materials.has(directive.inputMaterialId) ||
      !operations.has(directive.operationId)
    )
      throw new Error("Missing directive experiment reference");
    const reaction = c.reactions.find(
      (r) =>
        r.operation === directive.operationId &&
        r.input === directive.inputMaterialId &&
        r.processConditionId === directive.processConditionId,
    );
    if (!reaction)
      throw new Error("Directive experiment has no authored outcome");
    if (reaction.known)
      throw new Error(
        "Directive experiment must target an unconfirmed outcome",
      );
    const capable = c.machines.some(
      (m) =>
        m.role === "processor" &&
        m.operations.includes(directive.operationId) &&
        m.processConditionId === directive.processConditionId,
    );
    if (!capable)
      throw new Error("Directive experiment has no capable machine");
    if (
      directive.nameKey !== "directive." + directive.id + ".name" ||
      directive.briefKey !== "directive." + directive.id + ".brief"
    )
      throw new Error("Localization key must match its directive");
  }
  const assistanceIds = new Set<string>();
  for (const assistance of c.economy.assistancePackages) {
    if (assistanceIds.has(assistance.id))
      throw new Error("Duplicate assistance package ID");
    assistanceIds.add(assistance.id);
    if (
      assistance.nameKey !== "assistance." + assistance.id + ".name" ||
      assistance.briefKey !== "assistance." + assistance.id + ".brief"
    )
      throw new Error("Localization key must match assistance package");
    if (assistance.baseObligationFuel < assistance.grantFuel)
      throw new Error("Assistance obligation cannot be smaller than its grant");
    if (
      assistance.continuationObligationFuel > assistance.baseObligationFuel ||
      assistance.continuationObligationFuel > assistance.grantFuel
    )
      throw new Error("Assistance continuation obligation is not recoverable");
  }
  if (c.economy.assistancePackages.length) {
    if (
      !c.economy.defaultAssistancePackageId ||
      !assistanceIds.has(c.economy.defaultAssistancePackageId)
    )
      throw new Error("Missing default assistance package");
  } else if (c.economy.defaultAssistancePackageId) {
    throw new Error("Default assistance package requires authored packages");
  }

  const capabilityIds = new Set<string>();
  for (const capability of c.economy.terminalCapabilities) {
    if (capabilityIds.has(capability.id))
      throw new Error("Duplicate terminal capability ID");
    capabilityIds.add(capability.id);
    if (capability.nameKey !== "terminal.capability." + capability.id + ".name")
      throw new Error("Localization key must match terminal capability");
  }

  const milestoneIds = new Set(c.economy.milestones.map((m) => m.id));
  if (milestoneIds.size !== c.economy.milestones.length)
    throw new Error("Duplicate milestone ID");

  const sensingCapabilityIds = new Set<string>();
  for (const capability of c.site.sensingCapabilities) {
    if (sensingCapabilityIds.has(capability.id))
      throw new Error("Duplicate sensing capability ID");
    sensingCapabilityIds.add(capability.id);
    if (capability.nameKey !== "sensing.capability." + capability.id + ".name")
      throw new Error("Localization key must match sensing capability");
    if (
      capability.requiredMilestoneId &&
      !milestoneIds.has(capability.requiredMilestoneId)
    )
      throw new Error("Missing sensing capability milestone");
  }
  const surveySignalIds = new Set<string>();
  for (const signal of c.site.surveySignals) {
    if (surveySignalIds.has(signal.id))
      throw new Error("Duplicate survey signal ID");
    surveySignalIds.add(signal.id);
    if (signal.x >= c.site.width || signal.y >= c.site.height)
      throw new Error("Survey signal outside site bounds");
  }

  const capabilityUnlocker = new Map<string, string>();
  for (const milestone of c.economy.milestones) {
    if (
      milestone.nameKey !== "milestone." + milestone.id + ".name" ||
      milestone.hintKey !== "milestone." + milestone.id + ".hint"
    )
      throw new Error("Localization key must match milestone");
    for (const capabilityId of milestone.unlockTerminalCapabilityIds) {
      if (!capabilityIds.has(capabilityId))
        throw new Error("Missing terminal capability unlock");
      if (capabilityUnlocker.has(capabilityId))
        throw new Error("Terminal capability has multiple milestone unlockers");
      capabilityUnlocker.set(capabilityId, milestone.id);
    }
    for (const requirement of milestone.requires) {
      if (
        (requirement.type === "reaction-confirmed" &&
          !c.reactions.some((r) => r.id === requirement.reactionId)) ||
        (requirement.type === "material-exported" &&
          !materials.has(requirement.materialId)) ||
        (requirement.type === "order-completed" &&
          !c.economy.orders.some(
            (order) => order.id === requirement.orderId,
          )) ||
        (requirement.type === "directive-completed" &&
          !c.economy.directives.some(
            (directive) => directive.id === requirement.directiveId,
          )) ||
        (requirement.type === "milestone-completed" &&
          !milestoneIds.has(requirement.milestoneId)) ||
        (requirement.type === "terminal-capability" &&
          !capabilityIds.has(requirement.capabilityId))
      )
        throw new Error("Missing milestone evidence reference");
    }
  }
  for (const listing of c.economy.exchange)
    if (
      listing.requiredTerminalCapabilityId &&
      !capabilityIds.has(listing.requiredTerminalCapabilityId)
    )
      throw new Error("Missing exchange terminal capability");
  for (const milestone of c.economy.milestones)
    for (const requirement of milestone.requires)
      if (
        requirement.type === "terminal-capability" &&
        !capabilityUnlocker.has(requirement.capabilityId)
      )
        throw new Error("Milestone terminal capability has no unlocker");

  const dependencies = (milestoneId: string) => {
    const milestone = c.economy.milestones.find((m) => m.id === milestoneId)!;
    return milestone.requires.flatMap((requirement) => {
      if (requirement.type === "milestone-completed")
        return [requirement.milestoneId];
      if (requirement.type === "terminal-capability") {
        const unlocker = capabilityUnlocker.get(requirement.capabilityId);
        return unlocker ? [unlocker] : [];
      }
      return [];
    });
  };
  const checked = new Set<string>();
  const visiting = new Set<string>();
  const visit = (milestoneId: string) => {
    if (visiting.has(milestoneId))
      throw new Error("Circular milestone dependency");
    if (checked.has(milestoneId)) return;
    visiting.add(milestoneId);
    for (const dependency of dependencies(milestoneId)) visit(dependency);
    visiting.delete(milestoneId);
    checked.add(milestoneId);
  };
  for (const milestone of c.economy.milestones) visit(milestone.id);

  const dependsOnBlockedExport = (
    milestoneId: string,
    materialId: string,
    seen = new Set<string>(),
  ): boolean => {
    if (seen.has(milestoneId)) return false;
    seen.add(milestoneId);
    const milestone = c.economy.milestones.find((m) => m.id === milestoneId)!;
    return milestone.requires.some((requirement) => {
      if (
        requirement.type === "material-exported" &&
        requirement.materialId === materialId
      )
        return true;
      if (requirement.type === "order-completed") {
        const order = c.economy.orders.find(
          (entry) => entry.id === requirement.orderId,
        );
        if (order?.materialId === materialId) return true;
      }
      if (requirement.type === "milestone-completed")
        return dependsOnBlockedExport(
          requirement.milestoneId,
          materialId,
          new Set(seen),
        );
      if (requirement.type === "terminal-capability") {
        const unlocker = capabilityUnlocker.get(requirement.capabilityId);
        return unlocker
          ? dependsOnBlockedExport(unlocker, materialId, new Set(seen))
          : false;
      }
      return false;
    });
  };
  for (const listing of c.economy.exchange) {
    const capabilityId = listing.requiredTerminalCapabilityId;
    if (!capabilityId) continue;
    const unlocker = capabilityUnlocker.get(capabilityId);
    if (!unlocker)
      throw new Error("Exchange terminal capability has no milestone unlock");
    if (dependsOnBlockedExport(unlocker, listing.materialId))
      throw new Error("Terminal handling unlock depends on blocked export");
  }

  const moduleIds = new Set<string>(), moduleStates = new Set<string>(), moduleCells = new Set<string>();
  for (const d of c.site.terminalModules) {
    const { x, y, side } = d.inlet, t = c.site.terminal;
    const cell = `${x},${y}`;
    if (moduleIds.has(d.id) || moduleStates.has(d.handlingState) || moduleCells.has(cell)) throw Error("Duplicate terminal module slot");
    moduleIds.add(d.id); moduleStates.add(d.handlingState); moduleCells.add(cell);
    if (x >= t.width || y >= t.height || !(side === 0 ? x === t.width - 1 : side === 1 ? y === t.height - 1 : side === 2 ? x === 0 : y === 0)) throw Error("Invalid terminal inlet geometry");
    const outsideX = t.x + x + (side === 0 ? 1 : side === 2 ? -1 : 0);
    const outsideY = t.y + y + (side === 1 ? 1 : side === 3 ? -1 : 0);
    if (outsideX < 0 || outsideY < 0 || outsideX >= c.site.width || outsideY >= c.site.height) throw Error("Terminal inlet has no outside approach");
    if (d.nameKey !== `terminal.module.${d.id}.name`) throw Error("Localization key must match terminal module");
    if (d.handlingState === "liquid" ? !c.liquidLogistics : !c.gasLogistics) throw Error("Terminal module requires logistics");
    const unlocker = capabilityUnlocker.get(d.requiredTerminalCapabilityId);
    if (!capabilityIds.has(d.requiredTerminalCapabilityId) || !unlocker) throw Error("Terminal module requires a capability unlock");
    for (const listing of c.economy.exchange) {
      const material = c.materials.find(m => m.id === listing.materialId)!;
      if (listing.requiredTerminalCapabilityId === d.requiredTerminalCapabilityId && !checkContainment(c, material.id, [d.handlingState], d.containmentCapabilities).ok) throw Error("Terminal module cannot protect listed cargo");
      if (checkContainment(c, material.id, [d.handlingState], d.containmentCapabilities).ok && dependsOnBlockedExport(unlocker, material.id)) throw Error("Terminal module unlock depends on blocked export");
    }
  }

  const minimumLegacyRecoveryFuel =
    Math.max(...c.machines.map((m) => m.fuel)) * 8;
  if (
    (c.economy.assistancePackages.length === 0 &&
      (c.economy.grant < minimumLegacyRecoveryFuel ||
        c.economy.assistanceBelow > c.economy.grant)) ||
    c.economy.assistancePackages.some(
      (assistance) => assistance.fuelBelow > assistance.grantFuel,
    )
  )
    throw new Error("Recovery grant cannot restart production");
  if (catalog) validateLocaleCoverage(c, catalog);
  // Keys are per-entity stable references, never shared aliases: borrowing
  // another entity's key would couple their display names forever.
  for (const m of c.materials)
    if (m.nameKey !== "material." + m.id + ".name")
      throw new Error("Localization key must match its entity: " + m.nameKey);
  for (const o of c.operations)
    if (o.nameKey !== "operation." + o.id + ".name")
      throw new Error("Localization key must match its entity: " + o.nameKey);
  for (const m of c.machines)
    if (m.nameKey !== "machine." + m.id + ".name")
      throw new Error("Localization key must match its entity: " + m.nameKey);
  for (const s of c.storages)
    if (s.nameKey !== "storage." + s.id + ".name")
      throw new Error("Localization key must match its entity: " + s.nameKey);
  for (const r of c.reactions)
    if (r.observationKey !== "reaction." + r.id + ".observation")
      throw new Error(
        "Localization key must match its entity: " + r.observationKey,
      );
  return c;
}

export function validateContent(
  input: unknown,
  catalog: Record<string, string> = enCatalog,
): Content {
  return validateContentInternal(input, catalog);
}

/**
 * Simulation owns gameplay truth, not locale-resource availability.
 * Callers that author dynamic content must validate their locale bundle at the
 * content boundary before handing the already-keyed content to sim-core.
 */
export function validateSimulationContent(input: unknown): Content {
  return validateContentInternal(input, null);
}

function validateContainmentDefinitions(c: Content) {
  const ids = new Set(c.containmentCapabilities.map((d) => d.id));
  const lists = [
    ...c.materials.map((m) => m.requiredContainment),
    ...c.machines.flatMap((m) => [m.inputContainment, m.outputContainment]),
    ...c.storages.map((d) => d.containmentCapabilities),
    c.site.beltContainment,
    c.site.dryContainment,
    ...c.site.terminalModules.map(d => d.containmentCapabilities),
  ];
  if (c.gasLogistics)
    lists.push(
      ...Object.values(c.gasLogistics).map((d) => d.containmentCapabilities),
    );
  if (c.liquidLogistics) {
    const cfg = c.liquidLogistics;
    lists.push(
      cfg.pipe.containmentCapabilities,
      cfg.tank.containmentCapabilities,
      cfg.pump.containmentCapabilities,
      ...cfg.containmentProfiles.map((p) => p.capabilities),
    );
    if (
      new Set(cfg.containmentProfiles.map((p) => p.id)).size !==
      cfg.containmentProfiles.length
    )
      throw Error("Duplicate containment profile");
    const standard = cfg.containmentProfiles.find((p) => p.id === "standard");
    if (
      !standard ||
      standard.capabilities.length ||
      Object.values(standard.additionalCost).some((n) => n !== 0)
    )
      throw Error("Invalid standard containment profile");
    const failure = cfg.pump.containmentFailure;
    if (failure) {
      const exposed = cfg.containmentProfiles.find(p => p.id === failure.exposedProfileId);
      if (!exposed || !ids.has(failure.missingCapabilityId) ||
          [...cfg.pump.containmentCapabilities, ...exposed.capabilities].includes(failure.missingCapabilityId))
        throw Error("Invalid pump failure exposure");
      if (failure.nameKey !== `handling.failure.${failure.id}.name` ||
          failure.descriptionKey !== `handling.failure.${failure.id}.description`)
        throw Error("Invalid pump failure localization identity");
      const affected = c.materials.filter(m => m.handlingState === "liquid" &&
        m.requiredContainment.includes(failure.missingCapabilityId) &&
        c.reactions.some(r => r.output === m.id && c.machines.some(d =>
          d.role === "processor" && d.operations.includes(r.operation) &&
          d.processConditionId === r.processConditionId && d.outputStates.includes("liquid") &&
          checkContainment(c,m.id,["liquid"],d.outputContainment).ok)));
      if (!affected.length || affected.some(m =>
        (["pump","pipe","tank"] as const).some(kind => !cfg.containmentProfiles.some(p =>
          checkContainment(c,m.id,["liquid"],[...cfg[kind].containmentCapabilities,...p.capabilities]).ok))))
        throw Error("Pump containment failure has no protected recovery path");
    }
  }
  for (const list of lists)
    if (new Set(list).size !== list.length || list.some((id) => !ids.has(id)))
      throw Error("Invalid containment capability reference");
}
