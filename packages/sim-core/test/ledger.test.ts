import { describe, it, expect } from "vitest";
import { fixture } from "@site/content";
import { Simulation } from "../src/index";
import { auditLedger } from "../src/ledger";

describe("material ledger", () => {
  it("balances on a fresh expedition with zeroed flows", () => {
    const s = new Simulation(fixture);
    const report = auditLedger(fixture, s.serialize());
    expect(report.ok).toBe(true);
    expect(report.mismatches).toEqual([]);
    expect(s.serialize().flows).toEqual({
      consumed: {},
      produced: {},
      exported: {},
      discarded: {},
    });
  });
});
