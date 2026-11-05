# Unknown Yield — Industrial UI v0.7 integration checkpoint

> Recorded 2026-11-05. **Implementation in progress: [PR #354](https://github.com/MohamedXIV/unknown-yield/pull/354).** Design continuity and source-of-truth handoff, NOT a declaration of final pixel-perfect user approval.

## Why this checkpoint exists

On November 5, the user explicitly noticed that the recently merged Main Menu [#352](https://github.com/MohamedXIV/unknown-yield/pull/352) and surrounding presentation did not resemble the **latest already-worked-on Inspector/Terminal/Notebook industrial interface**. New artwork was **not** requested. The user supplied two UI panel frame/reference sheets and asked to inspect or integrate the existing design work before further UI construction.

The actual latest implementation, **v0.7 (November 2)**, still lived in [unmerged PR #339](https://github.com/MohamedXIV/unknown-yield/pull/339), branch `design/ui-reskin-first-pass-20261021`; its exact verified head is `35ccb8287b033a67ff0325a2358108a2ecc18ba0`, with [green Chromium CI](https://github.com/MohamedXIV/unknown-yield/actions/runs/41413909412) and [11 REAL game screenshots](https://github.com/MohamedXIV/unknown-yield/actions/runs/41413909412/artifacts/13126223675). These are **actual implementation captures**, distinct from the separate user-provided reference concepts.

## Latest visual target (user's November 5 reference sheets)

- **ONE physical industrial manufacturing family** across Main Menu, HUD and contextual boards: heavy worn, asymmetrically formed **gunmetal/steel** panels; edged bevels/chamfers, screws and a clipboard top retainer.
- **Four visible physical layers:** outer steel frame -> recessed dark rim/bed -> contained paper or instrument inset -> real content/actions. The content must NOT appear as a floating or cropped overlay.
- **Material-specific inset:** everyday Inspector is dark technical/instrument slate; Company Terminal is cream printed official freight form inside a state-red enamel header; Field Notebook is slightly distinct cream archival evidence paper. Work orders can be rare, larger documents, NOT every routine panel.
- **Typography and accents:** expressive condensed industrial headings, readable technical body, precise data labels, restrained iron/copper edge wear, crimson enamel institutional nameplate, warm paper stock, gold/brass mechanical detail. Do not merely make every panel a dark gradient or dashboard card.
- **Space/use:** genuine full-screen Phaser world owns the scene. Boards are narrow contextual instruments, not permanent SaaS sidebars. All drag, click, resize/viewport, zoom, scroll, touch, focus, build palette, known-data filtering and company actions must remain functional.
- **Main Menu C:** keeps the *Propaganda Meets Reality* panoramic factory and functional New/Continue/Archives/Settings/Credits; its official plaque must share the same manufacturing vocabulary as the in-game boards, with more ceremony but no false production values.
- **Truth boundary:** reference concept copy may depict nonexistent machinery/stats. All displayed cargo, hazard, discovery, fuel and progress must come from existing authoritative simulation or lawful UI state.

## Technical reconciliation / source files

The original PR #339 branched before [#351](https://github.com/MohamedXIV/unknown-yield/pull/351), [#352](https://github.com/MohamedXIV/unknown-yield/pull/352) and [#353](https://github.com/MohamedXIV/unknown-yield/pull/353). **Do not merge/fast-forward its 42 old commits wholesale.** `main` already has working multiple expedition saves, a dedicated menu and cold-twilight profile.

The safe integration in **PR #354** was rebuilt from latest main:
1. Copy latest actual v0.7 `apps/web/app/game-ui-skins.css`, `game-ui-geometry.css` and `apps/web/public/ui/*.svg` assets.
2. Port only the live contextual shell/header/contained bed JSX from #339 into the current `apps/web/components/GameClient.tsx`; retain recent game state, slot handling, content packs and simulations.
3. Mount the same original texture, retainer, seal, type hierarchy and metal treatments in the real `MainMenu.tsx` using `game-menu-industrial.css`, without replacing controls or world panorama.
4. Re-run deterministic tests, typecheck, lint, static production build, real Chromium desktop/mobile acceptance and capture comparative screenshots. Confirm actual DOM computed surfaces, reading-room fit, scroll and touch.
5. Ask for **visual review** comparing new screenshots to the supplied reference sheets. CI passing is necessary but not sufficient for artistic acceptance.

**Current status:** integration PR, not a visually approved/merged final theme. Do not base subsequent First Assignment UI changes on the earlier naked main-menu plaque as if it were the chosen final look. P2 administrative authorizations can proceed in domain logic but should not finalize palette/panel affordances until visual continuity is settled.

## Exact prior records

- [Original user image reference index](USER_SUPPLIED_UI_VISUAL_REFERENCES_V0_2.md): earlier four image concepts and truth boundaries; originals in ChatGPT Library, not necessarily in the repository.
- [Shared design grammar](SHARED_UI_VISUAL_GRAMMAR_V0_1.md): cross-screen semantics, ceremony vs engineering truth.
- [Main Menu C design draft](MAIN_MENU_DIRECTION_V0_1.md), currently on separate planning branch [PR #341](https://github.com/MohamedXIV/unknown-yield/pull/341).
- [PR #339, v0.7 tested UI implementation](https://github.com/MohamedXIV/unknown-yield/pull/339). Do not close as superseded before PR #354 is validated and approved.
