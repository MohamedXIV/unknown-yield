# Phase 12 integrated exit gate

Issue #131 is the integration/evidence gate for factory lifecycle and district reconfiguration. It adds no new gameplay subsystem.

## One-world simulation proof

The dedicated `phase12-exit.test.ts` executes the accepted Phase 12 contracts in one authoritative world:

1. two persistent factories and one physical depot share a belt district;
2. Factory A already contains a stable crusher ID and a conserved ferrite buffer;
3. its shell expands without moving or resetting that interior;
4. the reshaped Factory Blueprint parses successfully;
5. Factory A relocates intact by one cell, preserving machine ID/buffer and the reshaped blueprint while leaving external logistics behind;
6. the pending relocation state survives exact save/load;
7. one real belt cell reconnects the moved wall port;
8. authored downtime elapses and the preserved crusher restarts;
9. that crusher completes a real ferrite batch after relocation;
10. depot stock first feeds Factory B, then the existing diverter switches to Factory A;
11. cargo already committed to the old branch keeps its exact destination while later stock is reallocated;
12. the final world preserves conservation, blueprint compatibility and byte-identical deterministic restore.

## Browser gate

The existing real-Chromium CI harness is extended for #131 rather than starting another browser/server. It loads a physical Phase 12 district, relocates Factory A from the factory panel, places the missing reconnection belt cell with the ordinary Belt tool, waits for relocation downtime, restarts the internal crusher, selects the alternate district feed from the ground-belt panel, saves, and inspects the persisted authoritative state.

## #130 composition evaluation

Factory-as-module composition is intentionally absent. #130 closed not-planned because current evidence shows blueprint reuse, factory contracts, reshape/relocation and district routing solve the demonstrated lifecycle/readability needs without nested runtime truth; the existing 32-factory performance budget is also still unmet.

## Completion rule

This document does not claim Phase 12 complete until the #131 exact head passes the repository full gate — tests including Chromium, typecheck, lint and build — and merges. After that, reconcile Epic #103 and activate only the approved Phase 13 queue.
