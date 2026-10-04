import {
  terminalModuleAt,
  terminalModuleDefinition,
  terminalModuleUnlocked,
} from "./terminal";
import { beltArms } from "./junctions";
import type { Content } from "@site/content";
import { contains, key, next, socket } from "./geometry";
import { status, type TransportMoveEvent } from "./production";
import {
  amount,
  change,
  total,
  type Factory,
  type FactoryThroughputView,
  type Inventory,
  type Save,
} from "./types";

type FlowTotals = { inputs: Inventory; outputs: Inventory };
type SeenState = {
  tick: number;
  inputs: Inventory;
  outputs: Inventory;
  candidateKey: string | null;
  repeats: number;
};
type Tracker = {
  topology: string;
  totals: FlowTotals;
  seen: Map<string, SeenState>;
  stable: FactoryThroughputView | null;
  lastBoundaryTick: number | null;
};

const blockedStatuses = new Set([
  "incident",
  "disabled",
  "deposit-exhausted",
  "output-full",
  "needs-fuel",
]);

// A processor can report needs-compatible-input while a multi-unit batch is
// still arriving. Keep observing that ordinary partial-batch state; stable
// certification still requires repeated detailed states and real boundary flow.

const sortedInventory = (inventory: Inventory) =>
  Object.fromEntries(
    Object.entries(inventory)
      .filter(([, value]) => value !== 0)
      .sort(([a], [b]) => a.localeCompare(b)),
  );

const copyInventory = (inventory: Inventory): Inventory => ({
  ...sortedInventory(inventory),
});

function deltaInventory(current: Inventory, previous: Inventory): Inventory {
  const result: Inventory = {};
  for (const id of new Set([
    ...Object.keys(current),
    ...Object.keys(previous),
  ])) {
    const delta = amount(current, id) - amount(previous, id);
    if (delta > 0) result[id] = delta;
  }
  return sortedInventory(result);
}

type FactoryMembers = {
  machines: Save["machines"][string][];
  belts: Save["belts"][string][];
  pressureLines: Save["pressureLines"][string][];
  pressureVessels: Save["pressureVessels"][string][];
  compressors: Save["compressors"][string][];
  pipes: Save["pipes"][string][];
  tanks: Save["tanks"][string][];
  pumps: Save["pumps"][string][];
};

// Saves and commands validate integer cell coordinates and canonical belt keys.
// Membership is fresh per call; sorting changes only these temporary arrays.
function factoryMembers(
  state: Save,
  factory: Factory,
  machines = Object.values(state.machines).filter(
    (machine) => machine.factoryId === factory.id,
  ),
): FactoryMembers {
  const belts: FactoryMembers["belts"] = [];
  for (let y = factory.y; y < factory.y + factory.height; y++)
    for (let x = factory.x; x < factory.x + factory.width; x++) {
      const belt = state.belts[key({ x, y })];
      if (belt) belts.push(belt);
    }
  return {
    pressureLines: Object.values(state.pressureLines)
      .filter((p) => contains(factory, p))
      .sort((a, b) => key(a).localeCompare(key(b))),
    pressureVessels: Object.values(state.pressureVessels)
      .filter((p) => contains(factory, p))
      .sort((a, b) => a.id.localeCompare(b.id)),
    compressors: Object.values(state.compressors)
      .filter((p) => contains(factory, p))
      .sort((a, b) => a.id.localeCompare(b.id)),
    pipes: Object.values(state.pipes)
      .filter((p) => contains(factory, p))
      .sort((a, b) => key(a).localeCompare(key(b))),
    tanks: Object.values(state.tanks)
      .filter((p) => contains(factory, p))
      .sort((a, b) => a.id.localeCompare(b.id)),
    pumps: Object.values(state.pumps)
      .filter((p) => contains(factory, p))
      .sort((a, b) => a.id.localeCompare(b.id)),
    machines: machines.sort((a, b) => a.id.localeCompare(b.id)),
    belts: belts.sort((a, b) => key(a).localeCompare(key(b))),
  };
}

function machineMembership(state: Save) {
  const groups = new Map<string, FactoryMembers["machines"]>();
  for (const machine of Object.values(state.machines)) {
    if (machine.factoryId === null) continue;
    const members = groups.get(machine.factoryId) ?? [];
    members.push(machine);
    groups.set(machine.factoryId, members);
  }
  return groups;
}

