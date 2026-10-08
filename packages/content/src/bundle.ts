import { localeCatalogSchema, type LocaleCatalog } from "./locale";
import { validateContent, type Content } from "./schema";

/** Pure validated runtime boundary. Do not import TinyBase/Studio into player JS. */
export const STUDIO_BUNDLE_SCHEMA_VERSION = 1 as const;
export type StudioBundle = {
  schemaVersion: typeof STUDIO_BUNDLE_SCHEMA_VERSION;
  content: Content;
  locale: LocaleCatalog;
};

export function parseStudioBundle(input: unknown): StudioBundle {
  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      throw new Error("Studio bundle is not valid JSON");
    }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Studio bundle must be an object");
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (
    keys.length !== 3 ||
    keys[0] !== "content" ||
    keys[1] !== "locale" ||
    keys[2] !== "schemaVersion"
  ) throw new Error("Studio bundle has unknown or missing fields");
  if (record.schemaVersion !== STUDIO_BUNDLE_SCHEMA_VERSION)
    throw new Error("Unsupported Studio bundle schema");
  const locale = localeCatalogSchema.parse(record.locale);
  const content = validateContent(record.content, locale);
  return { schemaVersion: STUDIO_BUNDLE_SCHEMA_VERSION, content, locale };
}
