# Phase 9 integrated exit review — #113

Status: LOCAL ACCEPTANCE PASS, 2026-10-04. Base main 539f3f37dc2d317423748493c7c65383009e0a27; #108–#112 closed through PRs #162–#166. Live #100 and #113 remain open. Same checkout, native execution, no agents/worktree/dependencies/deployment. No later-phase scope.

## Integrated domain gate

`packages/sim-core/test/phase9-exit.test.ts` starts a fresh expedition and uses normal commands, actual extraction and authored transformations. No injected inventory, knowledge or modified content.

The same factory discovers liquid, captures one real charge in a Standard pump, retains the upstream remainder and rejects loaded reclaim atomically. Service drainage moves the charge through Lined pipes into a Lined tank. Empty upgrade and explicit repair preserve disabled feed; explicit restart sends liquid through storage and a vaporizer. Separate compressors, pressure lines and a vessel retain the discovered gas before outlet resume. Missing gas dock retains gas at the terminal approach; installed Keep dock holds it physically before explicit export.

Ledger mismatches must be empty after every accepted command and every tick. Discarded flow remains empty. Four checkpoints (failed pump, stopped vessel outlet, held dock, post-export) restore and compare complete serialized futures for 60 steps each, auditing both simulations. Fresh player views hide the authored gas identity; discovery comes from actual production. Ordinary assistance obeys the existing debt/continuation policy.

Focused command: `npx vitest run packages/sim-core/test/phase9-exit.test.ts packages/sim-core/test/terminal-chain.test.ts packages/sim-core/test/pump-recovery-chain.test.ts packages/sim-core/test/gas-chain.test.ts packages/sim-core/test/liquid-chain.test.ts packages/sim-core/test/phase6-exit.test.ts --maxWorkers=4`: **6 files / 6 tests PASS**, 10.43s.

The first draft requested a second assistance without repayment and failed legitimately; the test was corrected to use one grant. A later assertion expected the vessel still to hold cargo after drainage; the scenario now explicitly stops its outlet, proves real storage, restores that state and resumes. Neither failure required a production change.

## Evidence boundaries

Accepted #108–#112 evidence remains attributed to its original behavioral commits. This review must add fresh full regression and browser evidence before acceptance. Domain tests establish exact conservation and deterministic futures; screenshots establish playable controls and visible persistence. No pressure physics, global fluid inventory, generic discard or recipe disclosure is introduced.

Versions remain save 18 / content world-01-v11 / browser slot v12; conditional blueprint versions 1–5 unchanged. Production code/content unchanged from merged #112.

## Remaining gate

Local gate results are recorded below. #100 must remain open until this gate is accepted and merged.

## Fresh browser continuation

Local IAB localhost:3030, normal controls only, on unchanged merged #112 runtime. Loaded the #112 saved expedition (Factory 1, repaired Lined pump, protected tank, liquid dock, 66 exports, zero obligation/fuel). Opened its roof for diagnosis; no save/runtime injection.

Extended the same factory: empty corner (33,36) south; protected detour through (33,37) west to (29,37), south to (29,39), then east into Vaporizer (30,38). Compressor (32,39), east wall port (34,39), pressure lines (33–35,39), vessel (36,38) and outlet compressor (38,39). Sealed outlet follows (39–44,39), north at x44 to y27, west to gas approach (42,27). Empty corner/inlet edits used inspector controls. Construction plates were paid normally.

First continuation left extraction running and disabled the vessel outlet: actual discovery and **1/48 gas** storage passed, but its 36-fuel assistance grant depleted before export. [Gas storage](evidence/phase9-exit-gas-storage.png). This was a test setup limitation, not an export pass or a runtime defect. Reloaded the original save normally and rebuilt the same extension with extractor and liquefier stopped after their current batches. One ordinary assistance supplied 36 fuel; actual processing/transfers then produced gas authorization and reached the previously missing dock. Installed it for 36 plates; **5/16 gas**, Keep, **67 exports / 33 obligation / 7 fuel**. The one additional liquid export came from retained existing route cargo.

Save/Load preserved both docks, Keep policy and five gas units. [Restored held cargo](evidence/phase9-exit-restored-dock.png). Explicit Auto-export shipped those units: **72 exports / zero obligation / 14 fuel**, emptied gas dock. [Export](evidence/phase9-exit-export.png). Final save/load retained totals, 59 construction plates, both installed docks and Auto-export policies. [Final restore](evidence/phase9-exit-final-restored.png). Browser console warning/error logs: **[]**.

Failure/service/upgrade/repair browser mechanics remain the accepted #112 evidence on c93e660; this review continues its repaired save and supplies fresh gas/storage/terminal/export persistence. The new domain scenario integrates actual failure recovery with both handling states from a fresh world. Full capacity, exact atomic refusal, zero-fuel service and identical futures are domain gates, not inferred from screenshots. No sustained production/performance certification is claimed.

## Final local verification

- Focused integration: 6 files / 6 tests PASS, 10.43s.
- `npm test -- --maxWorkers=4`: **65 files PASS; 381 tests PASS / 2 skipped (383 total)**, 108.21s. Brief startup overlap with the finishing focused run; no build/server during suite. No timeout changes.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS; static export verifier reports no Studio route or authoring component.
- Browser normal controls: PASS, with the explicit first-attempt limitation above.

The helper was first invoked with incorrect root npm argument forwarding; it exited for nonexistent project directory apps/web/3030. The correct workspace command started the local server. No product change was needed.

No production defect found; only the integrated regression, screenshots and execution evidence change. Save/content/blueprint schemas, gameplay rules and deferred performance gate remain unchanged. #100 and #113 remain OPEN pending delivery/merge acceptance. No remote CI or deployment pass is claimed.

## Accepted contract coverage

| Contract | Fresh gate / retained focused evidence |
| --- | --- |
| Physical state-specific routes and storage | New exit test + liquid/gas chain, logistics, containment and terminal transport suites |
| Exact capture, no disappearance, protected recovery | New exit test + pump recovery command/transport/chain suites; #112 browser acceptance |
| Persistent blockage, cargo and destination | Four full-save future comparisons + existing liquid/gas/terminal/recovery persistence and Phase 6 exit suites |
| Knowledge stays separate from authored recipes | Fresh hidden gas view and real discovery + recovery knowledge, containment snapshots and existing experiment tests |
| Terminal admission, Keep and export | New exit test + terminal chain/transport/export suites; fresh held-dock restore and export browser evidence |
| Factory and blueprint boundaries | Existing factory throughput/blueprint regressions in the full gate; no aggregate substitution |
| Content/localization integrity | Existing schema/reference/semantic/Studio/locale suites in the full gate |

Historical feature evidence: [liquid](PHASE9_LIQUID_ACCEPTANCE.md), [gas](PHASE9_GAS_ACCEPTANCE.md), [containment](PHASE9_CONTAINMENT_ACCEPTANCE.md), [terminal](PHASE9_TERMINAL_ACCEPTANCE.md), [recovery](PHASE9_RECOVERY_ACCEPTANCE.md). Their historical version/head labels are not current merge state. Live #108–#112 are CLOSED; their canonical PRs #162–#166 are MERGED.
