# Phase 20 P7 — Integrated Acceptance & Exit Review

**Status:** **Phase 20 technical exit ACCEPTED** on 2026-10-11. [PR #290](https://github.com/MohamedXIV/unknown-yield/pull/290) passed independent GitHub review and was squash-merged as `831492a88d4d1a1ca777c1a94319c358bf57bc83`. Issue #269 and epic #261 are closed after verification. No deployment was authorized or forced.

**Source baseline:** Live `main` at `1c4cd051f538ca3a7577d2bb416f555a9780f29c` when the P7 branch was created. P0–P6 were already merged at that head.

**Scope:** Acceptance fixture, production-browser coverage, and this review document only. No runtime simulation behavior or save schema changed.

## Validation results

All requested local checks passed on the P7 working tree:

| Check | Command | Result |
| --- | --- | --- |
| Deterministic suite | `CI=1 UNKNOWN_YIELD_BROWSER_ACCEPTANCE=skip npm test` | 124 files passed; 650 tests passed; 3 browser tests skipped for the separate production-browser run |
| Typecheck | `npm run typecheck` | Passed |
| Lint | `npm run lint` | Passed |
| Standard production build | `npm run build` | Passed; static export verification passed |
| Production-browser acceptance | `CI=1 UNKNOWN_YIELD_BROWSER_ACCEPTANCE=production npx vitest run apps/web/test/phase10-browser-acceptance.test.ts --reporter=verbose` | 2 tests passed in 291.45 seconds |

The browser used the built static export and Chromium 151 on Linux. Desktop coverage ran at 1440×1000, DPR 1. Touch coverage used Chrome DevTools emulation at 390×844, DPR 2. The browser test completed without runtime errors.

**Independent exact-head gate:** [GitHub Actions #38138962657](https://github.com/MohamedXIV/unknown-yield/actions/runs/38138962657) completed successfully on PR head `0e2dc89953884baa5cb1cee8b2725120305c5ba0`, with 124 test files/650 passed/3 skipped, typecheck, lint, normal production build, and two production-browser acceptance tests. CI browser evidence recorded an integrated resume of tick 7→9, zero ledger mismatches, and zero runtime errors. The 10→12 observation below is the separate reported local run. A dedicated browser assertion for **Escape while the destructive confirmation dialog is open** was not included; both dialog and world input handlers have a source-level cancellation guard, but that keypress is not claimed as independently browser-proven.

## Integrated expedition evidence

The P7 build, save/reload, resumed simulation, and P5 demolition sequence use one loaded expedition. The test does not replace the expedition save between these steps.

### Construction, reuse, and conservation

- A vertical-first L belt drag from `(15,18)` through `(19,20)` reused three existing belts, added four cells, crossed the matching factory port, and cost exactly 4 plates. The reused belt records and factory port record remained equal to their pre-build saved values.
- A lined liquid route across `x=30..34, y=16` reused three pipes and added two, costing exactly 8 plates including the lined-profile surcharge. The loaded liquid at `(32,16)` retained its ID, material, quantity, and containment profile.
- A gas route across `x=30..34, y=18` reused three lines and added two, costing exactly 6 plates. The loaded gas at `(32,18)` and the separate loaded line at `(32,30)` retained their IDs and contents.
- Each placement preview left the oracle simulation unchanged. Browser commits matched the authoritative preview cost and resulting saved records. Ledger audits after each construction and after reload/resume had zero mismatches.
- The tool sampler selected the existing Belt tool in the production browser. The sampled belt’s pre/post structure fingerprints matched.

### Knowledge, configuration, save, and resumed simulation

- The save contains only the liquidification and vaporization knowledge needed to support its already-stored liquid/gas cargo. After reload, the snapshot and UI contained neither the precipitation nor gas-collection observation, and those reactions remained absent from saved knowledge.
- A v1 Game Configuration record migrated through the actual settings UI to v2. Its last-used palette memory remained intact. Configuration storage stayed separate from the expedition save, which was unchanged during the settings roundtrip and remained valid after reload.
- The expedition save serialized byte-for-byte identically across the P7 reload. The same save was then resumed; the simulation tick advanced from 10 to 12 in the final run, and the ledger remained balanced.

### Demolition, protection, and interaction

- **Single:** removing one loaded belt returned 2 plates: one structural plate and its one plate of cargo. Its other loaded and neighboring structures were unaffected.
- **Area All:** two empty belts were removed for 2 plates while the loaded gas line remained blocked in place with quantity 1.
- **Area Exact:** two crushers were removed, the furnace remained, and the exact refund was 48 plates.
- **Area Family:** one belt, one standard pipe, and one gas line were removed for 6 plates; the unrelated machine remained.
- A childless 6×6 factory was removed for exactly 36 plates. A factory with a child was blocked while closed and removed with its child after opening.
- A resource-deposit anchor was rejected as protected. A loaded belt, loaded liquid/gas lines, and the loaded pressure line retained their physical contents unless the corresponding cargo was explicitly reclaimed with its structure.
- Keyboard mode selection and Enter confirmation passed. Touch-emulated pan, pinch, selection, and armed confirmation passed. A live tick changed the stale dismantle fingerprint; confirmation returned “world changed,” kept the review open, and left the target present.

## Deferred checks and limits

- Human review of visual clarity, readability, and the practical comfort of destructive-action explanations.
- Testing on physical Android and iOS devices, including real touch behavior. The browser’s mobile viewport and touch events are emulation only.
- Screen-reader review and keyboard interaction across additional browsers and operating systems.
- Target-device GPU/frame pacing and production-device performance profiling.
- The historical **32-factory performance budget remains deferred and unmet**. This run did not profile a 32-factory workload, so it makes no claim that the budget is satisfied. The unrelated browser performance sample is not evidence for that workload.
- No Vercel deployment was triggered or forced.

## Exit decision

**PASS — technical Phase 20 exit accepted.** The independent PR review, exact-head CI checks, integrated browser evidence, save/knowledge/conservation checks and merge are complete. P7 #269 and epic #261 are closed. The explicitly deferred physical-device comfort, cross-browser/accessibility review, GPU profiling, and historical 32-factory performance budget remain deferred/unmet; completion of this phase does **not** certify those targets. Vercel deployment remains separate.