function topologySignature(factory: Factory, members: FactoryMembers) {
  const machines = members.machines.map((machine) => ({
    id: machine.id,
    definitionId: machine.definitionId,
    x: machine.x,
    y: machine.y,
    direction: machine.direction,
    operation: machine.operation,
    enabled: machine.enabled,
    incident: machine.incident,
  }));
  const belts = members.belts.map((belt) => ({
    x: belt.x,
    y: belt.y,
    direction: belt.direction,
    alternate: belt.alternate,
    switched: belt.switched,
    junction: belt.junction
      ? {
          definitionId: belt.junction.definitionId,
          branch: belt.junction.branch,
        }
      : null,
  }));
  const ports = [...factory.ports]
    .sort((a, b) => key(a).localeCompare(key(b)))
    .map((port) => ({
      x: port.x,
      y: port.y,
      direction: port.direction,
    }));
  return JSON.stringify({
    x: factory.x,
    y: factory.y,
    width: factory.width,
    height: factory.height,
    ports,
    machines,
    belts,
    pressureLines: members.pressureLines.map(({ id, x, y, inlet, outlet }) => ({
      id,
      x,
      y,
      inlet,
      outlet,
    })),
    pressureVessels: members.pressureVessels.map(({ id, x, y, direction }) => ({
      id,
      x,
      y,
      direction,
    })),
    compressors: members.compressors,
    pipes: members.pipes.map(
      ({ id, x, y, inlet, outlet, containmentProfileId }) => ({
        containmentProfileId,
        id,
        x,
        y,
        inlet,
        outlet,
      }),
    ),
    tanks: members.tanks.map(
      ({ id, x, y, direction, containmentProfileId }) => ({
        containmentProfileId,
        id,
        x,
        y,
        direction,
      }),
    ),
    pumps: members.pumps,
  });
}

function machineRuntime(content: Content, state: Save, id: string) {
  const machine = state.machines[id];
  return {
    id: machine.id,
    status: status(content, state, machine),
    input: sortedInventory(machine.input),
    output: sortedInventory(machine.output),
    job: machine.job
      ? {
          remaining: machine.job.remaining,
          reaction: machine.job.reaction,
        }
      : null,
  };
}

type ConnectedOwner = { kind: "machine" | "storage"; id: string };
type ConnectedTopology = {
  incoming: ReadonlyMap<string, readonly string[]>;
  owners: ReadonlyMap<string, readonly ConnectedOwner[]>;
  gases: ReadonlyMap<string, readonly string[]>;
  liquids: ReadonlyMap<string, readonly string[]>;
};

function connectedTopology(content: Content, state: Save): ConnectedTopology {
  const incoming = new Map<string, string[]>(),
    owners = new Map<string, ConnectedOwner[]>();

  const exits = (belt: (typeof state.belts)[string]) =>
    beltArms(content, belt).outlets;
  const addOwner = (pointKey: string, owner: ConnectedOwner) => {
    const list = owners.get(pointKey) ?? [];
    list.push(owner);
    owners.set(pointKey, list);
  };

  for (const belt of Object.values(state.belts)) {
    for (const direction of exits(belt)) {
      const targetKey = key(next(belt, direction));
      const target = state.belts[targetKey];
      if (
        !target ||
        !beltArms(content, target).inlets.includes((direction + 2) % 4)
      )
        continue;
      const list = incoming.get(targetKey) ?? [];
      list.push(key(belt));
      incoming.set(targetKey, list);
    }
  }

  for (const machine of Object.values(state.machines)) {
    const definition = content.machines.find(
      (candidate) => candidate.id === machine.definitionId,
    )!;
    addOwner(key(socket(machine, definition, true)), {
      kind: "machine",
      id: machine.id,
    });
    if (definition.role === "processor")
      addOwner(key(socket(machine, definition, false)), {
        kind: "machine",
        id: machine.id,
      });
  }

  for (const storage of Object.values(state.storages)) {
    const definition = content.storages.find(
      (candidate) => candidate.id === storage.definitionId,
    )!;
    addOwner(key(socket(storage, definition, true)), {
      kind: "storage",
      id: storage.id,
    });
    addOwner(key(socket(storage, definition, false)), {
      kind: "storage",
      id: storage.id,
    });
  }

  return {
    incoming,
    owners,
    gases: gasTopology(content, state),
    liquids: liquidTopology(content, state),
  };
}

