# Execution Guide

This document is intentionally procedural. Game/design truth lives in the domain docs; GitHub Issue #2 is the live execution index.

## Current state

- First playable: accepted and merged.
- Active phase: **Phase 1.5 — physical inventory and flexible routing**.
- Completed foundation: **#3 — material ledger and conservation invariants** (merged via PR #17).
- Completed foundation: **#14 — stable content IDs and localization-ready presentation** (merged via PR #19).
- Active issue: **#4 — physical storage and terminal staging**.
- Phase 1.5 closes only through **#8 — end-to-end exit review**.

## Phase 1.5 dependency graph

```text
#3 conservation ledger ✓
        │
        v
#14 stable IDs + localization-ready presentation ✓
 ├─> #4 physical storage + terminal staging ← ACTIVE ─> #5 remove generic discard
 ├─> #6 flexible belt routing ───────────────┐
 └──────────────────────────────────────────> #7 persistent factory state
                                              │
#3 + #14 + #4 + #5 + #6 + #7 ─────────────> #8 exit review
```

#14 is complete. #4 and #6 are now unblocked; #4 is the current active issue because it establishes legitimate physical destinations required by #5. #5 needs legitimate storage/handling destinations. #7 should integrate with #6 rather than invent a separate rerouting model.

## Agent loop

1. Read Issue #2 and identify the first unblocked incomplete issue.
2. If that issue already has an open PR, continue/review it; do not create a competing implementation.
3. Read the issue, `AGENTS.md`, and only the directly relevant design/architecture docs.
4. Create/use a focused branch named for the issue, e.g. `feat/3-material-ledger`.
5. Implement the smallest complete change that satisfies the issue's acceptance criteria.
6. Run focused tests first. Then run the broader checks required by the touched scope.
7. Open one focused PR referencing the issue. Record exact commands/results and intentional save/content compatibility changes.
8. Resolve review findings, re-check the exact PR head, then squash merge when the acceptance gate is satisfied.
9. Confirm the issue closes or close it with evidence, update Issue #2 if needed, then select the next unblocked issue.

## Verification baseline

For normal simulation/gameplay changes, expect:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Run focused package/tests before the full baseline. Browser acceptance is required when world interaction, Phaser presentation/input, React gameplay UI, save/load UX, or an issue's explicit gate needs it.

There is currently no remote CI workflow. Do not represent absent checks as green CI; record local/domain/browser evidence precisely.

## Scope rules

- `sim-core` owns gameplay truth.
- No generic discard or silent material loss.
- Storage is physical geography, not a global inventory abstraction.
- Preserve hidden authored truth vs player knowledge.
- Stable content IDs are simulation/save identity; localized/player-facing wording is presentation data.
- React stays out of per-frame world transforms.
- Do not add Rust/WASM without benchmark/profiler evidence.
- Do not expand Content Studio, advanced logistics, or market depth as a prerequisite to Phase 1.5.
- Do not create large issue trees for Phases 6–8 until preceding gates reveal concrete requirements.

## Later phase epics

- #9 — experimentation and discovery depth
- #10 — factory-as-function contracts and abstraction proof
- #11 — Content Studio v1
- #12 — Materials Exchange and corporate progression

These are placeholders for future decomposition, not permission to work around the active gate.