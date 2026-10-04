import type { Content } from "@site/content";
import type { Rect, Save } from "./types";

export type AtmosphericSourceDefinition =
  Content["site"]["atmosphericSources"][number];

export function atmosphericSourceDefinition(
  content: Content,
  id: string | null,
): AtmosphericSourceDefinition | undefined {
  if (!id) return undefined;
  return content.site.atmosphericSources.find((source) => source.id === id);
}

export function visibleAtmosphericSources(
  content: Content,
  state: Save,
): AtmosphericSourceDefinition[] {
  return content.site.atmosphericSources.filter((source) =>
    Object.hasOwn(state.atmosphericSources, source.id),
  );
}

export function atmosphericSourceForRect(
  content: Content,
  state: Save,
  rect: Rect,
): AtmosphericSourceDefinition | undefined {
  return visibleAtmosphericSources(content, state).find(
    (source) =>
      rect.x >= source.x &&
      rect.y >= source.y &&
      rect.x + rect.width <= source.x + source.width &&
      rect.y + rect.height <= source.y + source.height,
  );
}
