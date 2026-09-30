# Phase 5 Exit Review — Materials Exchange and Corporate Progression

Issue: #73  
Parent epic: #12  
Status: **ACCEPTED / MERGED** — PR #79 squash-merged as `dcbe1a567cc26ab150f13e159d35bf50030ee570`.

## Local acceptance — 2026-09-30

Behavioral/test head: `8547fe75214b220aafa9f96dcc793201bf761ded`, continuing canonical PR #79 from `21c0c7a6c7314b1f7c3c64cc058e535ebffb05e6`. The only test correction is a per-test 15-second timeout for this bounded, long-running integrated scenario. The initial full run exceeded Vitest's default 5-second timeout under concurrent suite/build load; no gameplay rule, assertion, simulation step limit or global timeout changed. The successful full rerun used the identical test tree subsequently committed as `8547fe7`.

- Focused Phase 5 gate: 8 files / 58 tests PASS on `21c0c7a`.
- Corrected integration test: 1 file / 1 test PASS.
- Corrected full suite: 31 files / 198 tests PASS, exit 0.
- Typecheck and lint: PASS on both `21c0c7a` and `8547fe7`. Production build/static-export verification: PASS on `21c0c7a`; the subsequent test-only timeout adjustment does not alter runtime, content or export code.
- Fresh integrated browser run: PASS on the same unchanged runtime, spanning `21c0c7a` and its timeout-only successor `8547fe7`. Console warnings/errors: `[]`.

The actual browser world used normal UI actions only:

1. Fresh terminal had no granules listing. The Directive exposed operation/input/setup, with no predicted result.
2. A real Crush line discovered granules. Locked checkpoint: fuel 85, plates 430, granules 6 staged, exports 0, Order 0/4, compensation 12, saturation 0%. UI Save/Load preserved that checkpoint.
3. The Crush equipment was disabled and retained. A separate Sealed-furnace line was built in the same factory. Its actual trial unlocked handling and completed the Directive; physical shipments completed the Order. Exports reached 11, compensation reached the floor 4, saturation reached 100%.
4. Granules switched to Keep and their equipment was suspended. A separate ferrite-to-plates factory produced construction stock. An initial placement-direction mistake was corrected using ordinary routing and conservative reclaim of an empty, unfed alternative Crusher; the original granules industry remained intact. Plates rose from 196 to 514 while compensation recovered from 4 to 12 and saturation fell to 0%.
5. The alternative industry depleted fuel naturally to 0. Assistance granted 36 fuel and created obligation 36, recovery standing and 0/24 recovery progress. Immediate repeat request was unavailable. Save/Load preserved the open obligation, retained staging and completed progression/opportunity state.
6. The alternative line was suspended; the existing Sealed line resumed without rebuilding it. Two staged exports increased total exports 11 to 13 and reduced obligation 36 to 12 while operating fuel was 28; no new opportunity bonus was available. Subsequent legal exports restored clear standing.
7. Final paused Save/Load preserved fuel 46, plates 514, exports 18, obligation 0, clear standing, unlocked handling, compensation 8 and saturation 58%. Completed opportunities did not reappear and fuel did not increase on restoration. Console `warn=[]`, `error=[]`.

The browser run did not require a continuation allocation. Saturated repeat-intervention continuations and expired-opportunity recovery remain separately attributed to the domain tests. Material-ledger audits and exact complete-save round trips are verified throughout the integrated domain companion; browser observations are not represented as a browser ledger API.

Subsequent evidence-recording commits are documentation-only. Canonical PR #79 was verified live at `aef3249de6df4a7cab53a16986174439f5a9a470` and squash-merged as `dcbe1a567cc26ab150f13e159d35bf50030ee570`; #73 and parent #12 are closed.

Phase 5 implementation children #69–#72 are merged. This review adds no new gameplay breadth. Its job is to prove that discovery, market/company state, physical logistics, capability progression and recovery now behave as one coherent world-facing loop.

