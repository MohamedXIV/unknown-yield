# Roadmap — The First Assignment, Personnel Archives & Industrial Atmosphere

**Status:** proposed next player-experience Epic (5 November 2026), ready for GitHub issue decomposition; not implemented by this document. **Design source:** [GAME_DNA.md](GAME_DNA.md). **Baseline:** main; independent of UI reskin PR #339 and extractor-art PR #291.

## Why this track

Unknown Yield already simulates industrial discovery, physical cargo, factories, company exchange, late-game technology and a six-beat Field Brief. But a new player currently enters the running world instead of a distinctive appointment/menu; the tool catalog is too broad early, only one local saved expedition exists per pack, and the world's visual atmosphere is not yet a purposeful dim alien installation.

**Player outcome:** launch the game → choose/create a safely isolated expedition → receive a brief Directorate appointment → learn extractor, shell, crusher, routes, experiment and export through state-responsive play → continue the science-driven sandbox on a readable, atmospheric alien site.

This track is about a coherent beginning and personality, **not a new foundation engine or general UI redesign**.

## Dependency map

```text
P0 Save slots + migration ────┐
                             ├── P1 Main menu + boot / resume
P2 Operational authorizations┼── P3 First Assignment + onboarding
                             └── P4 Official broadcasts / identity feedback
P5 Planet profile / terrain ──── P6 Targeted Phaser lights + measurement

P0 + P1 + P2 + P3 + P4 + P5 + P6 ──── P7 End-to-end player-journey gate
```

P0/P2/P5 can start independently from **main**. P1 uses P0. P3 requires P2 and P1's initial appointment integration (its underlying Field Brief already exists). P4 uses the real event/authorization semantics from P2/P3. P6 needs P5. The integrator P7 runs after the accepted predecessors.

## P0 — Personnel Archives: independent save slots

**Question:** Can a player create and resume multiple expeditions without accidentally overwriting a prior world or importing the wrong content pack?

- Extend the existing Session/localStorage boundary with stable slot IDs and a small index/metadata layer, no duplicated simulation authority.
- Slot list, named save/load, new game, rename/delete confirmation, legacy single-save adoption or import, incompatible/corrupt save recovery.
- Protect exact content fingerprint, schema and atomic replacement; settings remain globally separate.
- Preserve normal manual save and decide autosave based on actual implementation constraints.

**Acceptance:** two different worlds diverge, save and load without cross-contamination; old single-save records remain recoverable; incompatible and quota failures preserve current world; browser and unit tests cover index/slot changes.

## P1 — Main Menu: Propaganda Meets Reality

**Question:** Does a first-time player understand who they are and how to start, resume or inspect an assignment?

- Implement the selected Concept C: operating industrial site + restrained state-poster layer + accessible enamel command plaque.
- New/Continue/Load/Settings/Help/Credits as appropriate; buttons always functional, disabled when unavailable.
- No false Quit on web. No opening dashboard or UI redesign of live gameplay.
- Desktop/mobile keyboard, touch, focus and reduced motion; startup chooses Menu before the normal world (with safe testing/deep-link considerations).

**Acceptance:** browser scenarios cover empty archive/new game, valid Continue, selected slot Load, back-to-menu and settings; screenshots visually demonstrate propaganda-vs-reality.

## P2 — Directorate operational authorizations

**Question:** Can the early build palette stay small and useful, growing after *actual* introductory achievements without disclosing unknown science?

- Add authored, data-driven introductory authorization gates independent from existing knowledge/milestone-based scientific unlocks.
- Sequence begins with basic Extractor, Factory Shell, Crusher plus mutually necessary ports/belts, and then experiment/export guidance. Final grouping/order must be proven against prerequisites to avoid a soft-lock.
- Grouped build palette reveals meaningful authorized options rather than dozens of locked icons; explain requirements without leaking future materials/processes.
- Correct behavior on old or progressed saves, guide dismissal, alternate valid build paths and active incidents.

**Acceptance:** fresh world progresses through functional production without manually bypassing gates; later scientific capabilities still depend on evidence; progressed saves do not lose tools; hidden recipe truth remains private.

## P3 — The First Assignment: contextual official tutorial

**Question:** Can a player complete a real first export while feeling guided by an absurd-but-coherent industrial Directorate rather than a checklist?

- Reuse/refactor the existing six-beat public-snapshot-derived Field Brief, not a second tutorial engine.
- Optional ceremony, one short contextual task at a time, dismiss/reopen, skip/catch-up behavior, truthful actual machine/port controls.
- Teaching factory interior/exterior, material conservation, first experiment/notebook and physical terminal shipment; recovery interrupt only for true incidents.
- Progress follows real sim state, not narrative reward injections or real-time timers.

