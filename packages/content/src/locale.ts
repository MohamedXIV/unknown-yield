import { z } from "zod";
import type { Content } from "./schema";
import enCatalogData from "../data/locale.en.json";

/**
 * Localization resources (Issue #14, decision D-022).
 *
 * Content identity is always a stable machine-readable ID. Player-facing
 * wording lives in locale catalogs keyed by namespaced dotted keys:
 * `material.<id>.name`, `operation.<id>.name`, `machine.<id>.name`,
 * `storage.<id>.name`, `reaction.<id>.observation`, `knowledge.insight.<id>.text`, `machine.<id>.unlock-hint`, and `hazard.<id>.*`. Renaming an English value never changes an ID
 * and never requires a save migration. This package validates catalog shape
 * and key coverage; resolution (i18next) lives outside `sim-core`.
 */
export const localeKeySchema = z.string().regex(/^[a-z0-9]+(\.[a-z0-9-]+)+$/);
export const localeCatalogSchema = z.record(localeKeySchema, z.string().min(1));
export type LocaleCatalog = z.infer<typeof localeCatalogSchema>;

export function contentKeys(c: Content): string[] {
  return [
    ...c.permits.flatMap((p) => [p.nameKey, p.noticeKey]),
    ...(c.locations?.planets.map((p) => p.nameKey) ?? []),
    ...(c.locations?.sites.map((x) => x.nameKey) ?? []),
    ...(c.liquidLogistics?.pump.containmentFailure
      ? [
          c.liquidLogistics.pump.containmentFailure.nameKey,
          c.liquidLogistics.pump.containmentFailure.descriptionKey,
        ]
      : []),
    ...c.site.terminalModules.map((d) => d.nameKey),
    ...c.site.atmosphericSources.map((d) => d.nameKey),
    ...c.containmentCapabilities.map((d) => d.nameKey),
    ...c.hazardClasses.flatMap((d) => [d.nameKey, d.evidenceKey]),
    ...(c.liquidLogistics?.containmentProfiles.map((p) => p.nameKey) ?? []),
    ...c.materials.map((m) => m.nameKey),
    ...c.fuelClasses.map((fuelClass) => fuelClass.nameKey),
    ...c.operations.map((o) => o.nameKey),
    ...c.machines.map((m) => m.nameKey),
    ...c.machines.flatMap((m) => m.operatingModes.map((mode) => mode.nameKey)),
    ...c.machines.flatMap((m) => (m.unlock ? [m.unlock.hintKey] : [])),
    ...c.junctions.map((j) => j.nameKey),
    ...c.storages.map((s) => s.nameKey),
    ...c.reactions.map((r) => r.observationKey),
    ...c.knowledgeInsights.map((insight) => insight.textKey),
    ...c.reactions.flatMap((r) =>
      r.hazard
        ? [r.hazard.nameKey, r.hazard.observationKey, r.hazard.saferHintKey]
        : [],
    ),
    ...c.economy.imports.flatMap((supply) => [supply.nameKey, supply.briefKey]),
    ...c.economy.demandShocks.flatMap((shock) => [
      shock.nameKey,
      shock.briefKey,
    ]),
    ...c.economy.orders.flatMap((order) => [order.nameKey, order.briefKey]),
    ...c.economy.directives.flatMap((directive) => [
      directive.nameKey,
      directive.briefKey,
    ]),
    ...c.economy.propertyDirectives.flatMap((directive) => [
      directive.nameKey,
      directive.briefKey,
      directive.propertyKey,
    ]),
    ...c.economy.assistancePackages.flatMap((assistance) => [
      assistance.nameKey,
      assistance.briefKey,
    ]),
    ...c.economy.terminalCapabilities.map((capability) => capability.nameKey),
    ...c.economy.milestones.flatMap((milestone) => [
      milestone.nameKey,
      milestone.hintKey,
    ]),
  ];
}

export function validateLocaleCoverage(
  c: Content,
  catalog: Record<string, string>,
): void {
  const parsed = localeCatalogSchema.parse(catalog);
  for (const key of contentKeys(c)) {
    if (!Object.hasOwn(parsed, key))
      throw new Error("Missing localization key: " + key);
  }
}

/** English catalog. Edit `packages/content/data/locale.en.json`, not this file. */
export const enCatalog: LocaleCatalog = localeCatalogSchema.parse(enCatalogData);

/** Names the player-facing tokens a catalog may use: `{{site}}`, `{{SITE}}`, `{{siteNumber}}`, `{{planet}}`, `{{PLANET}}`. */
export function locationTokens(
  c: Content,
  catalog: Record<string, string>,
): Record<string, string> {
  const loc = c.locations;
  const site = loc?.sites.find((x) => x.id === loc.activeSiteId);
  const planet = loc?.planets.find((x) => x.id === site?.planetId);
  if (!loc || !site || !planet) return {};
  const siteName = catalog[site.nameKey] ?? site.id;
  const planetName = catalog[planet.nameKey] ?? planet.id;
  return {
    site: siteName,
    SITE: siteName.toUpperCase(),
    siteNumber: site.designation,
    planet: planetName,
    PLANET: planetName.toUpperCase(),
  };
}

export function applyLocationTokens(
  catalog: LocaleCatalog,
  tokens: Record<string, string>,
): LocaleCatalog {
  const names = Object.keys(tokens);
  if (!names.length) return catalog;
  const pattern = new RegExp(`\\{\\{(${names.join("|")})\\}\\}`, "g");
  return Object.fromEntries(
    Object.entries(catalog).map(([k, v]) => [k, v.replace(pattern, (_, n: string) => tokens[n]!)]),
  );
}
