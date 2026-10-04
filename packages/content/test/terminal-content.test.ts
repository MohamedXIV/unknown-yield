import { describe, it, expect } from "vitest";
import { fixture, validateContent, enCatalog } from "../src/index";
import { createContentStore, studioBundleFromStore } from "../src/studio";

describe("physical terminal content", () => {
  it("authors two protected edge docks and preserves them through Studio", () => {
    expect(fixture.site.terminalModules).toHaveLength(2);
    expect(fixture.site.terminalModules[0]).toMatchObject({ id: "liquid-dock", capacity: 24, cost: 30, inlet: { x: 1, y: 3, side: 1 } });
    expect(fixture.site.terminalModules[1]).toMatchObject({ id: "gas-dock", capacity: 16, cost: 36, inlet: { x: 3, y: 1, side: 0 } });
    expect(studioBundleFromStore(createContentStore(fixture), fixture).content.site.terminalModules).toEqual(fixture.site.terminalModules);
  });
  it("rejects bad geometry, protection, references and self-blocking evidence", () => {
    const mutations = [
      (c: typeof fixture) => { c.site.terminalModules.push(c.site.terminalModules[0]); },
      (c: typeof fixture) => { c.site.terminalModules[0].inlet.y = 1; },
      (c: typeof fixture) => { c.site.terminalModules[0].inlet.side = 0; },
      (c: typeof fixture) => { c.site.terminalModules[0].containmentCapabilities = []; },
      (c: typeof fixture) => { c.site.terminalModules[0].requiredTerminalCapabilityId = "missing"; },
      (c: typeof fixture) => { c.economy.milestones.find(m => m.id === "liquid-study-certified")!.requires = [{ type: "material-exported", materialId: "liquid-0", units: 1 }]; },
    ];
    for (const mutate of mutations) {
      const c = structuredClone(fixture);
      mutate(c);
      expect(() => validateContent(c, enCatalog)).toThrow();
    }
  });
});
