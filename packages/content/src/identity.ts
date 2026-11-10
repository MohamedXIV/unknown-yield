import type { LocaleCatalog } from "./locale";
import type { Content } from "./schema";

/**
 * Optional presentation layers on top of an entity's plain name.
 *
 * Keys follow `<kind>.<id>.<field>` (for example `machine.extractor.nickname`)
 * and are never required: add one to the English catalog and the game shows it.
 * - description: one plain sentence about what the thing is for.
 * - designation: the official code on its typeplate.
 * - nickname: what the workshop calls it; shown only for equipment the player
 *   has actually built.
 * None of them may name a hidden recipe or outcome.
 */
export const identityKinds = ["machine", "storage"] as const;
export type IdentityKind = (typeof identityKinds)[number];
export const identityFields = ["description", "designation", "nickname"] as const;
export type IdentityField = (typeof identityFields)[number];

export const identityKey = (
  kind: IdentityKind,
  id: string,
  field: IdentityField,
): string => `${kind}.${id}.${field}`;

const IDENTITY_KEY = new RegExp(
  `^(${identityKinds.join("|")})\\.(.+)\\.(${identityFields.join("|")})$`,
);

/** Identity keys whose entity does not exist (typo or a removed entity). */
export function orphanIdentityKeys(
  content: Content,
  catalog: LocaleCatalog,
): string[] {
  const ids: Record<IdentityKind, Set<string>> = {
    machine: new Set(content.machines.map((entry) => entry.id)),
    storage: new Set(content.storages.map((entry) => entry.id)),
  };
  return Object.keys(catalog)
    .filter((key) => {
      const match = IDENTITY_KEY.exec(key);
      return match !== null && !ids[match[1] as IdentityKind].has(match[2]!);
    })
    .sort();
}