function gasTopology(content: Content, state: Save) {
  const graph = new Map<string, string[]>(),
    cfg = content.gasLogistics;
  if (
    !cfg ||
    (!Object.keys(state.pressureLines).length &&
      !Object.keys(state.compressors).length &&
      !Object.keys(state.pressureVessels).length)
  )
    return graph;
  const link = (a: string, b: string) => {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ]) {
      const list = graph.get(from) ?? [];
      list.push(to);
      graph.set(from, list);
    }
  };
  const endpoint = (p: { x: number; y: number }, direction: number) => {
    for (const t of Object.values(state.pressureVessels))
      if (
        t.direction === direction &&
        key(socket(t, cfg.vessel, false)) === key(p)
      )
        return "vessel:" + t.id;
    for (const m of Object.values(state.machines)) {
      const d = content.machines.find((d) => d.id === m.definitionId)!;
      if (
        d.inputStates.includes("gas") &&
        m.direction === direction &&
        key(socket(m, d, false)) === key(p)
      )
        return "machine:" + m.id;
    }
    const module = terminalModuleAt(
      content,
      next(p, direction),
      direction,
      "gas",
    );
    return module ? "terminal:" + module.id : null;
  };
  for (const p of Object.values(state.pressureLines)) {
    const target = state.pressureLines[key(next(p, p.outlet))];
    if (target && target.inlet === (p.outlet + 2) % 4)
      link("line:" + key(p), "line:" + key(target));
    const owner = endpoint(p, p.outlet);
    if (owner) link("line:" + key(p), owner);
  }
  for (const p of Object.values(state.compressors)) {
    const node = "compressor:" + p.id,
      target = state.pressureLines[key(next(p, p.direction))];
    if (target && target.inlet === (p.direction + 2) % 4)
      link(node, "line:" + key(target));
    for (const t of Object.values(state.pressureVessels))
      if (
        t.direction === p.direction &&
        key(socket(t, cfg.vessel, true)) === key(p)
      )
        link(node, "vessel:" + t.id);
    for (const m of Object.values(state.machines)) {
      const d = content.machines.find((d) => d.id === m.definitionId)!;
      if (
        d.outputStates.includes("gas") &&
        m.direction === p.direction &&
        key(socket(m, d, true)) === key(p)
      )
        link(node, "machine:" + m.id);
    }
  }
  return graph;
}
function gasRuntime(
  content: Content,
  state: Save,
  members: FactoryMembers,
  graph: ConnectedTopology["gases"],
) {
  const queue = [
      ...members.pressureLines.map((p) => "line:" + key(p)),
      ...members.pressureVessels.map((p) => "vessel:" + p.id),
      ...members.compressors.map((p) => "compressor:" + p.id),
      ...members.machines.map((m) => "machine:" + m.id),
    ],
    seen = new Set<string>();
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if (seen.has(node)) continue;
    seen.add(node);
    for (const neighbour of graph.get(node) ?? [])
      if (!seen.has(neighbour)) queue.push(neighbour);
  }
  return [...seen]
    .sort()
    .filter((node) => !node.startsWith("machine:") || graph.has(node))
    .map((node) => {
      const split = node.indexOf(":"),
        kind = node.slice(0, split),
        id = node.slice(split + 1);
      if (kind === "line") return { node, ...state.pressureLines[id] };
      if (kind === "vessel") return { node, ...state.pressureVessels[id] };
      if (kind === "compressor") return { node, ...state.compressors[id] };
      if (kind === "terminal") {
        const d = terminalModuleDefinition(content, id)!;
        return {
          node,
          definition: d,
          installed: !!state.terminalModules[id],
          unlocked: terminalModuleUnlocked(content, state, id),
          contents: state.terminalModules[id] ?? null,
          policies: Object.fromEntries(
            content.materials
              .filter((m) => m.handlingState === d.handlingState)
              .map((m) => [m.id, state.policies[m.id] ?? "keep"]),
          ),
        };
      }
      return { node, ...machineRuntime(content, state, id) };
    });
}

