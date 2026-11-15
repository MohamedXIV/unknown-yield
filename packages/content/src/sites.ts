import contentData from "../data/content.json";
import harmonyTerrace from "../data/sites/harmony-terrace.json";
import { enCatalog, locationTokens, type LocaleCatalog } from "./locale";
import { validateContent, type Content } from "./schema";
import { fixture } from "./fixture";
import type { StudioBundle } from "./bundle";

/**
 * Built-in sites. Site 41 is the base content (`content.json`). Every other
 * site is a data file under `data/sites/` that replaces parts of the base
 * `site` block and adds its own names. One expedition plays one site; saves are
 * bound to the site's content fingerprint.
 */
type SiteFile = {
  id: string;
  planet: { id: string; designation: string; nameKey: string };
  site: { id: string; planetId: string; designation: string; nameKey: string };
  siteOverrides: Record<string, unknown>;
  locale: LocaleCatalog;
};

const siteFiles: readonly SiteFile[] = [harmonyTerrace as SiteFile];

export type SiteChoice = {
  id: string;
  /** `null` is the base content (no pack needed). */
  bundle: StudioBundle | null;
  siteName: string;
  planetName: string;
};

function composeBundle(file: SiteFile): StudioBundle {
  const base = structuredClone(contentData) as Record<string, unknown>;
  const site = { ...(base.site as Record<string, unknown>), ...file.siteOverrides };
  const raw = {
    ...base,
    site,
    locations: {
      activeSiteId: file.site.id,
      planets: [file.planet],
      sites: [file.site],
    },
  };
  const deposits = new Set(
    [...(site.deposits as { id: string }[]), ...(site.hiddenDeposits as { id: string }[])].map((d) => d.id),
  );
  // Other sites' deposit copy would be orphaned here, so it is left out.
  const merged: LocaleCatalog = {};
  for (const [key, value] of Object.entries({ ...enCatalog, ...file.locale })) {
    const match = /^deposit\.(.+)\.(name|description|designation|nickname)$/.exec(key);
    if (match && !deposits.has(match[1]!)) continue;
    merged[key] = value;
  }
  const content: Content = validateContent(raw, merged);
  return { schemaVersion: 1, content, locale: merged };
}

let cache: SiteChoice[] | null = null;
export function siteChoices(): SiteChoice[] {
  if (cache) return cache;
  const label = (c: Content, catalog: LocaleCatalog) => {
    const tokens = locationTokens(c, catalog);
    return { siteName: tokens.site ?? "", planetName: tokens.planet ?? "" };
  };
  const base = label(fixture, enCatalog);
  const choices: SiteChoice[] = [
    { id: fixture.locations?.activeSiteId ?? "default", bundle: null, ...base },
  ];
  for (const file of siteFiles) {
    const bundle = composeBundle(file);
    choices.push({ id: file.id, bundle, ...label(bundle.content, bundle.locale) });
  }
  cache = choices;
  return choices;
}

