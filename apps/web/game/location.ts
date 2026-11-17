import { i18n, activeSiteId } from "./i18n";

/**
 * Site-specific presentation text. Each field resolves `site.<id>.<field>`
 * first, then the generic `ui.location.<field>`, so a new site only writes
 * the lines that differ from the default.
 */
export type LocationField = "hud" | "terminal" | "terminal-subtitle" | "work-eyebrow";

export function locationText(field: LocationField): string {
  const own = `site.${activeSiteId()}.${field}`;
  return i18n.t(i18n.exists(own) ? own : `ui.location.${field}`);
}