function liquidTopology(content: Content, state: Save) {
  const graph = new Map<string, string[]>(),
    cfg = content.liquidLogistics;
  if (
    !cfg ||
    (!Object.keys(state.pipes).length &&
      !Object.keys(state.pumps).length &&
      !Object.keys(state.tanks).length)
  )
    return graph;
  const link = (a: string, b: string) => {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ]) {
      const list = graph.get(from) ?? [];
      list.push(to);
      graph.set(from, list);
    }
  };
  const endpoint = (p: { x: number; y: number }, direction: number) => {
    for (const t of Object.values(state.tanks))
      if (
        t.direction === direction &&
        key(socket(t, cfg.tank, false)) === key(p)
      )
        return "tank:" + t.id;
    for (const m of Object.values(state.machines)) {
      const d = content.machines.find((d) => d.id === m.definitionId)!;
      if (
        d.inputStates.includes("liquid") &&
        m.direction === direction &&
        key(socket(m, d, false)) === key(p)
      )
        return "machine:" + m.id;
    }
    const module = terminalModuleAt(
      content,
      next(p, direction),
      direction,
      "liquid",
    );
    return module ? "terminal:" + module.id : null;
  };
  for (const p of Object.values(state.pipes)) {
    const target = state.pipes[key(next(p, p.outlet))];
    if (target && target.inlet === (p.outlet + 2) % 4)
      link("pipe:" + key(p), "pipe:" + key(target));
    const owner = endpoint(p, p.outlet);
    if (owner) link("pipe:" + key(p), owner);
  }
  for (const p of Object.values(state.pumps)) {
    const node = "pump:" + p.id,
      target = state.pipes[key(next(p, p.direction))];
    if (target && target.inlet === (p.direction + 2) % 4)
      link(node, "pipe:" + key(target));
    for (const t of Object.values(state.tanks))
      if (
        t.direction === p.direction &&
        key(socket(t, cfg.tank, true)) === key(p)
      )
        link(node, "tank:" + t.id);
    for (const m of Object.values(state.machines)) {
      const d = content.machines.find((d) => d.id === m.definitionId)!;
      if (
        d.outputStates.includes("liquid") &&
        m.direction === p.direction &&
        key(socket(m, d, true)) === key(p)
      )
        link(node, "machine:" + m.id);
    }
  }
  return graph;
}
function liquidRuntime(
  content: Content,
  state: Save,
  members: FactoryMembers,
  graph: ConnectedTopology["liquids"],
) {
  const queue = [
      ...members.pipes.map((p) => "pipe:" + key(p)),
      ...members.tanks.map((p) => "tank:" + p.id),
      ...members.pumps.map((p) => "pump:" + p.id),
      ...members.machines.map((m) => "machine:" + m.id),
    ],
    seen = new Set<string>();
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if (seen.has(node)) continue;
    seen.add(node);
    for (const neighbour of graph.get(node) ?? [])
      if (!seen.has(neighbour)) queue.push(neighbour);
  }
  return [...seen]
    .sort()
    .filter((node) => !node.startsWith("machine:") || graph.has(node))
    .map((node) => {
      const split = node.indexOf(":"),
        kind = node.slice(0, split),
        id = node.slice(split + 1);
      if (kind === "pipe") return { node, ...state.pipes[id] };
      if (kind === "tank") return { node, ...state.tanks[id] };
      if (kind === "pump") return { node, ...state.pumps[id] };
      if (kind === "terminal") {
        const d = terminalModuleDefinition(content, id)!;
        return {
          node,
          definition: d,
          installed: !!state.terminalModules[id],
          unlocked: terminalModuleUnlocked(content, state, id),
          contents: state.terminalModules[id] ?? null,
          policies: Object.fromEntries(
            content.materials
              .filter((m) => m.handlingState === d.handlingState)
              .map((m) => [m.id, state.policies[m.id] ?? "keep"]),
          ),
        };
      }
      return { node, ...machineRuntime(content, state, id) };
    });
}

