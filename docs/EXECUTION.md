# Execution Guide

This document is intentionally procedural. Game/design truth lives in the domain docs; GitHub Issue #2 is the live execution index.

## Current state

- First playable: accepted and merged.
- Completed phase: **Phase 1.5 — physical inventory and flexible routing** (closed by #8 / PR #29).
- Active phase: **Phase 2 — experimentation and discovery depth**.
- Completed foundation: **#3 — material ledger and conservation invariants** (merged via PR #17).
- Completed foundation: **#14 — stable content IDs and localization-ready presentation** (merged via PR #19).
- Completed Phase 1.5 child: **#4 — physical storage and terminal staging** (merged via PR #21).
- Completed Phase 1.5 child: **#5 — remove generic discard and define material handling/reclaim rules** (merged via PR #23).
- Completed Phase 1.5 child: **#6 — flexible belt routing for persistent production lines** (merged via PR #25).
- Completed Phase 1.5 child: **#7 — preserve factory state across suspend, reroute and resume** (merged via PR #27).
- Completed Phase 1.5 gate: **#8 — end-to-end physical inventory and rerouting exit review** (merged via PR #29).
- Completed Phase 2 child: **#30 — minimal condition-aware reaction matching** (merged via PR #36).
- Completed Phase 2 child: **#31 — experiment observations and knowledge states** (merged via PR #38).
- Active issue: **#32 — one explainable condition-driven hazardous failure**.
- Phase 2 parent epic: **#9**; Phase 2 closes only through **#34 — end-to-end experimentation/discovery exit review**.

## Phase 1.5 dependency graph

```text
#3 conservation ledger ✓
        │
        v
#14 stable IDs + localization-ready presentation ✓
 ├─> #4 physical storage + terminal staging ✓ ─> #5 remove generic discard ✓
 ├─> #6 flexible belt routing ✓ ────────────┐
 └──────────────────────────────────────────> #7 persistent factory state ✓
                                              │
#3 + #14 + #4 + #5 + #6 + #7 ─────────────> #8 exit review ✓
```

Phase 1.5 is complete.

## Phase 2 dependency graph

```text
#30 condition-aware reaction matching ✓
  │
  v
#31 experiment observations + knowledge states ✓
  │
  v
#32 explainable condition-driven hazard ← ACTIVE
  │
  v
#33 demonstrated-knowledge capability gate
  │
  v
#34 Phase 2 exit review
```

#9 is the Phase 2 parent epic. #30 and #31 are complete. Continue with #32: add one deterministic authored hazardous failure with the smallest persisted/inspectable/recoverable consequence, preserving conservation and hidden authored truth. Do not build a generic damage/fire/pressure/repair framework. Phase 3 remains blocked until #34 closes.

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
- Do not expand Content Studio, advanced logistics, market depth, or broad content volume as a prerequisite to Phase 2.
- Phase 2 experimentation must preserve hidden authored truth vs player knowledge and remain deterministic from authoritative simulation conditions.
- Do not create large issue trees for Phases 6–8 until preceding gates reveal concrete requirements.

## Active/later phase epics

- #9 — experimentation and discovery depth — ACTIVE via children #30–#34
- #10 — factory-as-function contracts and abstraction proof
- #11 — Content Studio v1
- #12 — Materials Exchange and corporate progression

These are placeholders for future decomposition, not permission to work around the active gate.