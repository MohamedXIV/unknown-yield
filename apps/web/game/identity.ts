import {
  identityKey,
  type IdentityField,
  type IdentityKind,
} from "@site/content";

export type EntityIdentity = {
  name: string;
  description?: string;
  designation?: string;
  /** Present only when the caller says the player has built this equipment. */
  nickname?: string;
};

type Lookup = {
  t: (key: string) => string;
  exists: (key: string) => boolean;
};

/**
 * Resolves the optional description, designation and nickname for an entity.
 * Missing keys are simply absent; nothing falls back to a raw key.
 */
export function entityIdentity(
  kind: IdentityKind,
  id: string,
  nameKey: string,
  lookup: Lookup,
  options: { built: boolean },
): EntityIdentity {
  const field = (name: IdentityField) => {
    const key = identityKey(kind, id, name);
    return lookup.exists(key) ? lookup.t(key) : undefined;
  };
  const identity: EntityIdentity = { name: lookup.t(nameKey) };
  const description = field("description");
  const designation = field("designation");
  const nickname = options.built ? field("nickname") : undefined;
  if (description) identity.description = description;
  if (designation) identity.designation = designation;
  if (nickname) identity.nickname = nickname;
  return identity;
}
