# Phase 9 recoverable handling — #112

Scope: one authored contained pump failure, approved spec/plan in docs/superpowers. Same checkout, native implementation, no agents/worktree/dependencies. Base main d8578d622e63d7695b2442c3936218d77867cb98, #111 merged via PR #165. #100 remains open; #113 untouched.

Versions: save 18 / world-01-v11 / browser slot v12. Current/rule-bearing older saves reject atomically; historical no-rule fixtures migrate empty pump incident state. Conditional blueprints 1–5 unchanged, without incident/cargo/tick/drain mode.

## Domain evidence

- pump-failure-content.test.ts: authored bounded rule, invalid exposure/references/localization/recovery paths, Studio roundtrip, optional-rule absence.
- pump-recovery-commands.test.ts: preview purity, atomic loaded guards, idempotent service, exact four-plate upgrade and sixteen-plate Lined reclaim, repair without rewards or automatic restart.
- pump-recovery-transport.test.ts: source-reserved one-time capture, no fuel/counters/evidence/delivery, no same-cadence drain; stable shared-source ordering; unfueled/disabled/missing/full/wrong-state/direction/identity/protection/extra-capability/no-rule refusals; zero-fuel pre-step service, fresh-source exclusion, blocked service resumes.
- pump-recovery-persistence.test.ts: strict record/timing/quantity/profile/ledger tampering rejects atomically; historical migration; original source reclaimed, blocked/draining/empty-upgraded incidents produce identical whole-save futures for 60 steps, with ledger checks.
- pump-recovery-knowledge.test.ts: detached sanitized incident/diagnostic identity, generic equipment rule, no reaction evidence. Normal incident save validation requires discovered material; no ordinary-buffer knowledge rules were weakened.
- pump-recovery-chain.test.ts: normal commands from fresh world discover/capture, preserve upstream cargo, drain into protected tank, upgrade/repair/restart and export through installed dock. Every tick reconciles conservation; mid-incident restore compares 60 complete steps.
- Factory regressions preserve unrelated certificates across service and repair; failed internal/connected pumps block certification and their chamber charge enters liquid inventory. Existing conditional blueprint tests and session/i18n remain in gate.

## Browser acceptance

Local localhost:3030 IAB, normal controls only. Factory (23,33) 12×8, extractor (15,35), liquefier (25,35), Standard pump (27,36), Lined pipes (28,36)/(29,36), Lined tank (30,35). Source output filled physically; pump trapped Vein liquor 1/1, became FAILED and disabled feed. Profile, repair and enable controls refused loaded state; Reclaim became drain-first explanation. Save/Load preserved incident and physical factory buffers. [Loaded incident](evidence/phase9-recovery-loaded.png).

Explicit service drained the chamber through the protected outlet into the tank; pump retained empty 0/1 incident. [Empty incident](evidence/phase9-recovery-empty.png). Upgrade Standard→Lined cost exactly four plates (390→386). Repair cleared failure and kept feed disabled. [Repaired pump](evidence/phase9-recovery-repaired.png). Explicit Enable resumed delivery; tank later held 32/64. These totals reflect elapsed normal production; zero-fuel/no-fuel-spend assertions are isolated domain checks.

Second Lined pump (32,36) fed a north route at (33,36) through north wall port (33,33), east at (33,32), north at (39,32) to terminal approach (39,30). Installed liquid dock, selected Auto-export and requested ordinary assistance at depleted fuel. Shipments resumed: 66 exported, obligation zero. [Resumed export](evidence/phase9-recovery-export.png). Browser console warnings/errors: []. No injected state or hidden reaction preview.

Initial disconnected placement was reclaimed and corrected through normal controls after camera resize. Browser self-review corrected loaded Reclaim affordance. Screenshots precede behavioral commit 904d981, whose later changes were strict validation/regressions/formatting; exact-head recheck and final gate recorded below.

## Final verification

Behavioral head c93e660e889b6a0325a56a8041c88b3893bc85ae:

- npm test -- --maxWorkers=4: 64 files PASS, 380 tests PASS, 2 skipped (382 total), 104.30 seconds, alone with helper server stopped.
- npm run typecheck: PASS.
- npm run lint: PASS.
- npm run build: PASS; static export verifier confirms no Studio route/authoring component.
- git diff --check: PASS.

Earlier intermediate pass was 376 PASS / 2 skipped; four additional review regressions produce the final 380 count. No timeout/dependency changes. Native whole-diff self-review, no independent agent review claimed. Final docs-only delivery commit preserves tested runtime/content trees. No merge or remote CI pass claimed.

Exact-head browser recheck on c93e660: restarted local helper, used a fresh same-browser localhost tab and Load saved world. Restored 66 exported / zero obligation / zero fuel, installed liquid dock and Auto-export. [Restored head](evidence/phase9-recovery-head-restored.png). Original pump is Lined/Ready, without incident; [repaired head pump](evidence/phase9-recovery-head-pump.png). Ordinary assistance added 36 fuel/obligation; resumed shipments reached 78 exported / 8 obligation / zero fuel. [Head resumed export](evidence/phase9-recovery-head-export.png). These elapsed economy totals are observed, not isolated compensation assertions. Console warning/error logs: []. Helper server stopped. Browser acceptance PASS.
