import { describe, expect, it } from "vitest";
import {
  enCatalog,
  fixture,
  identityFields,
  identityKey,
  lintVoice,
  orphanIdentityKeys,
} from "../src";

const equipment = [
  ...fixture.machines.map((entry) => ["machine", entry.id] as const),
  ...fixture.storages.map((entry) => ["storage", entry.id] as const),
];

describe("shipped equipment identity copy", () => {
  it("gives every machine and storage a description, designation and nickname", () => {
    const missing = equipment.flatMap(([kind, id]) =>
      identityFields
        .map((field) => identityKey(kind, id, field))
        .filter((key) => !enCatalog[key]),
    );
    expect(missing).toEqual([]);
  });

  it("has no identity keys for equipment that does not exist", () => {
    expect(orphanIdentityKeys(fixture, enCatalog)).toEqual([]);
  });

  it("keeps designations and nicknames unique so equipment stays distinguishable", () => {
    for (const field of ["designation", "nickname"] as const) {
      const values = equipment.map(([kind, id]) => enCatalog[identityKey(kind, id, field)]);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("passes the voice lint without notes", () => {
    const own = new Set(
      equipment.flatMap(([kind, id]) =>
        identityFields.map((field) => identityKey(kind, id, field)),
      ),
    );
    expect(lintVoice(enCatalog).filter((note) => own.has(note.key))).toEqual([]);
  });

  it("states no hidden outcome: descriptions never name another material or recipe", () => {
    const hidden = [...fixture.materials.map((m) => enCatalog[m.nameKey]!.toLowerCase())];
    for (const [kind, id] of equipment) {
      const text = enCatalog[identityKey(kind, id, "description")]!.toLowerCase();
      for (const name of hidden) expect(text).not.toContain(name);
    }
  });
});
