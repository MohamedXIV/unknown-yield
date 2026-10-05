import type { Content } from "@site/content";
import { elevatedSupportPoints, cardinalSpan } from "./geometry";
import type { ElevatedSolidRoute, Save } from "./types";

export function elevatedSolidCost(
  c: Content,
  route: Pick<ElevatedSolidRoute, "entry" | "exit">,
): number {
  return (
    (cardinalSpan(route.entry, route.exit) + 1) *
      c.site.elevatedSolid.deckCostPerCell +
    elevatedSupportPoints(c, route.entry, route.exit).length *
      c.site.elevatedSolid.supportCost
  );
}

export function advanceElevatedRoutes(s: Save): void {
  for (const route of Object.values(s.elevatedSolids))
    if (route.cargo && route.cargo.remainingSteps > 0)
      route.cargo.remainingSteps--;
}
