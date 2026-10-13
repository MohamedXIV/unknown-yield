import type { PlayerSnapshot, Point } from "@site/sim-core";
import type { MachineAudioCue } from "@site/content";

export type FeedbackKind =
  | "machine-start"
  | "logistics-flow"
  | "discovery"
  | "warning"
  | "hazard"
  | "placement-light"
  | "placement-heavy";

export type FeedbackEvent = {
  kind: FeedbackKind;
  /** Optional authored sound identity; does not alter semantic/visual feedback. */
  audioCue?: MachineAudioCue;
  id: string;
  at?: Point;
};

const warningStatuses = new Set([
  "needs-fuel",
  "needs-special-fuel",
  "fuel-class-locked",
  "output-full",
]);

function center(x: number, y: number, width = 1, height = 1): Point {
  return { x: x + width / 2, y: y + height / 2 };
}

function logisticsActivity(snapshot: PlayerSnapshot): {
  count: number;
  first?: Point;
} {
  let count = 0;
  let first: Point | undefined;
  const mark = (point: Point) => {
    count++;
    first ??= point;
  };

  for (const belt of snapshot.belts)
    if (belt.cargo) mark({ x: belt.x + 0.5, y: belt.y + 0.5 });
  for (const pipe of snapshot.pipes)
    if (pipe.quantity > 0) mark({ x: pipe.x + 0.5, y: pipe.y + 0.5 });
  for (const line of snapshot.pressureLines)
    if (line.quantity > 0) mark({ x: line.x + 0.5, y: line.y + 0.5 });
  for (const route of snapshot.undergroundSolids)
    if (route.cargo) mark(center(route.entry.x, route.entry.y));
  for (const route of snapshot.elevatedSolids)
    if (route.cargo) mark(center(route.entry.x, route.entry.y));
  for (const route of snapshot.undergroundLiquids)
    if (route.quantity > 0) mark(center(route.entry.x, route.entry.y));

  return { count, first };
}

export function deriveFeedbackEvents(
  previous: PlayerSnapshot,
  next: PlayerSnapshot,
): FeedbackEvent[] {
  const events = new Map<string, FeedbackEvent>();
  const push = (event: FeedbackEvent) =>
    events.set(event.kind + ":" + event.id, event);

  const audioByDefinition = new Map(next.definitions.map((def) => [def.id, def.presentation?.audio]));
  const previousMachines = new Map(
    previous.machines.map((machine) => [machine.id, machine]),
  );
  for (const machine of next.machines) {
    const before = previousMachines.get(machine.id);
    const at = center(machine.x, machine.y, machine.width, machine.height);
    const authored = audioByDefinition.get(machine.definitionId);
    const cue = (candidate: MachineAudioCue | undefined, fallback: MachineAudioCue) =>
      candidate && candidate !== fallback ? { audioCue: candidate } : {};
    if (
      before &&
      before.status !== "processing" &&
      machine.status === "processing"
    )
      push({ kind: "machine-start", id: machine.id, at, ...cue(authored?.start, "machine-start") });
    if (
      before &&
      !warningStatuses.has(before.status) &&
      warningStatuses.has(machine.status)
    )
      push({ kind: "warning", id: machine.id + ":" + machine.status, at, ...cue(authored?.blocked, "warning") });
    if (!before?.incident && machine.incident)
      push({ kind: "hazard", id: "machine:" + machine.id, at, ...cue(authored?.incident, "hazard") });
  }

  const previousPumps = new Map(previous.pumps.map((pump) => [pump.id, pump]));
  for (const pump of next.pumps) {
    const before = previousPumps.get(pump.id);
    if (!before?.incident && pump.incident)
      push({
        kind: "hazard",
        id: "pump:" + pump.id,
        at: { x: pump.x + 0.5, y: pump.y + 0.5 },
      });
  }

  const oldObservationKeys = new Set(
    previous.observations.map((observation) => observation.textKey),
  );
  for (const observation of next.observations)
    if (
      !oldObservationKeys.has(observation.textKey) &&
      observation.observedAt
    )
      push({
        kind: "discovery",
        id: observation.textKey,
        at: observation.observedAt,
      });

  const beforeFlow = logisticsActivity(previous);
  const afterFlow = logisticsActivity(next);
  if (beforeFlow.count === 0 && afterFlow.count > 0)
    push({
      kind: "logistics-flow",
      id: "network-active@" + next.tick,
      ...(afterFlow.first ? { at: afterFlow.first } : {}),
    });

  return [...events.values()];
}
