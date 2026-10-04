# #111 — physical terminal handling acceptance

Implemented 2026-10-04 in `F:\_WIP\unknown-yield`, branch `codex/111-terminal-handling`, based on merged #110 / PR #164 / main `9a2f7be167f013454491d5781ee6370175b9170d`. Live #111 and parent #100 are OPEN; no competing open PR existed. The user approved the design, written spec, implementation plan and native implementation. No worktree, agents, dependencies, Vercel or remote deployment was used.

Behavioral commit: **`94e5d5e1cfdb0fb5c162c516ea164edaf26b30a3`**. Later delivery changes contain docs/screenshots only. Design: [approved spec](superpowers/specs/2026-10-04-terminal-handling-design.md); execution: [ledger](PHASE9_TERMINAL_IMPLEMENTATION_LOG.md).

## Contract

Two content-authored fixed slots on the existing terminal accept liquid/gas only through their directed physical inlets after evidence unlock and installation. Each installed record owns an independent bounded single-material holding. Liquid dock: capacity 24 / cost 30 plates / corrosion-resistant / inlet `(39,29)` from south. Gas dock: capacity 16 / cost 36 / inlet `(41,27)` from east. Reclaim is legal only when empty and refunds exact embodied plates without allocating entity IDs.

Native pre-step reservation/commit transport retains upstream cargo on refusal. Dry staging is independent. Newly discovered sealed cargo defaults Keep. One existing-cadence settlement path ships physical dry/dock holdings through company knowledge, policy/listing/capability gates, recording debt/recovery, market saturation, applicable order progress and exported ledger exactly once. Hidden recipes/output associations remain absent from fresh player views.

Save **17**, content **world-01-v10**, browser slot **v11**. Older current-fixture saves reject atomically; no backward compatibility is claimed for them. Historical non-module custom content keeps its existing migration tests. Factory blueprint exports remain conditional schemas 1–5, exclude terminal installations and never copy holdings. Connected dock receiving state participates in factory certification; unrelated modules preserve unrelated certificates.

## Domain evidence

- `terminal-content.test.ts`: fixed protected geometry, capability/progression validation and Studio preservation.
- `terminal-modules.test.ts`: preview purity, exact construction/refund, unchanged IDs and atomic locked/unknown/duplicate/underfunded refusal.
- `terminal-transport.test.ts`: missing dock retains both native states, physical arrival, independent dry inventory, no transfer fuel on refusal, bounded final arrival, full backup and capacity resume; diagnostics refuse identity/state/protection mismatches.
- `terminal-export.test.ts`: Keep retention, exact debt-first compensation and saturation, no shipment replay, matching orders allocate each unit once, unknown/locked cargo cannot ship.
- `terminal-persistence.test.ts`: strict current holdings, tamper/old-schema rejection preserving the running state; simultaneous liquid/gas docks, upstream cargo, mixed policies and open debt resume identical complete saves for 60 steps; modules remain outside blueprints.
- `terminal-knowledge.test.ts`: fresh views omit undiscovered fluid listings; snapshots cannot mutate authoritative contents.
- `terminal-chain.test.ts`: normal commands from a fresh world discover, unlock, install, stage and export both existing hidden fluid branches; ledger audited every tick and restored future equals uninterrupted future.
- Factory regressions cover a real unrelated certified factory remaining certified after install/remove and a deterministic connected gas monitor withdrawing its certificate on receiving-contract change. Existing fluid/containment/market/Phase 5/blueprint/session/localization coverage stays green.

Focused initial RED→GREEN and fixture corrections are recorded in the ledger. Review was native self-review; no independent agent review is claimed. Self-review corrected a stale save-error schema label from 16 to 17; validation already required 17.

## Browser evidence

Local `http://localhost:3030/`, IAB, normal player controls only. No state injection. Factory `(23,33)` 20×6 contains Liquefier `(25,35)`, Lined pump `(27,36)` and later Vaporizer `(31,35)` / compressor `(33,36)`. Extractor `(15,35)` feeds normal belts through west port `(23,36)`. Liquid route turns north at `(30,36)` through north port `(30,33)`, east at `(30,32)`, then north at `(39,32)` to `(39,30)`. Gas route runs east through port `(42,36)`, north at `(44,36)`, west at `(44,27)` to `(42,27)`.

