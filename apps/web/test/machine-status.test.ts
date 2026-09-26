import { it, expect } from "vitest";
import { MACHINE_STATUSES } from "@site/sim-core";
import { machineStatusLabel } from "../game/machine-status";

it("labels every semantic status in readable English, never a raw code", () => {
  expect(MACHINE_STATUSES).toContain("ready");
  for (const code of MACHINE_STATUSES) {
    const label = machineStatusLabel(code);
    expect(label.length).toBeGreaterThan(0);
    expect(label).not.toMatch(/^[a-z]+(-[a-z]+)*$/);
  }
  expect(machineStatusLabel("ready")).toBe("Ready");
  expect(machineStatusLabel("output-full")).toBe("Output full");
  expect(machineStatusLabel("incident")).toBe("Incident lockout");
});
