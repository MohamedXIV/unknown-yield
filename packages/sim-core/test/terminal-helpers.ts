import { fixture } from "@site/content";
import { initialState } from "../src/save";
import { initializeKnownMarkets } from "../src/market";
import { refreshMilestones } from "../src/milestones";
import { experimentEvidenceKey } from "../src/types";
export function terminalState() {
  const s = initialState(fixture);
  for (const id of ["liquefy-raw", "vaporize-liquid-0"]) {
    const r = fixture.reactions.find((r) => r.id === id)!;
    s.knowledge.push(id);
    s.evidence[
      experimentEvidenceKey(r.operation, r.input, r.processConditionId ?? null)
    ] = {
      operationId: r.operation,
      inputId: r.input,
      processConditionId: r.processConditionId ?? null,
      state: "confirmed",
    };
  }
  refreshMilestones(fixture, s);
  initializeKnownMarkets(fixture, s);
  s.policies["liquid-0"] = "keep";
  s.policies["gas-0"] = "keep";
  return s;
}
