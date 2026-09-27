import type { Content } from "@site/content";
import { contains, next } from "./geometry";
import { status } from "./production";
import {
  MACHINE_STATUSES,
  type Factory,
  type FactoryView,
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
): FactoryView {
  const statusCounts = Object.fromEntries(
    MACHINE_STATUSES.map((machineStatus) => [machineStatus, 0]),
  ) as FactoryView["contract"]["statusCounts"];

  const machines = Object.values(state.machines).filter(
    (machine) => machine.factoryId === factory.id,
  );
  for (const machine of machines)
    statusCounts[status(content, state, machine)]++;

  return {
    ...factory,
    ports: factory.ports.map((port) => ({
      ...port,
      role: contains(factory, next(port, port.direction))
        ? ("input" as const)
        : ("output" as const),
    })),
    contract: {
      machineCount: machines.length,
      statusCounts,
    },
  };
}
