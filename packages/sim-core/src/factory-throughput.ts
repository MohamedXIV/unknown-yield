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

function topologySignature(state: Save, factory: Factory) {
  const machines = Object.values(state.machines)
    .filter((machine) => machine.factoryId === factory.id)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((machine) => ({
      id: machine.id,
      definitionId: machine.definitionId,
      x: machine.x,
      y: machine.y,
      direction: machine.direction,
      operation: machine.operation,
      enabled: machine.enabled,
      incident: machine.incident,
    }));
  const belts = Object.values(state.belts)
    .filter((belt) => contains(factory, belt))
    .sort((a, b) => key(a).localeCompare(key(b)))
    .map((belt) => ({
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

// Internal recurrence alone can look stable while a pre-existing feeder/drain
// backlog is being consumed. Include only the logistics component actually
// connected to this factory's ports so certification waits for the observed
// boundary environment to repeat too, without coupling unrelated site lines.
function connectedRuntime(content: Content, state: Save, factory: Factory) {
  const incoming = new Map<string, string[]>(),
    owners = new Map<string, { kind: "machine" | "storage"; id: string }[]>();

  const exits = (belt: (typeof state.belts)[string]) =>
    beltArms(content, belt).outlets;
  const addOwner = (
    pointKey: string,
    owner: { kind: "machine" | "storage"; id: string },
  ) => {
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

function stateSignature(content: Content, state: Save, factory: Factory) {
  const machines = Object.values(state.machines)
    .filter((machine) => machine.factoryId === factory.id)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((machine) => machineRuntime(content, state, machine.id));
  const belts = Object.values(state.belts)
    .filter((belt) => contains(factory, belt))
    .sort((a, b) => key(a).localeCompare(key(b)))
    .map((belt) => ({
      x: belt.x,
      y: belt.y,
      cargo: belt.cargo,
    }));
  return JSON.stringify({
    machines,
    belts,
    connected: connectedRuntime(content, state, factory),
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

  private ensure(state: Save, factory: Factory) {
    const topology = topologySignature(state, factory);
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
      const tracker = this.ensure(state, factory);
      const role = contains(factory, next(port, port.direction))
        ? "inputs"
        : "outputs";
      change(tracker.totals[role], event.material, 1);
      tracker.lastBoundaryTick = state.tick;
      return;
    }
  }

  observe(content: Content, state: Save) {
    const live = new Set(Object.keys(state.factories));
    for (const id of this.trackers.keys())
      if (!live.has(id)) this.trackers.delete(id);

    for (const factory of Object.values(state.factories)) {
      const tracker = this.ensure(state, factory);
      const statuses = Object.values(state.machines)
        .filter((machine) => machine.factoryId === factory.id)
        .map((machine) => status(content, state, machine));

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

      const signature = stateSignature(content, state, factory);
      const previous = tracker.seen.get(signature);
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
