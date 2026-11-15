import { describe, expect, it } from "vitest";
import { orphanIdentityKeys, lintVoice } from "../src";
import { siteChoices } from "../src/sites";

describe("built-in sites", () => {
  const choices = siteChoices();
  it("offers site 41 and site 52", () => {
    expect(choices.map((c) => `${c.siteName} · ${c.planetName}`)).toEqual([
      "Site 41 · Outer Territory Nine",
      "Site 52 · The Pale Reach",
    ]);
  });
  it("validates the second site as a full content bundle with no orphan copy", () => {
    const bundle = choices[1]!.bundle!;
    expect(bundle.content.site.deposits.map((d) => d.id)).toContain("white-veins");
    expect(orphanIdentityKeys(bundle.content, bundle.locale)).toEqual([]);
    expect(bundle.content.locations?.activeSiteId).toBe("harmony-terrace");
  });
  it("shares rules but not geometry with site 41", () => {
    const a = choices[1]!.bundle!.content;
    expect(a.machines.length).toBeGreaterThan(0);
    expect(a.site.width).toBe(72);
  });
  it("passes the voice lint for its own copy", () => {
    const own = new Set(Object.keys(choices[1]!.bundle!.locale).filter((k) => /harmony|pale-reach|deposit\./.test(k)));
    expect(lintVoice(choices[1]!.bundle!.locale).filter((n) => own.has(n.key))).toEqual([]);
  });
});
