import { describe, expect, it } from "vitest";
import { fixture, validateContent } from "../src/index";

describe("liquid handling content", () => {
  it("classifies existing materials and machine interfaces as solid", () => {
    expect(
      fixture.materials
        .filter((m) => m.id !== "liquid-0")
        .every((m) => m.handlingState === "solid"),
    ).toBe(true);
    expect(
      fixture.machines
        .filter((m) => !["liquefier", "precipitator"].includes(m.id))
        .every(
          (m) =>
            m.inputStates.includes("solid") && m.outputStates.includes("solid"),
        ),
    ).toBe(true);
  });
  it("authors bounded pipe, tank and pump limits", () => {
    expect(fixture.liquidLogistics?.pipe.capacity).toBe(4);
    expect(fixture.liquidLogistics?.tank.capacity).toBe(64);
    expect(fixture.liquidLogistics?.pump.fuel).toBe(1);
    const content = structuredClone(fixture);
    content.liquidLogistics!.pipe.capacity = 0;
    expect(() => validateContent(content)).toThrow();
  });
  it("rejects reactions whose material states mismatch their capable machine", () => {
    const content = structuredClone(fixture);
    content.materials.find((m) => m.id === "raw")!.handlingState = "liquid";
    expect(() => validateContent(content)).toThrow(/handling/i);
  });
});
