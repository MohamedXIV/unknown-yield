import type { Content } from "@site/content";
import { beltArms } from "./junctions";
import { amount, type Belt, type BeltPlacementPlan, type GameCommand, type Save } from "./types";
import { beltError, contains, footprint, key, next, socket } from "./geometry";

type BeltPathCommand = Extract<GameCommand, { type: "placeBelts" }>;

function directionBetween(from: { x: number; y: number }, to: { x: number; y: number }) {
  if (to.x > from.x) return 0;
  if (to.y > from.y) return 1;
  if (to.x < from.x) return 2;
  return 3;
}

function endpointReceiverError(
  content: Content,
  save: Save,
  point: { x: number; y: number },
  direction: number,
): string | undefined {
  for (const machine of Object.values(save.machines)) {
    const definition = content.machines.find(
      (candidate) => candidate.id === machine.definitionId,
    )!;
    if (definition.role !== "processor" || !definition.inputStates.includes("solid"))
      continue;
    const input = socket(machine, definition, false);
    if (key(input) === key(point))
      return direction === machine.direction
        ? undefined
        : "Face the machine input socket to connect this route";
    if (contains(footprint(machine, definition), next(point, direction)))
      return "Connect through the machine's actual solid input socket";
  }
  for (const storage of Object.values(save.storages)) {
    const definition = content.storages.find(
      (candidate) => candidate.id === storage.definitionId,
    )!;
    const input = socket(storage, definition, false);
    if (key(input) === key(point))
      return direction === storage.direction
        ? undefined
        : "Face the storage input socket to connect this route";
    if (contains(footprint(storage, definition), next(point, direction)))
      return "Connect through the storage's actual input socket";
  }
  return undefined;
}

/** Pure placement preflight shared by preview and the authoritative commit. */
export function planBeltPlacement(
  content: Content,
  save: Save,
  command: BeltPathCommand,
): BeltPlacementPlan {
  const seen = new Set<string>();
  const positions: BeltPlacementPlan["positions"] = [];
  let newCount = 0;
  let reusedCount = 0;
  let blockedCount = 0;
  let error: string | undefined;

  for (let index = 0; index < command.points.length; index++) {
    const point = command.points[index];
    const previous = command.points[index - 1];
    const next = command.points[index + 1];
    const plannedDirection = next
      ? directionBetween(point, next)
      : command.direction;
    const positionKey = key(point);
    let reason: string | undefined;

    if (seen.has(positionKey)) reason = "A path cannot cross itself";
    else if (
      next &&
      Math.abs(next.x - point.x) + Math.abs(next.y - point.y) !== 1
    )
      reason = "Draw adjacent cardinal cells";
    seen.add(positionKey);

    const existing: Belt | undefined = save.belts[positionKey];
    let kind: BeltPlacementPlan["positions"][number]["kind"];
    let displayDirection = plannedDirection;
    let notice: BeltPlacementPlan["positions"][number]["notice"];
    if (!reason && existing) {
      const arms = beltArms(content, existing);
      const activeDirection =
        existing.alternate !== null && existing.switched
          ? existing.alternate
          : existing.direction;
      const endpointError =
        index === command.points.length - 1
          ? endpointReceiverError(content, save, point, activeDirection)
          : undefined;
      displayDirection = next ? plannedDirection : activeDirection;
      const incomingDirection = previous
        ? directionBetween(previous, point)
        : null;
      const inlet =
        incomingDirection === null ? null : (incomingDirection + 2) % 4;
      if (
        previous &&
        next &&
        arms.kind === "crossing" &&
        incomingDirection !== plannedDirection
      )
        reason = "A crossing cannot turn between its paired arms";
      else if (
        previous &&
        !arms.inlets.includes(inlet!)
      )
        reason = "The existing belt does not accept entry from the previous cell";
      else if (next && !arms.outlets.includes(plannedDirection))
        reason = "The existing belt does not exit toward the next cell";
      else if (endpointError) reason = endpointError;
      else if (
        arms.kind === "crossing" &&
        existing.cargo &&
        next &&
        existing.junction?.crossing?.held !== null &&
        arms.outlets[existing.junction!.crossing!.held!] !== plannedDirection
      )
        reason = "Loaded crossing cargo is committed to another outlet";
      if (
        !reason &&
        arms.kind === "crossing" &&
        inlet !== null &&
        existing.junction?.crossing &&
        (existing.junction.crossing.pending !== null ||
          inlet !== arms.inlets[existing.junction.crossing.axis])
      )
        notice = "crossing-admission-wait";
      else if (!reason && arms.kind === "splitter" && next)
        notice = "splitter-branch-selection";
      kind = reason ? "blocked" : "reuse";
      if (reason) displayDirection = activeDirection;
    } else if (!reason) {
      reason = beltError(content, save, point, plannedDirection) ?? undefined;
      if (!reason && index === command.points.length - 1)
        reason = endpointReceiverError(content, save, point, plannedDirection);
      kind = reason ? "blocked" : "add";
    } else {
      kind = "blocked";
      if (existing)
        displayDirection =
          existing.alternate !== null && existing.switched
            ? existing.alternate
            : existing.direction;
    }

    if (kind === "add") newCount++;
    else if (kind === "reuse") reusedCount++;
    else {
      blockedCount++;
      error ??= reason;
    }
    positions.push({
      ...point,
      direction: displayDirection,
      kind,
      ...(reason ? { reason } : {}),
      ...(notice ? { notice } : {}),
    });
  }

  const cost = newCount * content.site.beltCost;
  const available = amount(save.stock, content.site.buildMaterial);
  const shortfall = Math.max(0, cost - available);
  if (!error && shortfall > 0) error = "Not enough structural plates";

  return {
    valid: error === undefined,
    positions,
    newCount,
    reusedCount,
    blockedCount,
    cost,
    available,
    shortfall,
    ...(error ? { error } : {}),
  };
}
