import { describe, expect, it } from "vitest";
import type { FactoryView, MachineStatus } from "@site/sim-core";
import { factoryContractPresentation } from "../game/factory-presentation";

const statusCounts = (): Record<MachineStatus, number> => ({
  processing: 1,
  incident: 0,
  disabled: 0,
  "deposit-exhausted": 0,
  "source-exhausted": 0,
  "needs-compatible-input": 0,
  "needs-input": 0,
  "output-full": 0,
  "needs-fuel": 0,
  ready: 0,
});

function factory(state: "stable" | "measuring"): FactoryView {
  return {
    id: "f12",
    x: 20,
    y: 20,
    width: 10,
    height: 10,
    ports: [
      { id: "p1", x: 20, y: 25, direction: 0, role: "input" },
      { id: "p2", x: 29, y: 25, direction: 0, role: "output" },
    ],
    contract: {
      machineCount: 1,
      statusCounts: statusCounts(),
      throughput:
        state === "stable"
          ? {
              state: "stable",
              cycleTicks: 120,
              inputs: [
                {
                  materialId: "ferrite",
                  units: 6,
                  cycleTicks: 120,
                  unitsPerMinute: 30,
                },
              ],
              outputs: [
                {
                  materialId: "plates",
                  units: 18,
                  cycleTicks: 120,
                  unitsPerMinute: 90,
                },
              ],
            }
          : {
              state: "measuring",
              cycleTicks: null,
              inputs: [],
              outputs: [],
            },
    },
  };
}

describe("closed factory contract presentation", () => {
  it("presents certified wall-port rates without mutating the factory view", () => {
    const view = factory("stable"),
      before = structuredClone(view),
      result = factoryContractPresentation(view, (id) =>
        id === "ferrite" ? "Ferrite rubble" : "Structural plates",
      );

    expect(result).toEqual({
      certified: true,
      status: "Certified contract",
      detail:
        "Stable detailed cycle · 120 ticks. Rates are measured at wall ports.",
      inputs: [
        {
          materialId: "ferrite",
          name: "Ferrite rubble",
          unitsPerMinute: 30,
        },
      ],
      outputs: [
        {
          materialId: "plates",
          name: "Structural plates",
          unitsPerMinute: 90,
        },
      ],
      worldText:
        "CERTIFIED CONTRACT\nIN  Ferrite rubble 30/min\nOUT Structural plates 90/min",
    });
    expect(view).toEqual(before);
  });

  it("marks an uncertified factory for diagnosis instead of inventing rates", () => {
    const result = factoryContractPresentation(
      factory("measuring"),
      (id) => id,
    );

    expect(result.certified).toBe(false);
    expect(result.status).toBe("Contract not certified");
    expect(result.inputs).toEqual([]);
    expect(result.outputs).toEqual([]);
    expect(result.detail).toContain("Open the interior for diagnosis");
    expect(result.worldText).toBe(
      "CONTRACT NOT CERTIFIED\nMEASURING / BLOCKED\nOPEN FOR DIAGNOSIS",
    );
  });
});
