# Phase 17 exit review — hierarchical build-tool and interaction UX

Parent epic: #217. Exit issue: #223.

## Status

**COMPLETE — automated/technical production-browser exit gate passed.**

Phase 17 replaces the flat, ever-growing build-tool catalog with a hierarchical interaction model while preserving gameplay truth and sim-core authority. The accepted interaction model is now exercised against the built static production export, not only a development server.

Subjective visual polish, broader UI restyling and the requested later “AI-ish appearance” pass remain intentionally deferred. This review does not claim that visual-taste work is complete.

## Canonical delivery

| Child | Delivery | Main |
| --- | --- | --- |
| #218 — grouped build palette contract | PR #225 | `6a4132e5e6b859ca979a10b1dc20bff68fac4f7a` |
| #219 — hold-to-open grouped submenus | PR #226 | `dcc1a2525a699d07400f996c16e0d9ebaa6559b2` |
| #220 — contextual keyboard shortcuts | PR #227 | `49b01aa52c04bd4db128048d2e420aaccf9a8f0e` |
| #221 — Game Configuration + persisted UX preferences | PR #228 | `44b720af9df422a6aae5698e67728ca7d4dada66` |
| #222 — last-used grouped primary promotion | PR #229 | `612a0254802d21f76fd95e30db98ef244c6f6ce5` |
| #223 — production-browser exit gate | PR #230 | `a9f7d8374aec98e42c101c96a8487568a322b225` |

The exact Phase 17 exit-gate code head was `d2b25105313cda6e43e962912568d2e374d320a6`. Canonical CI run **#189** / run id `37625741822` passed on that exact head before PR #230 merged.

## Accepted interaction contract

The production browser proves the build surface is no longer a flat all-tools catalog:

- the top-level palette contains exactly **10 entries**;
- **8** are functional build groups;
- the two standalone entries are **Inspect** and **Dismantle**;
- a short group activation selects that group's current effective primary;
- pointer press-and-hold opens the group's submenu upward;
- holding the group's global keyboard shortcut opens the same submenu;
- while a submenu is open, contextual child shortcuts take precedence and unrelated global build shortcuts are suppressed;
- locked and unlocked child tools remain truthful inside their group;
- successful child selections are remembered independently per group;
- Game Configuration controls whether remembered children are promoted to the visible/quick-select primary;
- disabling promotion preserves the remembered child but restores the canonical primary;
- an unavailable/locked remembered child falls back deterministically without erasing memory;
- re-enabling promotion and later availability restores the remembered child as eligible;
- the visible top-level name, cost and lock presentation all follow the effective primary;
- the preference record remains separate from authoritative expedition saves and persists across reload.

No accepted Phase 17 child changes simulation rules, authored hidden truth, gameplay IDs or the expedition save schema.

## Production-browser evidence

PR #230 moves the integrated browser scenario to the production export without running the expensive browser test twice.

Canonical CI #189 executed:

1. `npm ci`;
2. deterministic `npm test` with the browser-heavy case skipped — **112 test files passed, 1 skipped; 541 tests passed, 3 skipped**;
3. `npm run typecheck` — PASS;
4. `npm run lint` — PASS;
5. `npm run build` — PASS;
6. static-export verification — **PASS**, including “no Studio route or authoring component”;
7. the integrated browser acceptance once against `apps/web/out` — **1/1 PASS** in 31.077s.

The browser harness requires the static server's `X-Unknown-Yield-Export: static` response header before continuing, so the exit result cannot accidentally be attributed to `next dev`.

The integrated scenario retains the established regression surface for build selection, rotate/cancel behavior, grouped locked/unlocked tools, factory interaction, solid logistics, gas/logistics visibility, Game Configuration and reload persistence. Phase 17 adds the hierarchical interaction assertions rather than replacing prior gameplay coverage.

Vercel preview status was rate-limited during the exit run and was not used as the canonical gate. PR #230 remained mergeable and the repository's own exact-head CI passed.

## Exit decision

The Phase 17 technical exit rule is satisfied:

- the toolbar no longer requires horizontal scanning of every build tool;
- pointer and keyboard grouping behavior agree;
- contextual shortcut precedence is deterministic;
- persisted last-used promotion behaves as configured;
- production-browser interaction passes against the built static export;
- no evidence requires a sim/content/save migration.

Phase 17 / #217 can close through #223.

## Deferred work

The following are **not** Phase 17 defects and remain deferred until explicitly selected:

- broad visual/UI restyling;
- visual identity and the requested “AI-ish appearance” cleanup;
- subjective human visual-taste review;
- any new gameplay system merely because the interaction layer is now cleaner.

No later phase or visual-polish initiative is implicitly opened by this exit review.
