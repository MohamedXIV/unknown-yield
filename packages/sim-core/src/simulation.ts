import { validateSimulationContent, type Content } from "@site/content";
import { initialState, parseSave } from "./save";
import { applyCommand } from "./commands";
import { completeAndStart, transport, status } from "./production";
import { auditLedger } from "./ledger";
import { machineUnlocked } from "./progression";
import { marketListings, recoverMarkets } from "./market";
import { opportunityViews, refreshOpportunities } from "./opportunities";
import { milestoneViews, refreshMilestones } from "./milestones";
import { assistanceViews, companyView } from "./assistance";
import { footprint } from "./geometry";
import { factoryView } from "./factory-contract";
import { FactoryThroughputMonitor } from "./factory-throughput";
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
    const result = applyCommand(this.content, this.state, input, true);
    if (result.ok) this.factoryThroughput.reset();
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
        transport(c, s, (event) => this.factoryThroughput.recordMove(s, event));
        refreshMilestones(c, s);
      }
      if (s.tick % c.economy.marketEveryTicks === 0) {
        refreshOpportunities(c, s);
        recoverMarkets(c, s);
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
    const known = new Set(c.materials.filter((m) => m.known).map((m) => m.id));
    reactions.forEach((r) => {
      known.add(r.input);
      known.add(r.output);
    });
    return structuredClone({
      tick: s.tick,
      fuel: s.fuel,
      debt: s.debt,
      stock: s.stock,
      exported: s.exported,
      milestone: s.exported >= c.economy.milestoneExports,
      map: c.site,
      deposits: c.site.deposits.map((d) => ({
        ...d,
        remaining: s.deposits[d.id],
      })),
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
      operations: c.operations,
      materials: c.materials.filter((m) => known.has(m.id)),
      factories: Object.values(s.factories).map((factory) =>
        factoryView(
          c,
          s,
          factory,
          this.factoryThroughput.view(factory.id),
        ),
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
      policies: s.policies,
      exchange: marketListings(c, s),
      opportunities: opportunityViews(c, s),
      milestones: milestoneViews(c, s),
      company: companyView(c, s),
      assistance: assistanceViews(c, s),
      knowledgeEntries,
      machines: Object.values(s.machines).map((m) => {
        const d = c.machines.find((d) => d.id === m.definitionId)!;
        const r = footprint(m, d);
        const incident = m.incident
          ? c.reactions.find((reaction) => reaction.hazard?.id === m.incident)
              ?.hazard
          : undefined;
        return {
          ...m,
          job: m.job ? { remaining: m.job.remaining } : null,
          incident: incident
            ? {
                nameKey: incident.nameKey,
                textKey: incident.observationKey,
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
          "Save rejected (requires schema 11): " +
          (error instanceof Error ? error.message : "Invalid data"),
      };
    }
  }
}
