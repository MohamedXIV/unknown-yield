import { validateSimulationContent, type Content } from "@site/content";
import { initialState, parseSave } from "./save";
import { applyCommand } from "./commands";
import {
  completeAndStart,
  transport,
  status,
  solidDiagnostics,
} from "./production";
import { auditLedger } from "./ledger";
import { machineUnlocked } from "./progression";
import { hazardDefinition } from "./hazards";
import {
  marketBulletins,
  marketListings,
  recoverMarkets,
  refreshMarketSignals,
} from "./market";
import { opportunityViews, refreshOpportunities } from "./opportunities";
import { milestoneViews, refreshMilestones } from "./milestones";
import { assistanceViews, companyView } from "./assistance";
import { transportGases, gasCompressorStatus, gasDiagnostics } from "./gases";
import {
  transportLiquids,
  liquidPumpStatus,
  liquidDiagnostics,
  pumpRecoveryDiagnostic,
} from "./liquids";
import { pumpRepairEligible, publicPumpIncident } from "./pump-recovery";
import { publicTransportDiagnostic } from "./containment";
import { terminalModuleViews } from "./terminal";
import { footprint } from "./geometry";
import { factoryView } from "./factory-contract";
import { FactoryThroughputMonitor } from "./factory-throughput";
import { sensingCapabilityUnlocked } from "./sensing";
import { importSupplyViews, terminalImportOutlet } from "./imports";
import {
  total,
  type Save,
  type CommandResult,
  type PlayerSnapshot,
} from "./types";
export class Simulation {
  private readonly content: Content;
  private state: Save;
  private discoveryLocations = new Map<string, { x: number; y: number }>();
  private readonly factoryThroughput = new FactoryThroughputMonitor();
  constructor(content: Content) {
    this.content = validateSimulationContent(content);
    this.state = initialState(this.content);
  }
  command(input: unknown): CommandResult {
    const commandInput =
        typeof input === "object" && input !== null
          ? (input as Record<string, unknown>)
          : null,
      commandType =
        commandInput && "type" in commandInput ? String(commandInput.type) : "",
      divertSelectionBefore =
        commandType === "setDivertRoute" &&
        typeof commandInput?.beltId === "string"
          ? Object.values(this.state.belts).find(
              (belt) => belt.id === commandInput.beltId,
            )?.switched
          : undefined,
      requestedDivertSelection =
        commandType === "setDivertRoute"
          ? commandInput?.route === "alternate"
          : undefined,
      result = applyCommand(this.content, this.state, input, true);
    if (result.ok) {
      if (
        commandType === "setDivertRoute" &&
        divertSelectionBefore === requestedDivertSelection
      ) {
        // Idempotent district automation must not erase otherwise valid
        // throughput certificates when authoritative routing did not change.
      } else if (commandType === "sense" || commandType === "setShipmentQuantity") {
        // Sensing and shipment selection change knowledge/intent only; neither
        // mutates production topology or physical factory state.
      } else if (
        [
          "setLiquidContainmentProfile",
          "setPumpRecoveryDrain",
          "repairPump",
          "installTerminalModule",
          "removeTerminalModule",
        ].includes(commandType)
      )
        this.factoryThroughput.observe(this.content, this.state);
      else this.factoryThroughput.reset();
    }
    return result;
  }
  preview(input: unknown): CommandResult {
    return applyCommand(this.content, this.state, input, false);
  }
  step(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs < 0 || deltaMs > 86400000)
      throw new Error("Invalid simulation delta");
    const s = this.state,
      c = this.content;
    s.remainder += deltaMs;
    while (s.remainder >= c.tickMs) {
      s.remainder -= c.tickMs;
      s.tick++;
      completeAndStart(c, s, true, (id, m) =>
        this.discoveryLocations.set(id, { x: m.x, y: m.y }),
      );
      refreshMilestones(c, s);
      if (s.tick % c.site.transportEveryTicks === 0) {
        transportGases(c, s, (event) =>
          this.factoryThroughput.recordMove(s, event),
        );
        transportLiquids(c, s, (event) =>
          this.factoryThroughput.recordMove(s, event),
        );
        transport(c, s, (event) => this.factoryThroughput.recordMove(s, event));
        refreshMilestones(c, s);
      }
      if (s.tick % c.economy.marketEveryTicks === 0) {
        recoverMarkets(c, s);
        refreshMarketSignals(c, s);
        refreshOpportunities(c, s);
      }
      completeAndStart(c, s, false);
      this.factoryThroughput.observe(c, s);
    }
  }
  snapshot(): PlayerSnapshot {
    const c = this.content,
      s = this.state,
      reactions = c.reactions.filter((r) => s.knowledge.includes(r.id)),
      knowledgeEntries = Object.entries(s.evidence)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, evidence]) => {
          const reaction = c.reactions.find(
            (r) =>
              r.operation === evidence.operationId &&
              r.input === evidence.inputId &&
              (r.processConditionId ?? null) === evidence.processConditionId,
          )!;
          const setup = c.machines.find(
            (d) =>
              d.role === "processor" &&
              d.operations.includes(evidence.operationId) &&
              (d.processConditionId ?? null) === evidence.processConditionId,
          );
          const confirmed = evidence.state === "confirmed";
          return {
            id,
            state: evidence.state,
            operationId: evidence.operationId,
            inputId: evidence.inputId,
            setupNameKey: setup?.nameKey,
            ...(confirmed
              ? {
                  outputId: reaction.output,
                  textKey: reaction.observationKey,
                  initial: reaction.known,
                  observedAt: this.discoveryLocations.get(reaction.id),
                }
              : { initial: false }),
          };
        });
    const hazardEvidence = s.hazardEvidence.map((hazardId) => {
      const incident = hazardDefinition(c, hazardId)!;
      const setup = c.machines.find(
        (definition) =>
          definition.role === "processor" &&
          definition.operations.includes(incident.reaction.operation) &&
          (definition.processConditionId ?? null) ===
            (incident.reaction.processConditionId ?? null),
      );
      return {
        id: incident.hazard.id,
        classId: incident.classDefinition.id,
        classNameKey: incident.classDefinition.nameKey,
        nameKey: incident.hazard.nameKey,
        textKey: incident.hazard.observationKey,
        evidenceKey: incident.classDefinition.evidenceKey,
        saferHintKey: incident.hazard.saferHintKey,
        operationId: incident.reaction.operation,
        inputId: incident.reaction.input,
        setupNameKey: setup?.nameKey,
      };
    });
    const known = new Set(c.materials.filter((m) => m.known).map((m) => m.id));
    reactions.forEach((r) => {
      known.add(r.input);
      known.add(r.output);
    });
    const {
      sensingCapabilities: hiddenSensingCapabilities,
      surveySignals: hiddenSurveySignals,
      hiddenDeposits: hiddenDepositDefinitions,
      atmosphericSources: hiddenAtmosphericSources,
      ...publicMap
    } = c.site;
    void hiddenSensingCapabilities;
    void hiddenSurveySignals;
    void hiddenDepositDefinitions;
    void hiddenAtmosphericSources;
    return structuredClone({
      tick: s.tick,
      fuel: s.fuel,
      debt: s.debt,
      stock: s.stock,
      exported: s.exported,
      milestone: s.exported >= c.economy.milestoneExports,
      map: publicMap,
      sensingCapabilities: c.site.sensingCapabilities.map((capability) => ({
        id: capability.id,
        nameKey: capability.nameKey,
        mode: capability.mode,
        range: capability.range,
        unlocked: sensingCapabilityUnlocked(s, capability),
      })),
      sensingObservations: Object.entries(s.sensingObservations)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, observation]) => observation),
      deposits: [
        ...c.site.deposits.map((d) => ({
          ...d,
          remaining: s.deposits[d.id],
        })),
        ...c.site.hiddenDeposits
          .filter((d) => s.discoveredDeposits.includes(d.id))
          .map(
            ({
              surveySignalId: _surveySignalId,
              requiredSensingCapabilityId: _requiredSensingCapabilityId,
              ...d
            }) => ({
              ...d,
              remaining: s.deposits[d.id],
            }),
          ),
      ],
      atmosphericSources: c.site.atmosphericSources
        .filter((source) => Object.hasOwn(s.atmosphericSources, source.id))
        .map(
          ({
            surveySignalId: _surveySignalId,
            requiredSensingCapabilityId: _requiredSensingCapabilityId,
            material,
            ...source
          }) => ({
            ...source,
            material: known.has(material) ? material : null,
            remaining: s.atmosphericSources[source.id],
          }),
        ),
      definitions: c.machines.map((definition) => {
        const { unlock, ...view } = definition;
        return {
          ...view,
          unlock: unlock
            ? {
                unlocked: machineUnlocked(s, definition),
                hintKey: unlock.hintKey,
              }
            : null,
        };
      }),
      storageDefinitions: c.storages,
      containmentCapabilities: c.containmentCapabilities,
      transportDiagnostics: Object.fromEntries(
        Object.entries({
          ...solidDiagnostics(c, s),
          ...liquidDiagnostics(c, s),
          ...gasDiagnostics(c, s),
        }).map(([id, d]) => [id, publicTransportDiagnostic(d, known)]),
      ),
      junctionDefinitions: c.junctions,
      operations: c.operations,
      materials: c.materials.filter((m) => known.has(m.id)),
      factories: Object.values(s.factories).map((factory) =>
        factoryView(c, s, factory, this.factoryThroughput.view(factory.id)),
      ),
      belts: Object.values(s.belts),
      storages: Object.values(s.storages).map((t) => {
        const d = c.storages.find((d) => d.id === t.definitionId)!;
        const r = footprint(t, d);
        return {
          ...t,
          nameKey: d.nameKey,
          width: r.width,
          height: r.height,
          capacity: d.capacity,
        };
      }),
      staging: s.staging,
      shipmentManifest: s.shipmentManifest,
      importStaging: s.terminalImports.staging,
      importSupplies: importSupplyViews(c, s),
      importOutlet: terminalImportOutlet(c),
      terminalModules: terminalModuleViews(c, s),
      policies: s.policies,
      exchange: marketListings(c, s),
      marketBulletins: marketBulletins(c, s),
      opportunities: opportunityViews(c, s),
      milestones: milestoneViews(c, s),
      company: companyView(c, s),
      assistance: assistanceViews(c, s),
      knowledgeEntries,
      hazardEvidence,
      machines: Object.values(s.machines).map((m) => {
        const d = c.machines.find((d) => d.id === m.definitionId)!;
        const r = footprint(m, d);
        const incident = m.incident
          ? hazardDefinition(c, m.incident)
          : undefined;
        return {
          ...m,
          job: m.job ? { remaining: m.job.remaining } : null,
          incident: incident
            ? {
                classId: incident.classDefinition.id,
                classNameKey: incident.classDefinition.nameKey,
                nameKey: incident.hazard.nameKey,
                textKey: incident.hazard.observationKey,
                evidenceKey: incident.classDefinition.evidenceKey,
                saferHintKey: incident.hazard.saferHintKey,
              }
            : null,
          nameKey: d.nameKey,
          role: d.role,
          width: r.width,
          height: r.height,
          capacity: d.capacity,
          durationTicks: d.durationTicks,
          durationMs: d.durationTicks * c.tickMs,
          fuelCost: d.fuel,
          status: status(c, s, m),
          progress: m.job ? 1 - m.job.remaining / d.durationTicks : 0,
        };
      }),
      pressureLines: Object.values(s.pressureLines),
      pressureVessels: Object.values(s.pressureVessels).map((v) => ({
        ...v,
        ...footprint(v, c.gasLogistics!.vessel),
        capacity: c.gasLogistics!.vessel.capacity,
      })),
      compressors: Object.values(s.compressors).map((p) => ({
        ...p,
        status: gasCompressorStatus(c, s, p),
      })),
      gasLogistics: c.gasLogistics,
      pipes: Object.values(s.pipes),
      tanks: Object.values(s.tanks).map((t) => ({
        ...t,
        ...footprint(t, c.liquidLogistics!.tank),
        capacity: c.liquidLogistics!.tank.capacity,
      })),
      pumps: Object.values(s.pumps).map((p) => ({
        ...p,
        incident: publicPumpIncident(p, known),
        canRepair: pumpRepairEligible(c, p),
        recoveryDiagnostic: pumpRecoveryDiagnostic(c, s, p)
          ? publicTransportDiagnostic(pumpRecoveryDiagnostic(c, s, p)!, known)
          : null,
        status: liquidPumpStatus(c, s, p),
      })),
      liquidLogistics: c.liquidLogistics,
      observations: reactions.map((r) => ({
        operationId: r.operation,
        inputId: r.input,
        outputId: r.output,
        textKey: r.observationKey,
        initial: r.known,
        observedAt: this.discoveryLocations.get(r.id),
      })),
    });
  }
  serialize(): Save {
    return structuredClone(this.state);
  }
  load(input: unknown): CommandResult {
    try {
      const next = parseSave(input, this.content);
      const report = auditLedger(this.content, next);
      if (!report.ok) {
        const detail = report.mismatches
          .slice(0, 3)
          .map((r) => r.material + ": off by " + r.delta)
          .join("; ");
        throw new Error("Material ledger does not reconcile (" + detail + ")");
      }
      if (next.exported !== total(next.flows.exported))
        throw new Error("Export total disagrees with ledger export history");
      this.state = next;
      this.discoveryLocations.clear();
      this.factoryThroughput.reset();
      return { ok: true, message: "Site restored" };
    } catch (error) {
      return {
        ok: false,
        message:
          "Save rejected (requires schema 18): " +
          (error instanceof Error ? error.message : "Invalid data"),
      };
    }
  }
}