// Internal recurrence alone can look stable while a pre-existing feeder/drain
// backlog is being consumed. Include only the logistics component actually
// connected to this factory's ports so certification waits for the observed
// boundary environment to repeat too, without coupling unrelated site lines.
function connectedRuntime(
  content: Content,
  state: Save,
  factory: Factory,
  topology: ConnectedTopology,
) {
  const { incoming, owners } = topology;
  const exits = (belt: (typeof state.belts)[string]) =>
    beltArms(content, belt).outlets;
  const queue = factory.ports
      .map((port) => key(port))
      .filter((pointKey) => state.belts[pointKey]),
    seenBelts = new Set<string>(),
    seenMachines = new Set<string>(),
    seenStorages = new Set<string>();
  let touchesTerminal = false;

  while (queue.length) {
    const pointKey = queue.shift()!;
    if (seenBelts.has(pointKey)) continue;
    const belt = state.belts[pointKey];
    if (!belt) continue;
    seenBelts.add(pointKey);

    for (const direction of exits(belt)) {
      const target = next(belt, direction),
        targetKey = key(target);
      if (
        state.belts[targetKey] &&
        beltArms(content, state.belts[targetKey]).inlets.includes(
          (direction + 2) % 4,
        )
      )
        queue.push(targetKey);
      if (contains(content.site.terminal, target)) touchesTerminal = true;
    }
    for (const source of incoming.get(pointKey) ?? []) queue.push(source);

    for (const owner of owners.get(pointKey) ?? []) {
      if (owner.kind === "machine") {
        if (seenMachines.has(owner.id)) continue;
        seenMachines.add(owner.id);
        const machine = state.machines[owner.id],
          definition = content.machines.find(
            (candidate) => candidate.id === machine.definitionId,
          )!;
        for (const output of [true, false]) {
          if (!output && definition.role !== "processor") continue;
          const socketKey = key(socket(machine, definition, output));
          if (state.belts[socketKey]) queue.push(socketKey);
        }
      } else {
        if (seenStorages.has(owner.id)) continue;
        seenStorages.add(owner.id);
        const storage = state.storages[owner.id],
          definition = content.storages.find(
            (candidate) => candidate.id === storage.definitionId,
          )!;
        for (const output of [true, false]) {
          const socketKey = key(socket(storage, definition, output));
          if (state.belts[socketKey]) queue.push(socketKey);
        }
      }
    }
  }

  return {
    belts: [...seenBelts].sort().map((pointKey) => {
      const belt = state.belts[pointKey];
      return {
        x: belt.x,
        y: belt.y,
        cargo: belt.cargo,
        junctionCursor: belt.junction?.cursor ?? null,
        crossingState: belt.junction?.crossing ?? null,
        direction: belt.direction,
        alternate: belt.alternate,
        switched: belt.switched,
        junction: belt.junction
          ? {
              definitionId: belt.junction.definitionId,
              branch: belt.junction.branch,
            }
          : null,
      };
    }),
    machines: [...seenMachines]
      .sort()
      .map((id) => machineRuntime(content, state, id)),
    storages: [...seenStorages].sort().map((id) => ({
      id,
      inventory: sortedInventory(state.storages[id].inventory),
    })),
    staging: touchesTerminal ? sortedInventory(state.staging) : null,
  };
}

function stateSignature(
  content: Content,
  state: Save,
  factory: Factory,
  topology: ConnectedTopology,
  members: FactoryMembers,
) {
  const machines = members.machines.map((machine) =>
    machineRuntime(content, state, machine.id),
  );
  const belts = members.belts.map((belt) => ({
    x: belt.x,
    y: belt.y,
    cargo: belt.cargo,
    junctionCursor: belt.junction?.cursor ?? null,
    crossingState: belt.junction?.crossing ?? null,
  }));
  return JSON.stringify({
    machines,
    belts,
    connected: connectedRuntime(content, state, factory, topology),
    gases: gasRuntime(content, state, members, topology.gases),
    liquids: liquidRuntime(content, state, members, topology.liquids),
  });
}

function rateRows(inventory: Inventory, cycleTicks: number, tickMs: number) {
  return Object.entries(sortedInventory(inventory)).map(
    ([materialId, units]) => ({
      materialId,
      units,
      cycleTicks,
      unitsPerMinute:
        Math.round((units * 60000 * 1000) / (cycleTicks * tickMs)) / 1000,
    }),
  );
}

function measuring(): FactoryThroughputView {
  return { state: "measuring", cycleTicks: null, inputs: [], outputs: [] };
}

