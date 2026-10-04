# Phase 9 implementation ledger

Ruling: user deprioritized pre-release compatibility. Keep cheap exact empty-liquid migration from schema 13, but do not guarantee old fixture content compatibility after the demo content changes. Atomic save rejection remains mandatory.

Ruling: #108 uses one authored pipe/tank/pump definition per kind rather than a multi-definition framework. Stable kind IDs identify these definitions; costs/capacity/transfer/fuel live in content. Expand only when later content needs it.

Task 1: content RED (3 failed), then GREEN (3 files / 43 tests); typecheck PASS. Persistence RED (2 failed), then GREEN (liquid persistence and ledger 2 files / 15 tests); new physical records schema 14, detached snapshots and separate pipes/tanks ledger columns. Extended persistence/ledger gate: 3 files / 21 tests PASS.

Task 2: conservative pre-step transport/construction implemented. Focused liquid tests cover one-edge movement, full outlet, disabled pump draining, successful-transfer fuel, insertion order, atomic build/refund, loaded edit/removal refusal, no-fuel, mismatched identity, per-update ledger reconciliation and exact future restore.
Task 3: blueprint schema 3 exports relative liquid layout/settings without quantities; v1/v2 unchanged when no liquid structures. Connected liquid backlog participates in recurrence; unrelated reservoir changes do not affect certification. Internal route changes reset certification. Liquid boundary events carry transferred units.
Task 4: world-01-v7 adds dedicated liquefier/precipitator operations and unknown liquid-0. Normal-command domain chain discovers both outputs with exact conservation and future restore equality. Build/inspect/toggle/reroute tools and world rendering implemented; normal-controls browser acceptance completed; final verification and GitHub closeout in progress.
Content Studio handling/interface roundtrip regression was observed RED and repaired. Focused content + Studio: 4 files / 48 tests PASS. Focused liquid/throughput/content: 4 files / 35 tests PASS. Interaction: 12 tests PASS.
Ruling: existing blueprint APIs only export and parse, with no stamp command. Preserve that boundary; do not create a new placement subsystem to satisfy a speculative plan item.

Ruling: pipe delivery at machine/tank input uses the existing solid socket convention: last pipe occupies the input socket, next point enters the footprint. No one-cell gap or invisible connector. Updated endpoint fixture accordingly.

Review ruling: changing a previously certified connected backlog withdraws the certificate immediately. Regression observed RED, then liquid/throughput 2 files / 20 tests GREEN.

Final integration gate (2026-10-02): 41 files / 281 tests PASS, 2 skipped. Typecheck, lint, build and git diff --check PASS. Production static export excludes Studio. Normal-controls browser acceptance and save/restore PASS; console error/warn []. Runtime source: 609c9fd93d5a41f4fb5e646c8903df5374a88dca. Evidence: PHASE9_LIQUID_ACCEPTANCE.md and docs/evidence/phase9-liquid-{closed,restored}.jpg.

## #109 pressurized gas — 2026-10-03

Design and six-task implementation plan approved by user. Native execution in the same checkout, no worktree or agents. The runtime/content/persistence/UI changes form one coherent delivery commit after verification; temporary implementation scripts were removed.

Content/runtime tests first failed for missing gas support. Dedicated gas records, gas-only reservation/commit transport, commands, geometry, ledger and save schema 15 then passed. Gas blueprint and connected-backlog tests were observed RED before extending schema 4 and certification. The normal-command hidden discovery chain passed with exact ledger reconciliation and restore equality. Interaction initially returned no gas command; gas tools/selection then passed.

Review finding: incompatible ordinary sources/outlets retained material but displayed Needs input/Output full. Two status regressions were observed RED, corrected and passed. Final containment tests: 14 PASS. Strengthened persistence capacity test to use valid gas identity; matching-content schema-14 migration and old-content atomic rejection: 5 PASS.

Initial full run had 12 stale schema/content expectation failures; updated only the expected version assertions. Repeat: 45 files / 307 PASS, 2 skipped. Typecheck/lint/build/diff check PASS. Browser normal-controls acceptance: discovery, ordinary-pipe refusal, 4/4 loaded-line blockage, stopped-feed drain into physical vessel, empty reroute, closed/open factory and save/restore. Console warnings/errors []. Fuel depleted normally; final post-reroute production was blocked by fuel, with domain recovery/resume tests providing the deterministic gate. See PHASE9_GAS_ACCEPTANCE.md.

Final repeat after status/wording review and schema-14 regression: 45 files / **308 PASS, 2 skipped**; typecheck/lint/build/diff check PASS. Existing version-only tests retain their original formatting to keep review scoped. No remote CI is claimed.

## #110 authored containment — 2026-10-04

#109 is merged via #163. User approved #110's coherent scope/spec/plan and native same-checkout execution. Content authors stable all-of requirements and equipment capabilities; the existing hidden liquid branch demonstrates physical Lined infrastructure. sim-core owns receiving compatibility, exact profile construction/delta/refunds and save protection. No new physics, hazards, chemistry chains or terminal modules. Save 16 / world-01-v9 / profiled liquid blueprint 5 / browser slot v10.

Focused RED→GREEN tests and self-review fixes are recorded in [PHASE9_CONTAINMENT_IMPLEMENTATION_LOG.md](PHASE9_CONTAINMENT_IMPLEMENTATION_LOG.md). Final repeat: **51 files / 332 PASS, 2 skipped**; typecheck/lint/build/diff check PASS. The unchanged full suite passed alone after an earlier build-concurrent assistance timeout. Normal-controls browser acceptance proves refusal, protected transfer, processor discovery, loaded edits, real recovery drainage, exact profile deltas and restore. Evidence: [PHASE9_CONTAINMENT_ACCEPTANCE.md](PHASE9_CONTAINMENT_ACCEPTANCE.md). #100 stays open; #111 has not begun.

## #111 physical terminal handling — 2026-10-04

#110 merged via #164. The user approved #111 design/plan and native execution in the same checkout, without agents/worktrees. Fixed liquid/gas docks extend existing evidence and exchange contracts; independent bounded physical holdings retain exact conservation. Runtime schema 17 / world-01-v10 / browser slot v11; blueprints remain conditional v1–v5 and exclude terminal installations.

Detailed scoped execution and self-review: [terminal ledger](PHASE9_TERMINAL_IMPLEMENTATION_LOG.md). Final full suite: **58 files / 351 PASS, 2 skipped**. Native browser actions proved both discoveries, missing-dock refusal, Keep staging, full gas backpressure, loaded removal guards, Save/Load and physical exports repaying obligations. Evidence: [terminal acceptance](PHASE9_TERMINAL_ACCEPTANCE.md). #100 stays open; #112/#113 have not begun. Merge awaits final user approval of the concrete PR.