1. Real liquid processing discovered Vein liquor and unlocked only its handling. Loaded inlet pipe retained **4/4** with **Install the compatible terminal dock** before installation. [Liquid refusal](evidence/phase9-terminal-liquid-refusal.png).
2. Installed liquid dock for exactly 30 plates (**328→298**); Keep staged **18/24**, loaded removal button disabled with drain/export explanation. [Liquid staging](evidence/phase9-terminal-liquid-staging.png).
3. Set Auto-export through normal policy control. UI showed **26 exported**, dock empty and **152 fuel** (from 50 before export plus ongoing production/transport). [Liquid export](evidence/phase9-terminal-liquid-export.png). This is visible economy evidence, not an exact per-unit fuel assertion; deterministic tests isolate compensation.
4. Disabled source feed, drained the existing liquid route, rerouted an empty pipe east, then built Vaporizer/compressor/pressure line normally. Process vapor was discovered; final upstream line retained **4/4** with missing-dock refusal. [Gas refusal](evidence/phase9-terminal-gas-refusal.png).
5. Installed gas dock for **36 plates (184→148)**. Keep initially staged **13/16** at depleted fuel. Requested ordinary assistance (**36 fuel / 36 obligation**); gas dock reached **16/16** and loaded removal stayed disabled. [Full gas dock](evidence/phase9-terminal-gas-full.png). Inlet line retained **2/4**, reporting **Destination full**. [Backpressure](evidence/phase9-terminal-gas-backpressure.png).
6. Saved and loaded via Game menu. Both docks stayed installed; gas stayed **16/16**, Keep policy, obligation **36**, liquid Export policy and exported total **30** remained. [Restored state](evidence/phase9-terminal-restored.png). Upstream **2/4** retention was inspected separately; exact whole-save future equivalence is a domain gate.
7. Set gas Auto-export and resumed. Dock drained, shipments resumed, UI showed **55 exported / 0 obligation / 56 fuel**, with gas market **100% saturated**. [Gas export](evidence/phase9-terminal-gas-export.png). Console warning/error logs: **`[]`**.

These screenshots were captured while the implementation was uncommitted, then associated with behavioral commit 94e5d5e. The only subsequent runtime change before that commit was the schema rejection message correction; receiving/export behavior was unchanged. Exact-commit reload/restore/export recheck is recorded below. Browser proves gas full capacity; liquid full 24-unit capacity is domain-only. Loaded removal is a disabled UI guard; actual atomic command refusal is domain-tested. No simultaneous full liquid/gas browser holding is claimed.

Exact-commit recheck: restarted the local server on `94e5d5e`, opened a fresh IAB localhost tab and used Load saved world. Both installations, **16/16 gas**, **30 exported / 36 obligation / 0 fuel** and Keep/Export policies returned. [HEAD restore](evidence/phase9-terminal-head-restored.png). Gas Auto-export then resumed physically and repaid the obligation; paused result **64 exported / 0 obligation / 34 fuel**, empty gas dock and saturation 100%. [HEAD export](evidence/phase9-terminal-head-export.png), [visible dock controls](evidence/phase9-terminal-head-docks.png). Different final totals reflect elapsed normal production during the recheck. Console warnings/errors again `[]`. Local helper server stopped after verification.

## Final verification

- `npm test -- --maxWorkers=4`: **58 files PASS; 351 tests PASS, 2 skipped (353 total)**, 102.09 seconds, run alone.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS; static export verifier confirms no Studio route or authoring component.
- `git diff --check`: PASS.

The earlier full suite was 345 PASS / 2 skipped; six added focused regressions passed in the final suite. New test-fixture failures were corrected without changing runtime validation or timeouts. No remote CI pass or merge is claimed. #100 remains open; #112/#113 were not started. Final merge awaits user approval of the verified PR.