## Live exit gate

The canonical #73 gate requires one integrated scenario to prove:

1. a product is discovered/confirmed without authored result truth leaking before observation;
2. company knowledge creates the corresponding Materials Exchange listing;
3. physical terminal staging/export earns compensation that changes with persisted saturation;
4. a Corporate Order or Special Directive changes an actual production decision in the world;
5. demonstrated capability unlocks a real terminal/progression step;
6. an economically depleted but viable site can recover through assistance and obligation repayment;
7. Save/Load preserves market, opportunity, progression, obligation and physical-material truth.

Material-ledger reconciliation is required throughout. Phase 6 must not begin until this gate passes.

## Integrated deterministic companion

`packages/sim-core/test/phase5-exit.test.ts` is the new companion gate.

It starts from the canonical fresh `fixture`; it does **not** seed knowledge, market listings, milestone completion, opportunity completion or terminal capability state.

The scenario is intentionally one continuous world:

### 1. Fresh hidden knowledge

Before production:

- the Exchange is empty;
- granules are absent from the player material view;
- authored reaction IDs such as `crush-raw` / `heat-raw-sealed` are absent from the player snapshot;
- the material ledger reconciles.

### 2. Crush discovery → listing → locked physical staging

The test builds a real lower raw-material factory through normal commands:

- extractor on `veined-field`;
- Crusher inside a 10×10 factory;
- real wall ports and belts to the terminal.

It advances normal simulation until Crush discovers conductive granules, the company creates the Exchange listing, the Order and Directive are offered, and at least four granules physically reach terminal staging.

The #71 handling gate is still locked at this point:

- Exchange listing exists;
- compensation remains the unsaturated baseline;
- staged granules remain physical inventory;
- exported amount and Order progress remain zero;
- Sealed-Heat authored result truth is still hidden.

The entire locked state is serialized, ledger-audited, loaded into a fresh `Simulation`, and required to round-trip exactly.

### 3. Directive redirects world production

The player response is represented as a real world change, not an opportunity flag mutation:

- the existing Crush extractor/processor are disabled but preserved;
- a second raw extractor and Sealed furnace are added in the **same persistent factory** with new wall ports;
- its output joins the already-built physical terminal trunk.

Normal simulation then confirms the Sealed Heat experiment.

That one physical experiment must:

- complete the offered `sealed-thermal-study` Directive;
- create durable confirmed `heat-raw-sealed` evidence;
- complete `sealed-study-certified`;
- unlock `sealed-sample-outbound`;
- permit the already-staged cargo to ship legally.

The Corporate Order must complete only from those real terminal exports.

### 4. Saturation changes compensation → diversify instead of demolish

The Sealed line continues supplying the Exchange until granule saturation reaches its authored maximum and compensation reaches the authored floor.

The test then changes the industrial response in the world:

- granule terminal policy changes to Keep;
- the persistent Sealed line is disabled, not deleted;
- a separate ferrite → Structural plates factory is built and run.

While the alternative line produces useful local construction material, granule saturation recovers on the authored company cadence and compensation improves. The prior granule factory/machines remain intact for later reuse.

This is the Phase 5 proof that market state redirects persistent production decisions rather than acting as a detached stock-trading layer.

### 5. Natural allocation collapse → assistance → recovery

The diversified Structural-plates line is left running until operating fuel naturally falls below the authored assistance threshold. No save mutation or debug fuel injection creates this collapse.

The normal assistance command then creates:

- company fuel allocation;
- outstanding obligation;
- recovery standing.

The Structural-plates line is suspended and the existing Sealed granules line is resumed. Granules return to Export policy.

A second full Save/Load checkpoint occurs **with the assistance obligation open**, preserving the same factories, machines, belts, cargo, market/opportunity history, milestones and company standing.

The resumed physical export line must then:

