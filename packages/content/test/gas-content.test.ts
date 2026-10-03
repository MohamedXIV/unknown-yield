import { describe, expect, it } from "vitest";
import { fixture, validateContent } from "../src/index";
import { createContentStore, studioBundleFromStore } from "../src/studio";

describe("pressurized gas content", () => {
  it("authors distinct sealed infrastructure and hidden gas interfaces", () => {
    expect(fixture.materials.find((m) => m.id === "gas-0")?.handlingState).toBe(
      "gas",
    );
    expect(fixture.gasLogistics?.vessel.capacity).toBe(48);
    expect(
      fixture.machines.find((m) => m.id === "vaporizer")?.outputStates,
    ).toEqual(["gas"]);
    expect(
      fixture.reactions.find((r) => r.id === "vaporize-liquid-0")?.known,
    ).toBe(false);
  });
  it("rejects invalid capacity and mismatched gas machine interfaces", () => {
    const draft = structuredClone(fixture);
    expect(draft.gasLogistics).toBeDefined();
    draft.gasLogistics!.line.capacity = 0;
    expect(() => validateContent(draft)).toThrow();
    const wrong = structuredClone(fixture);
    wrong.machines.find((m) => m.id === "vaporizer")!.outputStates = ["liquid"];
    expect(() => validateContent(wrong)).toThrow(/handling/);
  });
  it("preserves gas state and configuration through Studio roundtrip", () => {
    expect(fixture.gasLogistics).toBeDefined();
    const bundle = studioBundleFromStore(createContentStore(fixture), fixture);
    expect(bundle.content).toEqual(fixture);
  });
});
