import type { Content } from "@site/content";
import { contains, next } from "./geometry";
import { status } from "./production";
import { factoryConnectionsRestored } from "./factory-lifecycle";
import {
  change,
  MACHINE_STATUSES,
  type Factory,
  type FactoryView,
  type FactoryThroughputView,
  type Save,
} from "./types";

/**
 * Phase 3 starts with a read-only projection over the detailed simulation.
 * This function never owns gameplay truth and never infers recipes or hidden
 * reaction outcomes.
 */
export function factoryView(
  content: Content,
  state: Save,
  factory: Factory,
  throughput: FactoryThroughputView = {
    state: "measuring",
    cycleTicks: null,
    inputs: [],
    outputs: [],
  },
): FactoryView {
  const statusCounts = Object.fromEntries(
    MACHINE_STATUSES.map((machineStatus) => [machineStatus, 0]),
  ) as FactoryView["contract"]["statusCounts"];

  const machines = Object.values(state.machines).filter(
    (machine) => machine.factoryId === factory.id,
  );
  for (const machine of machines)
    statusCounts[status(content, state, machine)]++;

  const gasInventory: Record<string, number> = {};
  for (const p of [
    ...Object.values(state.pressureLines),
    ...Object.values(state.pressureVessels),
  ])
    if (contains(factory, p) && p.materialId && p.quantity)
      change(gasInventory, p.materialId, p.quantity);
  const liquidInventory: Record<string, number> = {};
  for (const p of Object.values(state.pumps))
    if (contains(factory, p) && p.incident?.quantity)
      change(liquidInventory, p.incident.materialId, p.incident.quantity);
  for (const p of Object.values(state.pumps))
    if (contains(factory, p) && p.incident) statusCounts.incident++;
  for (const p of [
    ...Object.values(state.pipes),
    ...Object.values(state.tanks),
  ])
    if (contains(factory, p) && p.materialId && p.quantity)
      change(liquidInventory, p.materialId, p.quantity);
  return {
    ...factory,
    relocation: factory.relocation
      ? {
          remainingTicks: Math.max(0, factory.relocation.readyAt - state.tick),
          connectionsRestored: factoryConnectionsRestored(
            content,
            state,
            factory,
          ),
          requiredConnections: factory.relocation.requirements.length,
        }
      : null,
    ports: factory.ports.map((port) => ({
      ...port,
      role: contains(factory, next(port, port.direction))
        ? ("input" as const)
        : ("output" as const),
    })),
    contract: {
      liquidInventory,
      gasInventory,
      machineCount: machines.length,
      statusCounts,
      throughput,
    },
  };
}
