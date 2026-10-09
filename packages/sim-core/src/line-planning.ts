import type { Content } from "@site/content";
import { liquidConstructionCost } from "./containment";
import { gasPlacementError, key, liquidPlacementError, next } from "./geometry";
import {
  amount,
  type GameCommand,
  type LinePlacementPlan,
  type Pipe,
  type Save,
} from "./types";

type LineCommand = Extract<
  GameCommand,
  { type: "placePipes" | "placePressureLines" }
>;

/** Pure, snapshot based preflight for directed gas and liquid line paths. */
export function planLinePlacement(
  content: Content,
  save: Save,
  command: LineCommand,
): LinePlacementPlan {
  const liquid = command.type === "placePipes",
    gas = command.type === "placePressureLines",
    profileId = liquid ? command.containmentProfileId : undefined,
    perSegmentCost = liquid
      ? content.liquidLogistics
        ? liquidConstructionCost(content, "pipe", profileId!)
        : 0
      : (content.gasLogistics?.line.cost ?? 0),
    positions: LinePlacementPlan["positions"] = [],
    seen = new Set<string>();
  let newCount = 0,
    reusedCount = 0,
    blockedCount = 0,
    error: string | undefined;

  for (let index = 0; index < command.points.length; index++) {
    const point = command.points[index],
      previous = command.points[index - 1],
      positionKey = key(point);
    let reason: string | undefined;

    if (seen.has(positionKey)) reason = "A path cannot cross itself";
    else if (point.inlet === point.outlet)
      reason = "Line inlet and outlet must differ";
    else if (
      previous &&
      (key(next(previous, previous.outlet)) !== positionKey ||
        point.inlet !== (previous.outlet + 2) % 4)
    )
      reason = "Line path endpoints must connect";
    seen.add(positionKey);

    const existing = liquid
      ? save.pipes[positionKey]
      : save.pressureLines[positionKey];
    let kind: LinePlacementPlan["positions"][number]["kind"];

    if (existing) {
      if (liquid && (existing as Pipe).containmentProfileId !== profileId)
        reason ??= "Existing pipe has a different containment profile";
      else if (
        existing.inlet !== point.inlet ||
        existing.outlet !== point.outlet
      )
        reason ??= "Existing line has incompatible inlet/outlet directions";
      kind = reason ? "blocked" : "reuse";
    } else if (!reason) {
      reason = liquid
        ? (liquidPlacementError(content, save, point, "pipe") ?? undefined)
        : (gasPlacementError(content, save, point, "line") ?? undefined);
      kind = reason ? "blocked" : "add";
    } else kind = "blocked";

    if (kind === "add") newCount++;
    else if (kind === "reuse") reusedCount++;
    else {
      blockedCount++;
      error ??= reason;
    }
    positions.push({
      x: point.x,
      y: point.y,
      inlet: point.inlet,
      outlet: point.outlet,
      kind,
      ...(reason ? { reason } : {}),
    });
  }

  const cost = newCount * perSegmentCost,
    available = amount(save.stock, content.site.buildMaterial),
    shortfall = Math.max(0, cost - available);
  if (!error && shortfall > 0) error = "Not enough structural plates";
  if (!content.liquidLogistics && liquid)
    error ??= "Liquid infrastructure is not authored";
  if (!content.gasLogistics && gas)
    error ??= "Gas infrastructure is not authored";

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
