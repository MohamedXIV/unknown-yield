# Phase 6 #81 — Belt presentation acceptance

**Accepted milestone:** #81 through PR #86, 2026-10-01. This is not the Phase 6 integrated exit gate; #82–#84 remain pending.

## Change and boundaries

`apps/web/game/belt-presentation.ts` derives inlet arms from active neighboring exits and actual machine/storage sockets, and configured outlet arms from the player snapshot. Phaser draws the resulting bends/merge arms, active arrows, dashed/gated standby branches and disconnected end stops. Endpoints do not fabricate an inlet; legal reverse alternates remain visible. Changing a neighbor's exit changes the derived connection.

`structureKey` now includes belt coordinates: two legitimate worlds can reuse belt IDs at different positions, so loading one must invalidate the other's geometry. The deterministic regression failed before this correction and passes after it. No sim-core routing, cargo, content data or serialized schema changed.

## Exact validation

Implementation commit: `539a12ea54884a4349f105cc10ab1772e248d6fb`. Subsequent acceptance/status documentation is docs-only; behavioral evidence is attributed to this implementation tree.

- Focused: `npx vitest run apps/web/test/belt-presentation.test.ts apps/web/test/interaction.test.ts packages/sim-core/test/routing.test.ts packages/sim-core/test/persistence.test.ts --maxWorkers 4` — 4 files / 33 tests PASS, exit 0.
- Full: `npx vitest run --maxWorkers 4` — 32 files / 206 tests PASS, exit 0. No worker-shutdown warning in this final run.
- `npm run typecheck`, `npm run lint`, `npm run build` — PASS, exit 0. Build verified player-only static export, with no Studio route or authoring component.
- `git diff --check` and staged whitespace check — PASS.

An earlier default full run passed 205 tests but warned while terminating a worker. A follow-up full run included the newly added coordinate-invalidation regression and failed that regression before its fix. The final 206-test run above supersedes both. No test timeout, assertion or repository runner configuration was relaxed.

## Browser acceptance

Fresh site on `http://127.0.0.1:3030`, built entirely through normal UI; no save seeding, simulation commands injected through devtools or inventory injection.

1. Place an extractor on veined ore and draw a route with an ordinary L. The visible bend follows its inlet/outlet instead of drawing a straight segment.
2. Add a depot and a manual north alternate on the eastbound route, then build its north branch. Configuring alone shows standby; switching changes the active arrow/track, with real ore retained and moved through the selected route. Restore main flow. Correct the terminal belt's outgoing direction through the ordinary alternate controls to feed the depot; observe 6 ore retained there.
3. Save a paused standby checkpoint, switch active, load and observe standby plus the held ore restored.
4. Build a 6x6 factory and matching eastbound wall port, then draw a straight belt through it. Open roof shows interior track; closing roof hides it while the external port stays readable; reopen for diagnosis.
5. On the final implementation tree, save the paused north-active route, restore main, load and inspect again. Final visible state: 496 plates, 99 fuel; north alternate active and one veined ore on the selected diverter, with the bent route, branch and factory preserved. The depot held 6 ore. Console warnings/errors: `[]`.

All bend rotations, multiple inlets, reverse alternates, disconnected endpoints, machine/storage socket orientations and neighboring topology changes have deterministic presentation tests. The browser path proves representative live visuals and interactions, not every possible orientation or performance at scale. T fairness and crossing scheduling are not implemented or claimed here.
