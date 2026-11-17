/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { applyLocationTokens, enCatalog, fixture, locationTokens, validateContent } from "../src";
import contentData from "../data/content.json";

describe("locations", () => {
  it("resolves the active site into tokens", () => {
    expect(locationTokens(fixture, enCatalog)).toEqual({
      site: "Site 41",
      SITE: "SITE 41",
      siteNumber: "41",
      planet: "Outer Territory Nine",
      PLANET: "OUTER TERRITORY NINE",
    });
  });
  it("substitutes only the reserved tokens", () => {
    const out = applyLocationTokens({ "a.b": "{{SITE}} {{keep}}" }, locationTokens(fixture, enCatalog));
    expect(out["a.b"]).toBe("SITE 41 {{keep}}");
  });
  it("rejects a site on an unknown planet or a missing active site", () => {
    const bad = structuredClone(contentData) as Record<string, any>;
    bad.locations.sites[0].planetId = "nowhere";
    expect(() => validateContent(bad)).toThrow();
    const bad2 = structuredClone(contentData) as Record<string, any>;
    bad2.locations.activeSiteId = "nowhere";
    expect(() => validateContent(bad2)).toThrow();
  });
  it("accepts a second planet and site as data only", () => {
    const next = structuredClone(contentData) as Record<string, any>;
    next.locations.planets.push({ id: "pale-reach", designation: "3", nameKey: "planet.pale-reach.name" });
    next.locations.sites.push({ id: "second-shelf", planetId: "pale-reach", designation: "12", nameKey: "site.second-shelf.name" });
    const catalog = { ...enCatalog, "planet.pale-reach.name": "The Pale Reach", "site.second-shelf.name": "Site 12" };
    expect(validateContent(next, catalog).locations?.sites).toHaveLength(2);
    next.locations.activeSiteId = "second-shelf";
    expect(locationTokens(validateContent(next, catalog), catalog).PLANET).toBe("THE PALE REACH");
  });
});
