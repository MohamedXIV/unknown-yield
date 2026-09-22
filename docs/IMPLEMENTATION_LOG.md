# Implementation log

## Retired prototype

The initial fixed-site prototype established package boundaries, content validation, discovery and persistence checks. Its dashboard, remote links and manually operated preplaced machines were superseded by the user's approved world-building plan on 2026-09-22.

## Spatial game implementation — 2026-09-22

- Replaced the fixture/schema with an authored 80×60 site, independent machine definitions, costs, two production chains and terminal policies.
- Rebuilt pure TypeScript simulation modules for spatial placement, oriented ports, single-cell cargo belts, automated batches, atomic construction/refunds, fuel debt and discovered-only player snapshots.
- Save schema 2 validates topology, inventories and active batches before replacing state. Old saves and inherited object identifiers are rejected. Schema 1 has no migration.
- Replaced the dashboard with a full-window Phaser world, build ghosts, dragging, camera controls and roof reveal. React provides a small HUD, contextual inspector, notebook, terminal and manual save menu. Session visibility handling freezes hidden time; renderer cleanup and late-loading mode synchronization are retained.
- Kept the minimal development Studio proof isolated; no editor expansion. Production export is checked for authoring leakage.
- Updated README, design, architecture, content, simulation, roadmap and decisions to the approved scope. WORLD_BUILDING.md is the active spec.

## Review and fixes

The independent read-only final review found two concrete presentation issues: simultaneous discoveries were collapsed into one popup at an unrelated machine, and UI batch time assumed a 100 ms tick. All new observations now carry their actual producing location in transient presentation metadata; the renderer announces each one. Batch duration derives from content.tickMs. A regression verifies simultaneous heat/crush observations and non-default tick timing.

Browser testing also found that crossing a HUD overlay could cancel a long factory drag. The gesture now persists over overlays and clears on release outside the canvas. Rejected loads retain the current view as well as simulation state.

## Verification evidence

- `npm test`: 35 tests passed across four files before the final renderer-only drag-gesture adjustment; typecheck, lint and production build were run after that adjustment. (content, simulation, session and input helpers).
- `npm run typecheck`: passed on the final code, including renderer drag handling and dynamic batch time.
- `npm run lint`: passed on the final code; earlier unused imports and the explicit retained-scene alias warning were resolved.
- `npm run build`: successful static player export; only `/` and the not-found route. Export checker reported no Studio route or authoring component. Production verification completed after the renderer-only gesture fix.
- Browser acceptance, including real mouse construction, discovery, export, local expansion, save/reload, roofs, terminal policy and responsive viewport, is recorded in BROWSER_SMOKE.md.

Temporary procedural art and fixture balance remain provisional. The tests establish behavior, not performance at large factory counts or playtest enjoyment. No deployment was performed.
