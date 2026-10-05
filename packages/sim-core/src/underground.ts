import type { Content } from "@site/content";
import { liquidConstructionCost } from "./containment";
import { undergroundSpan } from "./geometry";
import type { Save, UndergroundLiquidRoute, UndergroundSolidRoute } from "./types";

export function undergroundSolidCost(
  c: Content,
  route: Pick<UndergroundSolidRoute, "entry" | "exit">,
): number {
  return (undergroundSpan(route.entry, route.exit) + 1) * c.site.beltCost;
}

export function undergroundLiquidCost(
  c: Content,
  route: Pick<UndergroundLiquidRoute, "entry" | "exit" | "containmentProfileId">,
): number {
  return (
    (undergroundSpan(route.entry, route.exit) + 1) *
    liquidConstructionCost(c, "pipe", route.containmentProfileId)
  );
}

export function advanceUndergroundRoutes(s: Save): void {
  for (const route of Object.values(s.undergroundSolids))
    if (route.cargo && route.cargo.remainingSteps > 0)
      route.cargo.remainingSteps--;
  for (const route of Object.values(s.undergroundLiquids))
    if (route.quantity > 0 && route.remainingSteps > 0)
      route.remainingSteps--;
}
