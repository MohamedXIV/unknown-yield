import { validateContent, type Content } from "@site/content";
import { initialState, parseSave } from "./save";
import { applyCommand } from "./commands";
import { completeAndStart, transport, status } from "./production";
import { auditLedger } from "./ledger";
import { footprint } from "./geometry";
import { total, type Save, type CommandResult, type PlayerSnapshot } from "./types";
export class Simulation {
  private readonly content: Content;
  private state: Save;
  private discoveryLocations = new Map<string, { x: number; y: number }>();
  constructor(content: Content) {
    this.content = validateContent(content);
    this.state = initialState(this.content);
  }
  command(input: unknown): CommandResult {
    return applyCommand(this.content, this.state, input, true);
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
      if (s.tick % c.site.transportEveryTicks === 0) transport(c, s);
      completeAndStart(c, s, false);
    }
  }
  snapshot(): PlayerSnapshot {
    const c = this.content,
      s = this.state,
      reactions = c.reactions.filter((r) => s.knowledge.includes(r.id));
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
      definitions: c.machines,
      storageDefinitions: c.storages,
      operations: c.operations,
      materials: c.materials.filter((m) => known.has(m.id)),
      factories: Object.values(s.factories),
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
      machines: Object.values(s.machines).map((m) => {
        const d = c.machines.find((d) => d.id === m.definitionId)!;
        const r = footprint(m, d);
        return {
          ...m,
          job: m.job ? { remaining: m.job.remaining } : null,
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
      return { ok: true, message: "Site restored" };
    } catch (error) {
      return {
        ok: false,
        message:
          "Save rejected (requires schema 4): " +
          (error instanceof Error ? error.message : "Invalid data"),
      };
    }
  }
}
