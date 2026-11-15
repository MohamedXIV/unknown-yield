import { describe, expect, it } from "vitest";
import { enCatalog, fixture, identityFields, identityKey, lintVoice } from "../src";

const deposits = [...fixture.site.deposits, ...fixture.site.hiddenDeposits];
const known = fixture.materials.filter((m) => m.known);

describe("deposit and material identity copy", () => {
  it("names, tags, nicknames and describes every deposit", () => {
    const missing = deposits.flatMap((d) =>
      [...identityFields, "name"]
        .map((f) => `deposit.${d.id}.${f}`)
        .filter((key) => !enCatalog[key]),
    );
    expect(missing).toEqual([]);
  });

  it("keeps deposit names, survey tags and nicknames unique", () => {
    for (const field of ["name", "designation", "nickname"]) {
      const values = deposits.map((d) => enCatalog[`deposit.${d.id}.${field}`]);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("describes only materials the player already knows", () => {
    for (const m of fixture.materials.filter((x) => !x.known))
      expect(enCatalog[identityKey("material", m.id, "description")]).toBeUndefined();
    for (const m of known)
      expect(enCatalog[identityKey("material", m.id, "description")]).toBeTruthy();
  });

  it("never names an unknown material in deposit or material copy", () => {
    const hidden = fixture.materials
      .filter((m) => !m.known)
      .map((m) => enCatalog[m.nameKey]!.toLowerCase());
    const keys = Object.keys(enCatalog).filter((k) => /^(deposit|material)\./.test(k) && !k.endsWith(".name"));
    for (const key of keys)
      for (const name of hidden) expect(enCatalog[key]!.toLowerCase(), key).not.toContain(name);
  });

  it("passes the voice lint without notes", () => {
    const own = new Set(Object.keys(enCatalog).filter((k) => /^(deposit|material)\./.test(k)));
    expect(lintVoice(enCatalog).filter((n) => own.has(n.key))).toEqual([]);
  });
});
