# World building and automation

Approved 2026-09-22. Supersedes the fixed-site FIRST_PLAYABLE spec and dashboard interface.

80×60 grid, fixed three-quarter 2D, free camera, no characters or robots. Player-built extractors, factories (6–20 cells per side), processing machines, wall ports and directional ground belts. Build costs use locally produced structural plates. Machines run automatically. Closing a roof never changes simulation accuracy.

Machine definitions and placed instances are distinct. Placement previews and commits share validation. Failed commands are atomic. One-slot belt cells move simultaneously from previous occupancy; a cargo moves at most one edge per transport update. Machine sockets and wall ports enforce direction. Terminal reserves construction stock and automatically exports eligible discovered materials according to policy.

Dismantling refunds construction cost and cargo. Running machines must finish before removal; factories must be empty. Save schema 2 explicitly rejects disposable schema 1 without replacing live state. Content has a separate version.

## Implementation ledger — complete 2026-09-22
- [x] Content definitions, authored map and focused domain tests.
- [x] Spatial construction, processing, transport, export economy, refunds and schema 2 saves.
- [x] Full-world renderer, camera/build controls, roof reveal and contextual HUD.
- [x] Independent read-only review, live browser construction/discovery/export/save/load/resize check and production verification.

Evidence and limits are recorded in [BROWSER_SMOKE.md](BROWSER_SMOKE.md) and [IMPLEMENTATION_LOG.md](IMPLEMENTATION_LOG.md). Fixture balance and procedural art remain provisional; playtest enjoyment and performance at larger scales are not established. Starting stock was used to build both production lines, then locally produced plates funded another extractor. Vehicles, pipes, splitters, underground belts, robots and Studio expansion remain out of scope.
