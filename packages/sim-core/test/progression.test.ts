import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import { machineUnlocked } from "../src/progression";

describe("knowledge-gated capability identity", () => {
  const oversealed = fixture.machines.find(
      (machine) => machine.id === "oversealed-furnace",
    )!,
    relief = fixture.machines.find(
      (machine) => machine.id === "relief-furnace",
    )!;

  it("depends on confirmed reaction identity, not resources or localized hint wording", () => {
    const locked = {
      knowledge: [],
      fuel: 999999,
      stock: { plates: 999999 },
    };
    expect(machineUnlocked(locked, oversealed)).toBe(false);

    const renamedHint = structuredClone(oversealed);
    renamedHint.unlock!.hintKey = "machine.oversealed-furnace.some-other-copy";
    expect(
      machineUnlocked(
        { knowledge: ["heat-raw-sealed"] },
        renamedHint,
      ),
    ).toBe(true);
    expect(machineUnlocked(locked, renamedHint)).toBe(false);
  });

  it("does not require a parallel persisted unlock flag", () => {
    expect(machineUnlocked({ knowledge: ["heat-raw-sealed"] }, oversealed)).toBe(
      true,
    );
    expect(Object.keys({ knowledge: ["heat-raw-sealed"] })).toEqual([
      "knowledge",
    ]);
  });

  it("derives a safety capability only from observed hazard evidence", () => {
    expect(machineUnlocked({ knowledge: [], hazardEvidence: [] }, relief)).toBe(
      false,
    );
    expect(
      machineUnlocked(
        { knowledge: ["heat-ferrite-oversealed"], hazardEvidence: [] },
        relief,
      ),
    ).toBe(false);
    expect(
      machineUnlocked(
        { knowledge: [], hazardEvidence: ["slag-jam"] },
        relief,
      ),
    ).toBe(true);

    const renamedHint = structuredClone(relief);
    renamedHint.unlock!.hintKey = "machine.relief-furnace.other-copy";
    expect(
      machineUnlocked(
        { knowledge: [], hazardEvidence: ["slag-jam"] },
        renamedHint,
      ),
    ).toBe(true);
  });
});
