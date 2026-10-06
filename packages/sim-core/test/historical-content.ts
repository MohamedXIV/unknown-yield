import { fixture, validateContent } from "@site/content";
// Explicit historical fixture for testing retained migration rules, not current-save compatibility.
export const historicalFixture = validateContent({
  ...structuredClone(fixture),
  version: "historical-fixture-v1",
  fuelClasses: [],
  machines: fixture.machines.map(({ fuelClassId: _fuelClassId, ...machine }) => machine),
  site: { ...fixture.site, terminalModules: [] },
  economy: {
    ...fixture.economy,
    imports: [],
    propertyDirectives: [],
  },
  liquidLogistics: {...fixture.liquidLogistics!,pump:{...fixture.liquidLogistics!.pump,containmentFailure:undefined}},
});
