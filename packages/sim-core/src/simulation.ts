import { validateContent, type Content } from "@site/content";
import { initialState, parseSave } from "./save";
import { applyCommand } from "./commands";
import { completeAndStart, transport, status } from "./production";
import { footprint } from "./geometry";
import type { Save, CommandResult, PlayerSnapshot } from "./types";
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
      operations: c.operations,
      materials: c.materials.filter((m) => known.has(m.id)),
      factories: Object.values(s.factories),
      belts: Object.values(s.belts),
      policies: s.policies,
      machines: Object.values(s.machines).map((m) => {
        const d = c.machines.find((d) => d.id === m.definitionId)!;
        const r = footprint(m, d);
        return {
          ...m,
          job: m.job ? { remaining: m.job.remaining } : null,
          name: d.name,
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
        operation: c.operations.find((o) => o.id === r.operation)!.name,
        input: c.materials.find((m) => m.id === r.input)!.name,
        output: c.materials.find((m) => m.id === r.output)!.name,
        text: r.observation,
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
      this.state = next;
      this.discoveryLocations.clear();
      return { ok: true, message: "Site restored" };
    } catch (error) {
      return {
        ok: false,
        message:
          "Save rejected (requires schema 2): " +
          (error instanceof Error ? error.message : "Invalid data"),
      };
    }
  }
}
