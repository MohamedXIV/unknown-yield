# Phase 14 Exit Review — Layered and long-distance logistics

Issue: #144  
Parent epic: #105  
Delivery: PR #196

Phase 14 evaluates topology-changing transport by demonstrated need rather than genre completeness.

## Accepted modes

Two advanced modes are accepted because they solve different spatial problems while preserving the same authoritative cargo truth.

### #139 — Underground solid and liquid routes

Accepted problem: reclaim congested surface space.

- only explicit entry/exit portals occupy surface cells;
- the buried middle span may pass under ordinary surface construction;
- cargo remains persisted in transit;
- exit backpressure retains cargo physically;
- liquid routes retain authored containment.

### #140 — Elevated solid gantries

Accepted problem: cross low logistics while staying world-visible and structurally constrained.

- the raised deck may cross belts/pipes/pressure lines between supports;
- authored periodic supports still reserve ground cells;
- buildings reserve airspace;
- cargo remains persisted in transit;
- exit backpressure retains cargo physically.

The distinction is deliberate: underground transport hides the middle span and frees all of its surface cells, while elevated transport keeps a readable world object and pays recurring support-space cost.

## Evidence-gated modes not selected

### #141 — Flexible vehicle-equivalent freight

Closed **not planned**.

The current 80×60 site has no road, terrain, traversal-cost, waypoint or dynamic-obstacle contract. Authored source footprints are at most 28 Manhattan cells from the terminal footprint. Belts already turn and branch, while underground/elevated modes already solve congestion crossing.

A vehicle would add loading, routing, blockage and persistence state without a demonstrated distinct routing problem.

### #142 — High-throughput bulk freight

Closed **not planned**.

The accepted real-flow representative factory previously certified at 30 units/min input → 15 units/min output. Current orders are only 3–4 units, terminal shipment capacity is 12, staging is 24 and the standard depot is 40.

A high nominal batch output on one machine is not enough to justify rail/monorail: parallel belts already solve local fan-out, and no accepted world scenario demonstrates a sustained long-distance bulk-trunk bottleneck.

### #143 — Low-mass high-value air freight

Closed **not planned**.

Current high-value flows are intentionally small: matrix procurement is 3 units and orbital import lots are 4–6 units. The matrix order window is 8000 ticks (800 seconds), while current fixed-route travel across the authored world is on the order of seconds.

No isolated terrain, priority-delivery deadline, flight hazard or range constraint currently gives drones/air freight a distinct niche.

## Integrated deterministic gate

`packages/sim-core/test/phase14-exit.test.ts` constructs one persistent world containing both accepted modes.

The test proves:

1. one underground solid route and one elevated solid route coexist;
2. an ordinary belt may cross the buried middle span;
3. an ordinary belt may cross an elevated deck between supports;
4. the same belt placement is rejected on an elevated support cell;
5. both routes accept physical cargo under the normal transport cadence;
6. Save/Load at mid-transit is byte-identical;
7. continued execution after restore remains byte-identical;
8. both routes retain arrived cargo under blocked exits;
9. loaded routes refuse dismantling;
10. Save/Load remains deterministic under backpressure;
11. clearing the exits allows both held units to resume without loss;
12. the material ledger reconciles throughout.

This is the Phase 14 parent invariant in one world: at least two accepted advanced modes solve different layout problems without introducing a second logistics truth.

## Browser acceptance

The existing real-Chromium gameplay acceptance is extended to verify both accepted Phase 14 tools are present, enabled and activatable through the actual build HUD:

- **Underground belt**
- **Elevated gantry**

This is an interaction/presentation gate only; authority remains in sim-core.

## Exit decision

Phase 14 is accepted if the exact closing PR head passes:

- the integrated Phase 14 regression;
- the real-browser acceptance;
- full `npm test`;
- `npm run typecheck`;
- `npm run lint`;
- `npm run build`;
- security checks;
- no unresolved blocking review threads.

Do not add #141–#143 modes merely to make the transport catalogue larger. Reopen those evidence gates only when later authored content demonstrates their distinct need.