/**
 * Throughput certification is transient evidence derived from detailed runtime
 * behavior. It is intentionally absent from Save: loading resets measurement
 * and the same detailed state must earn the same certification again.
 */
export class FactoryThroughputMonitor {
  private trackers = new Map<string, Tracker>();

  reset() {
    this.trackers.clear();
  }

  private ensure(factory: Factory, members: FactoryMembers) {
    const topology = topologySignature(factory, members);
    let tracker = this.trackers.get(factory.id);
    if (!tracker || tracker.topology !== topology) {
      tracker = {
        topology,
        totals: { inputs: {}, outputs: {} },
        seen: new Map(),
        stable: null,
        lastBoundaryTick: null,
      };
      this.trackers.set(factory.id, tracker);
    }
    return tracker;
  }

  recordMove(state: Save, event: TransportMoveEvent) {
    for (const factory of Object.values(state.factories)) {
      const port = factory.ports.find(
        (candidate) =>
          key(candidate) === key(event.from) &&
          candidate.direction === event.direction,
      );
      if (!port) continue;
      const tracker = this.ensure(factory, factoryMembers(state, factory));
      const role = contains(factory, next(port, port.direction))
        ? "inputs"
        : "outputs";
      change(tracker.totals[role], event.material, event.units ?? 1);
      tracker.lastBoundaryTick = state.tick;
      return;
    }
  }

  observe(content: Content, state: Save) {
    // Shared only within this synchronous observation; next call rebuilds routing.
    let topology: ConnectedTopology | undefined;
    const machinesByFactory = machineMembership(state);
    const live = new Set(Object.keys(state.factories));
    for (const id of this.trackers.keys())
      if (!live.has(id)) this.trackers.delete(id);

    for (const factory of Object.values(state.factories)) {
      const members = factoryMembers(
        state,
        factory,
        machinesByFactory.get(factory.id) ?? [],
      );
      const tracker = this.ensure(factory, members);
      const statuses = members.machines.map((machine) =>
        status(content, state, machine),
      );

      if (
        statuses.some((machineStatus) => blockedStatuses.has(machineStatus))
      ) {
        tracker.stable = null;
        tracker.seen.clear();
        continue;
      }

      if (
        tracker.stable &&
        tracker.lastBoundaryTick !== null &&
        state.tick - tracker.lastBoundaryTick >
          Math.max(
            tracker.stable.cycleTicks! * 2,
            content.site.transportEveryTicks * 20,
          )
      ) {
        tracker.stable = null;
        tracker.seen.clear();
      }

      const signature = stateSignature(
        content,
        state,
        factory,
        (topology ??= connectedTopology(content, state)),
        members,
      );
      const previous = tracker.seen.get(signature);
      // A certificate describes a repeated detailed state. A newly observed
      // connected backlog or route state must earn recurrence again.
      if (!previous) tracker.stable = null;
      const current: SeenState = {
        tick: state.tick,
        inputs: copyInventory(tracker.totals.inputs),
        outputs: copyInventory(tracker.totals.outputs),
        candidateKey: null,
        repeats: 0,
      };

      if (previous && state.tick > previous.tick) {
        const cycleTicks = state.tick - previous.tick;
        const inputs = deltaInventory(tracker.totals.inputs, previous.inputs);
        const outputs = deltaInventory(
          tracker.totals.outputs,
          previous.outputs,
        );
        if (total(inputs) > 0 && total(outputs) > 0) {
          const candidateKey = JSON.stringify({
            cycleTicks,
            inputs,
            outputs,
          });
          current.candidateKey = candidateKey;
          current.repeats =
            previous.candidateKey === candidateKey ? previous.repeats + 1 : 1;
          if (current.repeats >= 2) {
            tracker.stable = {
              state: "stable",
              cycleTicks,
              inputs: rateRows(inputs, cycleTicks, content.tickMs),
              outputs: rateRows(outputs, cycleTicks, content.tickMs),
            };
          }
        }
      }

      tracker.seen.set(signature, current);
      if (tracker.seen.size > 5000) {
        tracker.seen.clear();
        tracker.stable = null;
      }
    }
  }

  view(factoryId: string): FactoryThroughputView {
    return this.trackers.get(factoryId)?.stable ?? measuring();
  }
}
