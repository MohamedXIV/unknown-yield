# Phase 6 — Readable belts and controlled junctions

**Status:** approved direction; implementation pending. Recorded 2026-10-01. **Epic:** [#80](https://github.com/MohamedXIV/unknown-yield/issues/80).

This is the Phase 6 implementation contract, not a claim that junctions already exist. GitHub Issue #2 owns the live order; the linked epic and child issues own completion evidence. If code implements only part of this contract, report the gap instead of treating the code as a new design decision.

## Intent and scope

The player must understand and control factory routes from the world itself. First make belt turns and switched exits visibly truthful, then add T split/merge junctions and a controlled `+` crossing. Preserve existing factories and cargo while making these changes.

The user explicitly preferred these improvements before underground belts. Underground/elevated transport, pipes, pressure systems, vehicles, rail, drones, new materials and a general traffic framework are deferred. Phase 6 is not permission to implement the old roadmap's entire possible-scope list.

## What exists today

- `Belt.direction` is the primary outgoing direction, not a stored inlet direction.
- `alternate` and `switched` select one alternate outgoing direction. `rotateDivert` configures it; `switchDivert` activates it. Configuring an alternate alone does not change cargo routing.
- `world.ts` draws a straight belt using the primary direction and a colored circle for the diverter. It does not draw the actual bend or the alternate branch.
- Transport uses one cargo slot per belt cell, previous occupancy, deterministic reservations and at most one edge per transport update. A cell cannot currently contain two independent belts.
- A probe of the current placement validator rejected a perpendicular route through an occupied belt cell with `A belt already occupies this cell`. This proves a topology limitation, not a measured player frustration or a throughput benchmark.
- Existing input contention uses deterministic row/column order. It is not already a fair merger.

## 1. L turns and visible manual diverters

Derive connected inlet arms from actual neighboring belt exits and machine/storage output sockets. Derive outgoing arms from authoritative primary/alternate configuration. Do not infer a hidden recipe or alter topology from the renderer.

- A single connected inlet and perpendicular active outlet read as an L. Collinear inlet/outlet read as a straight belt. Endpoint cells show the configured exit without fabricating a connected inlet.
- A configured diverter shows its available branches, with arrows and a distinct active branch. Creating an alternate shows a standby branch; switching highlights the new route. The main arrow must not continue to advertise an inactive exit.
- Multiple incoming arms must remain visible; do not disguise an existing merge as an L. Missing adjacent connections are visually distinct from connected arms.
- Ordinary turns drawn while building a path receive the same treatment as manual diverters.
- Existing reverse alternates remain legal and must be depicted truthfully; do not silently migrate them into perpendicular turns.
- Shape is presentation derived from topology, not a second inventory or routing authority. No sim rule or save-schema change is required for this milestone.

## 2. T splitters and mergers

A T has three directed arms and an explicit role. Rotate the entire configuration consistently. A splitter is one inlet plus two outlets; a merger is two inlets plus one outlet. A T is not an unrestricted three-way router or a material filter.

Use a one-slot central physical buffer and deterministic round-robin arbitration on successful transfers:

- Splitter: alternate successful dispatches between eligible outlets. If the preferred outlet is blocked and the other is open, use the open outlet; if both are blocked, retain cargo and propagate backpressure.
- Merger: alternate successful admissions between eligible inlets. A missing/empty inlet is skipped. With both inlets continuously ready, each receives a turn rather than permanent row/column priority.
- Fairness cursor advances only on a successful dispatch/admission respectively, and points to the other arm after that success. It does not advance during blocked updates.
- A new T initially prefers the first configured arm; arm order is stable configuration identity, not current row/column iteration order. Rotation preserves that order and save/load preserves the cursor.
- Plan against previous occupancy. Cargo cannot enter and leave the junction in the same transport update. Reservations prevent two admissions to its single slot.
- Existing manual diverters keep manual semantics. Do not silently turn saved diverters into automatic splitters.

The blocked-arm skip is a selected baseline policy for this design, not a claim of existing behavior. A future strict-ratio policy requires a separate justified decision.

## 3. Controlled `+` crossing

The first `+` is two independent directed routes sharing an at-grade intersection: one horizontal and one vertical. Each inlet maps only to the opposite outlet. Rotating/configuring the crossing selects the allowed direction on each axis. This is not an all-to-all junction, four-way splitter or underground bypass.

- Use one central physical cargo slot. On admission, persist that cargo's axis/route; it cannot change destination when the signal changes.
- Alternate horizontal/vertical admission windows using simulation transport steps. The authored positive interval controls window duration; milliseconds, render frames, `setTimeout` and wall-clock time never own scheduling.
- A window expiring requests the other axis. Before admitting it, the central slot must clear. A held item continues toward its original outlet even after its window expires.
- Once a switch is requested, stop admitting new cargo on the old axis so a continuously busy route cannot prevent the other route's turn. At the next transport update with an empty center, open the requested axis with a fresh full window.
- If the outgoing belt is blocked, retain the item, show the waiting route and propagate backpressure. The other axis waits for clearance; this is an intentional capacity limit of a shared crossing.
- An empty/inactive axis still gets its scheduled window. Do not add demand-adaptive phase skipping implicitly.
- A new crossing starts with the horizontal axis open for a full authored window, no pending switch and an empty center. Counters advance on transport updates only; pausing the simulation pauses the signal. Restoring a save resumes its recorded phase rather than restarting this initial state.
- Signals and the held cargo route must be readable on the map without relying solely on color. Both streams can carry different materials without switching destinations or duplicating units.

## Shared architecture, content and persistence

- `sim-core` owns admission, routing, reservations, fairness, phase counters, cargo and topology validation. Phaser renders the snapshot; React edits configuration and displays status.
- T and `+` geometry is restricted to interior/exterior cells, never factory wall/port cells. Existing matching directional ports remain the sole wall-crossing mechanism. Junctions cannot occupy machines, storage or the terminal.
- Configure/upgrade an existing empty belt atomically with complete validation and authored cost. Refuse conversion/removal when cargo is present; no cargo teleport, deletion or destination rewrite. Invalid placement or insufficient stock leaves all state unchanged.
- Costs, crossing intervals and any capacity values belong in validated content. Start with the one-slot capacity specified here; do not expose arbitrary buffer sizes or speeds as unrequested feature breadth. Fixture balance is provisional, not final global design.
- Stable IDs identify junction kinds/configuration. New player text uses localization resources, resolved outside sim-core.
- If serialized state changes, bump the save schema and migrate old saves losslessly: ordinary belts, manual diverters, their cargo/IDs and company state must keep their meaning. Persist T fairness and crossing phase/pending-switch/held-route state, not just the geometry.
- Reject malformed geometry, impossible held routes, invalid counters, cargo over capacity and wall bypasses before replacing live state. The old running world survives a rejected load.
- Every held item has exactly one ledger location. Tests reconcile extraction, buffers, junctions, ordinary transit, staging, export and defined consumption; crossing never changes material identity.
- Include internal junction topology in factory blueprint serialization/validation with explicit version compatibility. Factory throughput certification must account for junction cargo and scheduling state in its cycle fingerprint; unchanged geometry alone cannot certify stable throughput.
- Preserve discovery boundaries and Phase 5 market/company behavior. No authored unknown result is required to use these routing tools.

## Dependency order and acceptance

There are three implementation milestones followed by one integrated gate:

1. [#81](https://github.com/MohamedXIV/unknown-yield/issues/81) — Readable L turns and manual diverters: presentation-only; preserve existing routing/save behavior.
2. [#82](https://github.com/MohamedXIV/unknown-yield/issues/82) — T splitter/merger: sim + content + persistence + blueprint/monitor integration + playable placement/configuration and visualization. Depends on #81.
3. [#83](https://github.com/MohamedXIV/unknown-yield/issues/83) — Controlled `+`: persisted scheduling/route identity + content + playable placement/configuration and signals. Depends on #82.
4. [#84](https://github.com/MohamedXIV/unknown-yield/issues/84) — Integrated junction exit review: one persistent playable world, focused regression evidence and a substantial final verification gate. Depends on #81–#83.

Each implementation issue includes domain/presentation tests appropriate to its change and browser acceptance, rather than postponing all usability to the final gate. No milestone is complete merely because a shape is drawn or a command exists.

The integrated path must demonstrate an ordinary L and a switched manual diverter, fair T splitting and merging, a crossing carrying two different materials to their own destinations, blockage and clearance, and safe suspend/reroute/resume without rebuilding solved factories. Save/load during T contention and during a crossing's blocked pending switch must preserve future deterministic behavior; unloading and removing the junction must conserve material and refund only the authored construction cost.

Run focused checks while working; at the integrated gate run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` and a real browser path with console warnings/errors recorded. Keep exact SHA/date attribution. This documentation change does not supply implementation or browser acceptance evidence.

## Handoff rule

Read this contract, D-033, Issue #2, the active issue and any existing canonical PR before editing code. Treat absent scheduling, misleading visuals, missing migrations or conservation failures as incomplete implementation. Do not invent a fallback, reinterpret `+` as free routing, expand to underground transport, or claim tests ran because an earlier phase passed. If the contract genuinely conflicts with new evidence, document the conflict and amend the decision explicitly before changing semantics.
