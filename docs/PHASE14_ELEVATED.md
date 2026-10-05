# Phase 14 — Elevated solid gantries (#140)

Issue #140 adds one support-constrained elevated transport form. It is deliberately not a generic layered-routing framework.

## Problem distinction

Phase 14 now has two topology tools with different layout costs:

- **Underground routes (#139)** reclaim the buried middle span completely. Only entry/exit portals reserve surface cells.
- **Elevated gantries (#140)** stay visibly present above the site and can cross low logistics, but they require periodic ground supports and cannot pass through building airspace.

The gantry therefore solves readable crossings and corridor congestion without becoming free air routing or making ordinary belts obsolete.

## Authoritative contract

sim-core owns route placement, cargo, timing, persistence, cost and dismantling.

An elevated solid route has:

- one cardinal entry;
- one cardinal exit;
- one persisted solid cargo slot;
- persisted remaining travel steps;
- ordinary belt containment capability;
- one transport step of progress per normal site transport cadence;
- normal downstream backpressure at the exit.

Loaded gantries cannot be dismantled. Cargo never teleports into storage or disappears.

## Supports and airspace

Support constraints are authored in content:

- maxSupportSpan: maximum deck distance between supports;
- deckCostPerCell: construction cost for every raised deck cell;
- supportCost: additional construction cost for every ground support.

The fixture currently authors a maximum support span of 4 cells. Supports are placed at the entry, at each maximum-span boundary, and at the exit.

A deck:

- may cross ordinary belts, pipes and pressure lines between supports;
- may cross buried underground spans;
- may not intersect another elevated deck;
- may not pass through the terminal, deposits, factories, machines or storage footprints.

A support additionally requires its surface cell to be free of belts, liquid/gas infrastructure and underground portals. Later low logistics obey the same support reservation, so the constraint is symmetric.

## Persistence and conservation

Save schema **27** adds elevatedSolids.

Schema 26 migrates exactly to schema 27 with an empty elevated-route record because no elevated route or raised cargo existed previously.

The material ledger counts:

- one unit for cargo physically held on a gantry;
- exact deck/support construction material as embodied stock.

Dismantling an empty gantry refunds the same authored construction cost.

## World-facing interaction

Phaser renders the raised deck, periodic support columns and moving cargo above ground level. React exposes an **Elevated gantry** build/inspection tool. Drag placement snaps to the dominant cardinal axis, matching the bounded route primitive rather than introducing a pathfinder.

## Explicit non-goals

This issue does **not** add:

- elevated liquid or gas routes;
- elevated junctions, mergers or crossings between raised routes;
- arbitrary multi-turn deck graphs;
- vehicle, rail or drone logistics;
- automatic routing;
- multiple vertical height layers;
- throughput upgrades that obsolete belts.

Those require separate evidence and scope.

## Acceptance evidence

The merge gate requires:

- focused deterministic sim tests for support placement, crossing, persistence, backpressure, cost/refund and conservation;
- interaction tests for command construction, selection and structural invalidation;
- browser acceptance that the player can see and activate the elevated tool;
- full repository npm test, typecheck, lint and build on the exact PR head.

Accepted evidence on PR #195 before closeout:
- real-browser acceptance PASS for the gameplay toolbar/tool activation;
- 89 test files PASS;
- 465 tests PASS / 2 skipped;
- typecheck PASS;
- lint PASS;
- build PASS;
- GitGuardian PASS.

The final merge still requires the same gates to remain green on the exact closing head.
