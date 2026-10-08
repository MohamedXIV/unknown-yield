# Phase 19 — Technical exit review (2026-10-08)

Parent: [#248](https://github.com/MohamedXIV/unknown-yield/issues/248). Scope is **satisfying placement feedback, a conscious construction-time decision, and external Studio content-pack playtesting without rebuilding the web game**. This is a technical review, not a substitute for the owner's physical-device visual/audio evaluation.

## Delivery and design decisions

| Issue | Delivery | Status / evidence |
| --- | --- | --- |
| #249 placement VFX/SFX/impulse | PR #255, main `07886344e052d31da02ffadfd5ee08c25707912b` | Merged. Build-success-confirmed short-lived feedback, batched path cue, procedural audio/mute and reduced-motion-safe heavy-build camera impulse. Exact-head CI: tests, typecheck, lint, build and production Chrome gate PASS. |
| #250 construction time | Recorded NO-GO | Immediate placement for paths, machines and buildings remains the chosen Phase-19 UX; no timers were approved without player-playtest evidence of an actual tradeoff. |
| #253 construction job implementation | Closed NOT PLANNED | Conditional on #250 approving it. No construction jobs, staged inventory, runtime job queues or save migrations added. |
| #251 runtime Content Packs | PR #256, main `2a42160e5bac9d00afeb753a2cd874596617276b` | Merged. Strict schema-1 Studio JSON and locale validation, bounded browser file import, SHA-256 pack identity and isolated save/restore, new-world selection and built-in rollback. 573 tests passed / 3 skipped; typecheck, lint, build and production Chrome PASS. |
| #252 Studio → Playtest | PR #257, main `96ae445bf52183baf1e41544b554ef17baf2a65e` | Merged. Dedicated dev Studio draft recovery/autosave, validated pack download, documented edit→export→new-expedition workflow; no Studio in production export. 575 tests passed / 3 skipped; typecheck, lint, build and Chrome PASS. |
| #254 targeted authoring gap | PR #258, tested head `e9f9775c2e0eefd44e30acd8377fdc2ecacb1ed0` | New editable **surface deposit** table in TinyBase Studio; test creates material, finite ore field, operation/reaction and processor, then loads pack into authoritative Session and exercises placement. Rejects outside-map, overlapping, and initially unknown deposit materials. **577 tests passed / 3 skipped**; typecheck, lint, build and production Chrome PASS. |

## Functional evidence

- #251/#252: an exported Studio content+locale JSON pack is loaded in a previously built static web client **without changing code, rebuilding Next.js or redeploying Vercel**. Selecting it creates a new expedition and never hot-swaps an existing world.
- The pack SHA-256 covers the validated content and locale; imported packs save into fingerprint-scoped records and verify identity on restore. Vanilla saves retain their existing key and fallback compatibility. Corrupt, unsupported or mismatched packs fail without replacing running session state.
- #254: `packages/content/src/studio.ts` now round-trips `site.deposits` through the same versioned Studio schema; other site/economy tables remain unchanged. New finite deposits can be extracted by ordinary simulation commands and a new content-authored processor placed within the same runtime.
- The authoritative Simulation, material conservation ledger, and save schema are not modified by Phase 19. Content Studio edits and pack imports do not change active expedition inventory or saved worlds.
- Studio preserves the canonical hidden recipe truth in authoring only. The player UI still follows knowledge/discovery gates; client-side JSON is inspectable, **not DRM or cryptographic protection of authored recipes**.
- Source baseline's production-browser gate exercises the existing world-first canvas and mobile-emulated interface. It verifies content-pack import, scoped save, reload, restore, and explicit rollback without JavaScript runtime errors. No full remote CMS, external pack CDN, or global map editor was added.

## Performance evidence and limits

- The user's **60 FPS across zoom levels** is the previously accepted physical-device result for camera fix #247, not a new physical-device claim for Phase 19.
- #249 attaches event-limited short VFX/SFX at confirmed construction commands; no per-frame React render notifications, new simulation-tick work or particle simulation was added. #251–#254 do not change Phaser camera navigation or sim-core tick logic.
- #258 production headless Chrome reports zero JS exceptions, the existing camera/interaction browser acceptance PASS, and a mobile-emulated sample frame interval p95 about **35 ms**. This is **not** a 60 FPS certification across all user hardware or input contexts; actual placement sound/impulse taste and long-play device pacing remain **HUMAN REVIEW / DEFERRED**.
- GitHub Actions ran at requested PR merge gates, not as manual workflow dispatch. The unrelated Vercel status failure is a deployment rate-limit; no manual production redeploy requested.

## Exit judgment

The **technical** Phase 19 exit rule is satisfied by #249, the explicit #250 NO-GO, and #251/#252/#254's tested author-to-prebuilt-game pathway. Phase 19 does **not** certify subjective placement satisfaction, entire Studio content-table coverage, in-place save hot-swapping, or postponed construction jobs. Any future change in those areas needs new explicit scope and evidence.

See [RUNTIME_CONTENT_PACKS.md](RUNTIME_CONTENT_PACKS.md) and [STUDIO_PLAYTEST.md](STUDIO_PLAYTEST.md) for the authoring and runtime workflows.