**Acceptance:** fresh first-export playthrough with no cheated inventory or learned reaction; tests for alternate route, dismissed guidance, resumed save and incident priority; child-friendly clarity without removing sandbox freedom.

## P4 — Directorate dispatches and genuine industrial personality

**Question:** Can the state glorify ordinary actions hilariously while all engineering/status information remains objectively accurate?

- Authored short congratulatory notices / radio bulletins tied to real public evidence/events; separate ceremonial copy and factual diagnostic source.
- Celebrations for authorization, first extraction/factory/flow, observation, first shipment; sensible suppression, read history and reduced interruptions.
- Replay-safe presentation after save/load; no fabricated goods, ranks, money, recipe outcomes or fake metrics.
- Reuse shared branding between menu, first brief and field notices without expanding into full dialogue, campaign or UI redesign.

**Acceptance:** observed dispatches correspond to actual state changes; no duplicate spamming after reload; every associated engineering action remains correct and accessible.

## P5 — Planet environment profile: one dim world

**Question:** Can one authored alien landscape make the site feel like a distinct world before building a multi-planet system?

- Profile-controlled terrain/base palette, ambient target color/intensity and purposeful geological variation.
- Choose one initial cool-twilight or dim/ashen identity and evaluate against real construction/readability images; allow future variations as *presentation data*, not new planets.
- Maintain deposit, port, conveyor, placement-ghost, status and selection contrast; keep menu backdrop aligned with gameplay.
- No time-of-day schedule, terrain-simulation changes, procedural world-family feature or new climate mechanics.

**Acceptance:** world screenshots across starting site and running machinery; valid readability and color-distinction checks; no changes to saved simulation truth.

## P6 — Phaser 4 limited dynamic-light pilot

**Question:** Can real world-space fixture lights improve 2D diesel-industrial depth within the measured browser/mobile budget?

- Verify actual Phaser 4 WebGL lighting support on the current renderer/art mix; explicitly enable appropriate objects instead of assuming all Graphics benefit visually.
- Target terminal floodlight, one working machine glow and one hazard/operating indicator only, based on real state.
- Test optional normals/self-shadows on a representative asset, use a reasonable fixed ambient and prefer simple no-light fallback when renderer/device demands.
- Compare before/after screenshots, frame pacing, batching/draw calls and mobile-browser load. Avoid lighting every background detail.
- Configurable brightness/quality if warranted; no day–night cycle.

**Acceptance:** production-browser visual proof, measured baseline/delta, acceptable fallback, no impaired tile/port/cargo legibility and no authoritative simulation changes.

## P7 — Integrated first-expedition acceptance and human review

**Question:** Do all features together form a coherent, approachable, memorable first journey rather than seven isolated systems?

One continuous fresh-expedition scenario:
1. Open Main Menu → create a named slot.
2. Read/skip the real optional assignment.
3. Place Extractor → authorize Factory Shell → build usable Crusher/routing → run unknown process.
4. Observe actual evidence, interact with Notebook, close/reopen factory, and legitimately ship first product.
5. Verify celebration text and menu return.
6. Save/reload same expedition and switch to a distinct second expedition without losing the first.
7. Verify that the dim planet and selective machinery lights keep every relevant gameplay control readable.
8. Run existing deterministic conservation, knowledge-secrecy, compatibility and browser/touch tests.

**Exit evidence:** focused unit/integration assertions, exact-head typecheck/lint/build, production Chromium desktop and touch-emulated tests, before/after screenshots and performance evidence. Human visual/onboarding and actual mobile GPU judgment are explicitly separate from automated PASS.

## Delivery rules

- One significant deliverable per issue/PR with tests for changed behavior.
- Changes branch from verified main, not the pending UI-art or machinery-art branches.
- Avoid mixing screen-wide UI restyling into this Epic; use current assets or new bounded scene art only where necessary.
- Never relax material conservation, secret recipe separation, existing machine/operation rules, schema versioning or content-pack compatibility to make a guided step pass.
- Propose and test the actual machinery unlock dependency order before writing propaganda dialogue.
- The player may dismiss instructions; progression remains real and open-ended.

**Deferred:** multi-planet selection, planet generation, day–night cycle, colony/citizen simulation, lengthy campaigns/dialogue trees, unproven global lighting conversion, cloud saves, general graphic UI reskin and full 3D production.