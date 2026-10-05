import { checkContainment } from "@site/content";
import { receivingDiagnostic, type TransportDiagnostic } from "./containment";
import { beltArms } from "./junctions";
import type { Content } from "@site/content";
import {
  amount,
  change,
  experimentEvidenceKey,
  total,
  type MachineStatus,
  type Save,
  type Machine,
  type Point,
} from "./types";
import { key, next, socket, contains, footprint } from "./geometry";
import { ensureMarket, exchangeDefinition } from "./market";
import { recordDirectiveExperiment } from "./opportunities";
import {
  settleTerminalExports,
  terminalModuleAt,
  terminalModulePoint,
  terminalModuleOutlet,
  terminalReceiver,
} from "./terminal";
import { depositDefinition } from "./deposits";
import { atmosphericSourceForRect } from "./atmosphere";
import { applyReactionHazard } from "./hazards";
import {
  terminalImportOutlet,
  terminalModuleCarriesImport,
} from "./imports";
export function recipe(c: Content, m: Machine) {
  const definition = c.machines.find((d) => d.id === m.definitionId);
  return c.reactions.find(
    (r) =>
      r.operation === m.operation &&
      r.processConditionId === definition?.processConditionId &&
      amount(m.input, r.input) >= r.inputAmount,
  );
}
export function status(c: Content, s: Save, m: Machine): MachineStatus {
  if (m.job) return "processing";
  if (m.incident) return "incident";
  if (!m.enabled) return "disabled";
  const d = c.machines.find((d) => d.id === m.definitionId)!;
  const r = recipe(c, m);
  if (d.role === "extractor" && d.sourceKind === "atmosphere") {
    const source = atmosphericSourceForRect(c, s, footprint(m, d));
    if (!source || s.atmosphericSources[source.id] === 0)
      return "source-exhausted";
  } else if (
    d.role === "extractor" &&
    (!m.depositId || s.deposits[m.depositId] === 0)
  )
    return "deposit-exhausted";
  if (d.role === "processor" && !r)
    return total(m.input) ? "needs-compatible-input" : "needs-input";
  if (total(m.output) + (r?.outputAmount ?? 1) > d.capacity)
    return "output-full";
  if (s.fuel < d.fuel) return "needs-fuel";
  return "ready";
}
export function completeAndStart(
  c: Content,
  s: Save,
  complete: boolean,
  onDiscovery?: (reactionId: string, machine: Machine) => void,
) {
  for (const m of Object.values(s.machines)) {
    const d = c.machines.find((d) => d.id === m.definitionId)!;
    if (complete) {
      if (m.job && --m.job.remaining === 0) {
        const r = c.reactions.find((r) => r.id === m.job!.reaction);
        const source =
          d.sourceKind === "atmosphere"
            ? atmosphericSourceForRect(c, s, footprint(m, d))
            : depositDefinition(c, m.depositId);
        const material = r?.output ?? source!.material;
        if (r) {
          // A defined transformation: record the consumed inputs and the
          // created outputs so the ledger can reconcile the identity change.
          change(s.flows.consumed, r.input, r.inputAmount);
          change(s.flows.produced, material, r.outputAmount);
          const id = experimentEvidenceKey(
            r.operation,
            r.input,
            r.processConditionId ?? null,
          );
          s.evidence[id] = {
            operationId: r.operation,
            inputId: r.input,
            processConditionId: r.processConditionId ?? null,
            state: "confirmed",
          };
          recordDirectiveExperiment(
            c,
            s,
            r.operation,
            r.input,
            r.processConditionId ?? null,
          );
        }
        change(m.output, material, r?.outputAmount ?? 1);
        if (r && !s.knowledge.includes(r.id)) {
          s.knowledge.push(r.id);
          onDiscovery?.(r.id, m);
          s.policies[material] =
            c.materials.find((m) => m.id === material)?.handlingState ===
              "solid" && exchangeDefinition(c, material)
              ? "export"
              : "keep";
          ensureMarket(c, s, material);
        }
        if (r?.hazard) applyReactionHazard(c, s, m, r);
        m.job = null;
      }
    } else if (status(c, s, m) === "ready") {
      const r = recipe(c, m);
      s.fuel -= d.fuel;
      if (r) {
        change(m.input, r.input, -r.inputAmount);
        const id = experimentEvidenceKey(
          r.operation,
          r.input,
          r.processConditionId ?? null,
        );
        s.evidence[id] ??= {
          operationId: r.operation,
          inputId: r.input,
          processConditionId: r.processConditionId ?? null,
          state: "hinted",
        };
      } else if (d.sourceKind === "atmosphere") {
        const source = atmosphericSourceForRect(c, s, footprint(m, d))!;
        s.atmosphericSources[source.id]--;
      } else s.deposits[m.depositId!]--;
      m.job = { remaining: d.durationTicks, reaction: r?.id ?? null };
    }
  }
}
export type TransportMoveEvent = {
  units?: number;
  from: Point;
  direction: number;
  material: string;
};