- reduce debt through gross export compensation before net fuel;
- use repayment-earned continuation only if it becomes legitimately eligible;
- eventually reach debt zero and clear standing;
- preserve the same intervention semantics established by #72.

No Order/Directive bonus is available at this point because both opportunities already completed earlier in the same scenario.

### 6. Final persistence and conservation

At the final clear-standing state:

- both Phase 5 opportunities remain completed;
- milestone/terminal handling remains unlocked;
- exported-flow totals and market saturation remain persisted;
- all physical factories/routes/materials remain ledger-accounted.

The complete final Save is loaded into a fresh simulation and must serialize byte-for-structure equal to the saved state. The material ledger must reconcile again after restoration.

## Accepted child evidence reused accurately

The integrated review does not erase or misattribute the already accepted child evidence.

### #69 — Materials Exchange

Existing domain coverage already proves hidden-listing eligibility, deterministic compensation/saturation and market-memory Save/Load. #73 adds the world-level connection from real discovery and physical staging through later saturation/diversification.

### #70 — Orders and Directives

Existing tests prove eligibility, bounded offer/expiry, no hidden Directive outcome, one-shot rewards and physical-export Order progress. #73 adds one scenario where the live Directive causes a real production switch and the live Order completes from the same world's physical terminal exports.

### #71 — milestone and terminal handling

Accepted browser/domain evidence proves granules remain staged/backpressured with zero export/reward before handling, and a real Sealed trial unlocks handling. #73 carries the same rule through listing, opportunity completion, saturation and recovery without seeding the capability.

### #72 — assistance/recovery

Accepted exact-head `e67cd1ed7a1a1ea19fb50709fb3670cdb3dda095` evidence includes:

- focused 8 files / 109 tests PASS;
- full suite 30 files / 197 tests reported PASS, exit 0;
- the isolated storage rerun subsequently reported **1 file / 8 tests PASS, exit 0 without warning**;
- typecheck, lint and build/static export PASS;
- actual browser UI proof of normal depletion → assistance → real Sealed trial → legal exports → clear standing → Save/Load, with console `warn=[]` / `error=[]`;
- deterministic saturated second-intervention continuation coverage.

Those are child-issue results. They are not represented as #73 exact-head verification.

## Verification commands

The acceptance above used these commands:

```bash
npm test -- packages/sim-core/test/phase5-exit.test.ts packages/sim-core/test/market.test.ts packages/sim-core/test/opportunities.test.ts packages/sim-core/test/milestones.test.ts packages/sim-core/test/assistance.test.ts packages/sim-core/test/ledger.test.ts packages/sim-core/test/persistence.test.ts packages/sim-core/test/storage.test.ts
npm test
npm run typecheck
npm run lint
npm run build
```

The new integrated test is intentionally additive to the existing focused Phase 5 domain suites; it does not replace them.

## Browser exit-review requirement

The exact-head browser run should follow `docs/BROWSER_SMOKE.md` and verify the world/terminal loop without console state injection.

Reuse previously accepted child evidence only where no runtime/UI code changed and attribution remains exact. The final #73 record still needs an integrated browser pass sufficient to show the Phase 5 pieces read as one game-facing loop, with browser console warnings/errors recorded honestly.

## Closeout rule

Local/domain/browser acceptance is recorded above. Canonical PR #79 was verified at `aef3249de6df4a7cab53a16986174439f5a9a470` and squash-merged as `dcbe1a567cc26ab150f13e159d35bf50030ee570`; #73 is closed and parent #12 is complete.

Closeout completed on 2026-09-30:

- #73 completed via PR #79 / `dcbe1a567cc26ab150f13e159d35bf50030ee570`;
- parent #12 closed after the accepted gate;
- Issue #2 records the exact merge evidence;
- Phase 5 is complete in ROADMAP/EXECUTION;
- Phase 6 remains undecomposed and no Phase 6 implementation was started during this closeout.
