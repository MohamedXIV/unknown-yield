# Phase 16 — Production vertical-slice exit review (#161)

Parent epic: #107.

## Decision

**Phase 16 automated/technical exit gate: PASS.**

The accepted Phase 16 children #153–#160 are reconciled on `main` through `d49806b566265a766018626fcb498132d69c1752`. The production slice now has representative art/audio/UI/onboarding, representative late-game content, explicit save/content compatibility, measured browser attribution, and an automated production-export playthrough that exercises the integrated loop without debug state injection.

This decision deliberately does **not** claim human-comprehension, subjective pacing/visual-taste, or representative physical-device/GPU acceptance. Those judgments are deferred to the user's consolidated human playthrough and are non-blocking for this automated Phase 16 exit.

## Accepted child evidence

| Child | Accepted evidence |
| --- | --- |
| #153 | Representative final-direction art assets accepted through PR #207 / main `84d5a7336fde7d21c359b242afbfc71ae00fa768`. |
| #154 | Production audio and industrial feedback accepted through PR #208 / main `748f2250f68640385c7df5e094ab48700a2476e3`. |
| #155 | Contextual onboarding accepted through PR #209 / main `3c90ac7395f1f51e380a88a0fe7ff803f30bb6e3`. |
| #156 | Production knowledge / inspector / terminal UX accepted through PR #210 / main `e0f3f02c71550f699bb8fa068ad6fcb10511d0c6`. |
| #157 | Representative content and balance slice accepted through PR #211 / main `a2b431039cbcd7d3e843ddf5e542ed7ee259b521`. |
| #158 | Save/content migration and compatibility hardening accepted through PR #212 / main `bd8a5616455da0e78ce0a48e464e99b375f49caa`. |
| #159 | Production-export browser attribution accepted as the online engineering gate through PR #214 / main `8beaab2583420af7fb0e9ab6852e6e2365c42df6`; physical-device/GPU validation explicitly deferred. |
| #160 | Structured production-slice playtesting accepted through PR #215 / main `d49806b566265a766018626fcb498132d69c1752`. |

## Integrated behavioral evidence

The #160 production-export run exercised the representative loop through normal game/browser interaction:

1. **Discover / observe** — a fresh expedition started with contextual onboarding and unknown authored outcomes remained hidden.
2. **Experiment** — the Furnace thermal trial produced an observed result which then appeared in the notebook; still-hidden outcomes remained absent.
3. **Industrialize** — the run built two extractor/factory/crusher production lines, observed physical cargo movement and diagnosed a full output buffer with no connected destination.
4. **Reconfigure / recover** — factory close/reopen and footprint modification preserved internal machines; a new wall port and belt path restored outbound flow without deleting existing material.
5. **Export** — Magnetic ceramic was physically staged at the terminal, retained under `Keep`, placed into a manifest and dispatched.
6. **Persist / resume** — the browser saved staged physical cargo, reloaded the page, restored the saved 12 units, and dispatched again.

This demonstrates the automated behavioral sequence **Discover -> Experiment -> Industrialize -> Export**. Whether a human player subjectively understands that sequence without assistance remains deferred human-review evidence rather than an automated claim.

## Verification and runtime evidence

At PR #215 exact head `61abf2d0cab75cbef12bcb49b62aab24079aa621`:

- `npm test`: 111 files passed, 1 skipped; **532 tests passed, 3 skipped**;
- `npm run typecheck`: PASS;
- `npm run lint`: PASS;
- `npm run build`: PASS;
- production browser structured run: **9/9 stages PASS**;
- no uncaught page errors, failed requests, or HTTP responses >= 400;
- GitHub Actions CI run #170: PASS;
- Vercel preview: READY.

The production browser run found and fixed three objective defects before acceptance: missing production icon, a clipped build toolbar at 1365x900, and missing web-workspace development dependencies required by Vercel TypeScript builds.

## Performance boundary

#159 recorded three production-export `?perf=1` captures on the Codex VM. The measured JavaScript subsystem p95 values stayed at or below **2.3 ms**. Headless software-WebGL frame intervals were much higher and were explicitly not accepted as a representative physical-device/GPU result.

That evidence does not justify reopening deferred Phase 7 optimization. No browser frame budget or hardware PASS is invented after the fact.

## Save/content and simulation boundaries

The accepted Phase 16 work preserves the existing architecture contracts:

- `sim-core` remains authoritative for gameplay truth;
- hidden authored reaction truth stays separate from player knowledge;
- physical material remains tracked through production, buffering, routing, staging and export;
- save/content migrations remain explicit;
- the production export excludes Content Studio authoring routes/components;
- no Rust/WASM, worker migration, aggregate executor or render rewrite was introduced without evidence.

## DEFERRED HUMAN REVIEW

The following are intentionally deferred to the user's consolidated playthrough after the automated roadmap work:

- player comprehension and explanation of success/failure/blockage;
- subjective pacing and economic motivation;
- visual taste and presentation polish;
- physical-device / real-GPU performance judgment;
- any broader usability feedback that depends on human experience rather than deterministic browser evidence.

These items are **not marked PASS** here. They are also not Phase 16 automated-exit blockers under the recorded project decision. The later human feedback batch should be triaged into evidence-backed fixes and new issues rather than retroactively changing this automated evidence record.

## Exit conclusion

Phase 16 has a coherent production-quality **automated vertical slice** and its technical/integration gate passes. #161 and parent #107 may close as completed with the human/physical-device review explicitly preserved as later consolidated evidence.

No Phase 17 or additional gameplay scope is authorized by this review. After closeout, the next product decision should come from the user's consolidated playthrough or an explicit new roadmap decision.