function dryReceiver(
  c: Content,
  s: Save,
  from: Point,
  point: Point,
  material: string,
  direction: number,
) {
  if (contains(c.site.terminal, point)) {
    const definition = terminalModuleAt(c, point, direction, "solid");
    if (definition) {
      const receiver = terminalReceiver(c, s, point, direction, "solid");
      return receiver
        ? {
            capabilities: receiver.capabilities,
            quantity: receiver.quantity,
            capacity: receiver.capacity,
            material: receiver.material,
          }
        : null;
    }
    return {
      capabilities: c.site.dryContainment,
      quantity:
        material === c.site.buildMaterial ? total(s.stock) : total(s.staging),
      capacity:
        material === c.site.buildMaterial ? Infinity : c.site.stagingCapacity,
      material: null,
    };
  }
  const b = s.belts[key(point)];
  if (b) {
    const inlet = (direction + 2) % 4,
      arms = beltArms(c, b);
    if (
      !arms.inlets.includes(inlet) ||
      (b.junction?.crossing &&
        (b.junction.crossing.pending !== null ||
          inlet !== arms.inlets[b.junction.crossing.axis]))
    )
      return null;
    return {
      capabilities: c.site.beltContainment,
      quantity: b.cargo ? 1 : 0,
      capacity: 1,
      material: b.cargo,
    };
  }
  for (const m of Object.values(s.machines)) {
    const d = c.machines.find((d) => d.id === m.definitionId)!;
    if (
      d.role === "processor" &&
      d.inputStates.includes("solid") &&
      contains(footprint(m, d), point) &&
      key(socket(m, d, false)) === key(from)
    )
      return {
        capabilities: d.inputContainment,
        quantity: total(m.input),
        capacity: d.capacity,
        material: null,
      };
  }
  for (const t of Object.values(s.storages)) {
    const d = c.storages.find((d) => d.id === t.definitionId)!;
    if (
      contains(footprint(t, d), point) &&
      key(socket(t, d, false)) === key(from)
    )
      return {
        capabilities: d.containmentCapabilities,
        quantity: total(t.inventory),
        capacity: d.capacity,
        material: null,
      };
  }
  return null;
}
export function solidDiagnostics(
  c: Content,
  s: Save,
): Record<string, TransportDiagnostic> {
  const result: Record<string, TransportDiagnostic> = {};
  for (const b of Object.values(s.belts))
    if (b.cargo) {
      const arms = beltArms(c, b),
        directions =
          arms.kind === "crossing"
            ? [arms.outlets[b.junction!.crossing!.held!]]
            : arms.outlets;
      const routes = directions.map((d) => {
        const target = dryReceiver(c, s, b, next(b, d), b.cargo!, d);
        return receivingDiagnostic(
          c,
          b.cargo!,
          "solid",
          target?.capabilities ?? [],
          target,
        );
      });
      result[b.id] = routes.find((d) => d.reason === "ready") ?? routes[0];
    }
  for (const [records, definitions, field] of [
    [s.machines, c.machines, "output"],
    [s.storages, c.storages, "inventory"],
  ] as const)
    for (const entity of Object.values(records)) {
      const inv =
        field === "output"
          ? "output" in entity
            ? entity.output
            : {}
          : "inventory" in entity
            ? entity.inventory
            : {};
      const material = Object.keys(inv)
        .sort()
        .find(
          (id) =>
            inv[id] > 0 &&
            c.materials.find((m) => m.id === id)?.handlingState === "solid",
        );
      if (!material) continue;
      const def = definitions.find((d) => d.id === entity.definitionId)!;
      const p = socket(entity, def, true);
      const target = s.belts[key(p)]
        ? dryReceiver(c, s, entity, p, material, entity.direction)
        : null;
      result[entity.id] = receivingDiagnostic(
        c,
        material,
        "solid",
        target?.capabilities ?? [],
        target,
      );
    }
  return result;
}
export function transport(
  c: Content,
  s: Save,
  onMove?: (event: TransportMoveEvent) => void,
) {
  const belts = Object.values(s.belts).sort((a, b) => a.y - b.y || a.x - b.x);
  const occupied = new Set(belts.filter((b) => b.cargo).map(key));
  // Clearance is observed at update start, never after a dispatch in this update.
  for (const b of belts) {
    const signal = b.junction?.crossing;
    if (signal && signal.pending !== null && !b.cargo) {
      signal.axis = signal.pending;
      signal.pending = null;
      signal.remaining = c.junctions.find(
        (d) => d.id === b.junction!.definitionId,
      )!.windowSteps!;
    }
  }
  type Source = {
    point: Point;
    material: string;
    directions: number[];
    belt?: (typeof belts)[number];
    inventory?: Record<string, number>;
    take?: () => void;
    emission?: string;
  };
  type Target = {
    id: string;
    capacity: number;
    inventory?: Record<string, number>;
    belt?: (typeof belts)[number];
    put?: (material: string) => void;
    inlet: number;
  };
  const sources: Source[] = belts
    .filter((b) => b.cargo)
    .map((b) => {
      const arms = beltArms(c, b);
      const directions =
        arms.kind === "crossing"
          ? [arms.outlets[b.junction!.crossing!.held!]]
          : arms.kind === "splitter" && b.junction?.cursor === 1
            ? [...arms.outlets].reverse()
            : arms.outlets;
      return { point: b, material: b.cargo!, directions, belt: b };
    });
  // Emitters participate in the same admission arbitration as incoming belts.
  // Their ordinary priority remains after old belt cargo, as before.
  for (const m of Object.values(s.machines)) {
    const def = c.machines.find((d) => d.id === m.definitionId)!;
    const material = Object.keys(m.output)
      .sort()
      .find(
        (id) =>
          m.output[id] > 0 &&
          c.materials.find((a) => a.id === id)?.handlingState === "solid",
      );
    if (material)
      sources.push({
        point: m,
        material,
        directions: [m.direction],
        inventory: m.output,
        emission: key(socket(m, def, true)),
      });
  }
  for (const t of Object.values(s.storages)) {
    const def = c.storages.find((d) => d.id === t.definitionId)!;
    const material = Object.keys(t.inventory)
      .sort()
      .find((id) => t.inventory[id] > 0);
    if (material && s.belts[key(socket(t, def, true))]?.junction)
      sources.push({
        point: t,
        material,
        directions: [t.direction],
        inventory: t.inventory,
        emission: key(socket(t, def, true)),
      });
  }
  for (const definition of c.site.terminalModules) {
    if (definition.handlingState !== "solid") continue;
    const contents = s.terminalModules[definition.id];
    if (
      !contents?.materialId ||
      !contents.quantity ||
      !terminalModuleCarriesImport(c, definition.id, contents.materialId)
    )
      continue;
    const point = terminalModulePoint(c, definition);
    const outlet = terminalModuleOutlet(c, definition);
    sources.push({
      point,
      material: contents.materialId,
      directions: [outlet.direction],
      take: () => {
        contents.quantity--;
        if (!contents.quantity) contents.materialId = null;
      },
      emission: key(outlet),
    });
  }
  const importedMaterial = Object.keys(s.terminalImports.staging)
    .sort()
    .find(
      (id) =>
        s.terminalImports.staging[id] > 0 &&
        c.materials.find((entry) => entry.id === id)?.handlingState === "solid" &&
        checkContainment(c, id, ["solid"], c.site.dryContainment).ok,
    );
  if (importedMaterial) {
    const outlet = terminalImportOutlet(c);
    sources.push({
      point: outlet,
      material: importedMaterial,
      directions: [outlet.direction],
      inventory: s.terminalImports.staging,
      emission: key(next(outlet, outlet.direction)),
    });
  }
  const targetFor = (source: Source, direction: number): Target | null => {
    if (
      c.materials.find((m) => m.id === source.material)?.handlingState !==
      "solid"
    )
      return null;
    const inlet = (direction + 2) % 4;
    const p = source.emission ? null : next(source.point, direction);
    const loc = source.emission ?? key(p!);
    const receiver = dryReceiver(
      c,
      s,
      source.point,
      p ?? Object.values(s.belts).find((b) => key(b) === loc) ?? source.point,
      source.material,
      direction,
    );
    if (
      receiver &&
      !checkContainment(c, source.material, ["solid"], receiver.capabilities).ok
    )
      return null;
    // Terminal is checked before belts, preserving ordinary settlement order.
    if (p && contains(c.site.terminal, p)) {
      const definition = terminalModuleAt(c, p, direction, "solid");
      if (definition) {
        const terminal = terminalReceiver(c, s, p, direction, "solid");
        if (
          !terminal ||
          !checkContainment(
            c,
            source.material,
            ["solid"],
            terminal.capabilities,
          ).ok ||
          (terminal.material !== null && terminal.material !== source.material)
        )
          return null;
        return {
          id: terminal.id,
          capacity: terminal.capacity - terminal.quantity,
          put: (material) => terminal.put(material, 1),
          inlet,
        };
      }
      if (
        !checkContainment(c, source.material, ["solid"], c.site.dryContainment)
          .ok
      )
        return null;
      return source.material === c.site.buildMaterial
        ? { id: "stock", capacity: Infinity, inventory: s.stock, inlet }
        : {
            id: "staging",
            capacity: c.site.stagingCapacity - total(s.staging),
            inventory: s.staging,
            inlet,
          };
    }
    const b = s.belts[loc];
    if (
      b &&
      !checkContainment(c, source.material, ["solid"], c.site.beltContainment)
        .ok
    )
      return null;
    if (b)
      return !occupied.has(loc) &&
        beltArms(c, b).inlets.includes(inlet) &&
        (!b.junction?.crossing ||
          (b.junction.crossing.pending === null &&
            inlet === beltArms(c, b).inlets[b.junction.crossing.axis]))
        ? { id: "belt:" + loc, capacity: 1, belt: b, inlet }
        : null;
    if (source.emission) return null;
    const m = Object.values(s.machines).find((m) => {
      const d = c.machines.find((d) => d.id === m.definitionId)!;
      return (
        d.role === "processor" &&
        d.inputStates.includes("solid") &&
        checkContainment(c, source.material, d.inputStates, d.inputContainment)
          .ok &&
        contains(footprint(m, d), p!) &&
        key(socket(m, d, false)) === key(source.point)
      );
    });
    if (m)
      return {
        id: m.id,
        capacity:
          c.machines.find((d) => d.id === m.definitionId)!.capacity -
          total(m.input),
        inventory: m.input,
        inlet,
      };
    const t = Object.values(s.storages).find((t) => {
      const d = c.storages.find((d) => d.id === t.definitionId)!;
      return (
        checkContainment(
          c,
          source.material,
          ["solid"],
          d.containmentCapabilities,
        ).ok &&
        contains(footprint(t, d), p!) &&
        key(socket(t, d, false)) === key(source.point)
      );
    });
    return t
      ? {
          id: t.id,
          capacity:
            c.storages.find((d) => d.id === t.definitionId)!.capacity -
            total(t.inventory),
          inventory: t.inventory,
          inlet,
        }
      : null;
  };
  const accepted = new Set<Source>();
  const received = new Map<string, number>();
  const moves: { source: Source; target: Target; direction: number }[] = [];
  // Each source proposes its first eligible arm, then retries its other arm if
  // a reservation conflict denied it. A T has at most two candidates.
  const candidates = new Map(
    sources.map((source) => [source, [...source.directions]]),
  );
  for (let round = 0; round < 2; round++) {
    const requests = new Map<
      string,
      { source: Source; target: Target; direction: number }[]
    >();
    for (const source of sources) {
      if (accepted.has(source)) continue;
      const exits = candidates.get(source)!;
      while (exits.length) {
        const direction = exits.shift()!;
        const target = targetFor(source, direction);
        if (!target || (received.get(target.id) ?? 0) >= target.capacity)
          continue;
        const group = requests.get(target.id) ?? [];
        group.push({ source, target, direction });
        requests.set(target.id, group);
        break;
      }
    }
    for (const group of requests.values()) {
      const target = group[0].target;
      if (target.belt && beltArms(c, target.belt).kind === "merger") {
        const preferred = beltArms(c, target.belt).inlets[
          target.belt.junction!.cursor
        ];
        group.sort(
          (a, b) =>
            Number(b.target.inlet === preferred) -
            Number(a.target.inlet === preferred),
        );
      }
      for (const move of group) {
        const n = received.get(target.id) ?? 0;
        if (n >= target.capacity) break;
        received.set(target.id, n + 1);
        accepted.add(move.source);
        moves.push(move);
        const destination = move.target.belt;
        if (destination && beltArms(c, destination).kind === "merger") {
          const arm = beltArms(c, destination).inlets.indexOf(
            move.target.inlet,
          );
          destination.junction!.cursor = (1 - arm) as 0 | 1;
        }
        const b = move.source.belt;
        if (b && beltArms(c, b).kind === "splitter") {
          const arm = beltArms(c, b).outlets.indexOf(move.direction);
          b.junction!.cursor = (1 - arm) as 0 | 1;
        }
      }
    }
  }
  // Old occupancy prevents a cell receiving and dispatching in this update.
  // Clear sources before applying arrivals; every successful move has one sink.
  for (const { source } of moves) {
    if (source.belt) {
      source.belt.cargo = null;
      if (source.belt.junction?.crossing)
        source.belt.junction.crossing.held = null;
    } else if (source.take) source.take();
    else change(source.inventory!, source.material, -1);
  }
  for (const { source, target, direction } of moves) {
    if (target.belt) {
      target.belt.cargo = source.material;
      if (target.belt.junction?.crossing)
        target.belt.junction.crossing.held = beltArms(
          c,
          target.belt,
        ).inlets.indexOf(target.inlet) as 0 | 1;
    } else if (target.put) target.put(source.material);
    else change(target.inventory!, source.material, 1);
    if (source.belt)
      onMove?.({
        from: { x: source.point.x, y: source.point.y },
        direction,
        material: source.material,
      });
  }
  for (const t of Object.values(s.storages)) {
    const def = c.storages.find((d) => d.id === t.definitionId)!;
    const location = key(socket(t, def, true)),
      b = s.belts[location];
    if (
      !b ||
      b.junction ||
      b.cargo ||
      occupied.has(location) ||
      received.has("belt:" + location)
    )
      continue;
    if (moves.some((move) => move.source.inventory === t.inventory)) continue;
    const material = Object.keys(t.inventory)
      .sort()
      .find((id) => t.inventory[id] > 0);
    if (
      material &&
      checkContainment(c, material, ["solid"], c.site.beltContainment).ok
    ) {
      b.cargo = material;
      change(t.inventory, material, -1);
    }
  }
  for (const b of belts) {
    const signal = b.junction?.crossing;
    if (signal && signal.pending === null && --signal.remaining === 0)
      signal.pending = (1 - signal.axis) as 0 | 1;
  }
  settleTerminalExports(c, s);
}
