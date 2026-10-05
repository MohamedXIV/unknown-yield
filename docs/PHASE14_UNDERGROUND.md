# Phase 14 #139 — Underground solid and liquid routes

## Accepted scope

Issue #139 introduces one bounded topology-changing primitive for the already-proven solid and liquid logistics systems.

An underground route is **not** a second inventory or a teleport edge. It has two explicit one-cell surface portals and one persisted buried span between them.

- endpoints must be cardinally aligned;
- at least one cell must exist between entrance and exit;
- only the entrance and exit reserve surface cells;
- the buried middle span may pass underneath ordinary surface construction;
- construction cost is the surface-equivalent belt/pipe cost across the full endpoint-inclusive length;
- cargo remains physically accounted for inside the route while travelling;
- travel takes one transport cadence per Manhattan span cell;
- when the exit is blocked, arrived cargo remains held at the exit side of the route;
- loaded routes cannot be dismantled;
- liquid routes use an existing containment profile and ordinary pipe containment/transfer limits.

The first implementation deliberately supports one direction per placed route. Bidirectional underground networks, junctions inside buried spans, underground gas, automatic pathfinding and generic tunnel graphs are outside #139.

## Solid semantics

A solid route holds at most one unit.

A surface belt may admit one compatible solid unit into the entrance when the route is empty. The unit records a remaining buried travel distance. Each ordinary transport cadence reduces that distance by one. At zero, the route behaves as a physical source at its exit portal and waits until the adjacent ordinary receiver can accept the unit.

This preserves existing belt backpressure rather than skipping it.

## Liquid semantics

A liquid route uses the existing pipe capacity, transfer and containment model.

One admitted batch occupies the route until it reaches the exit and drains. The route does not accept another batch while loaded. A protected liquid can enter only when the route's existing containment profile satisfies the material's authored requirements. At zero remaining distance, normal liquid target identity/capacity rules decide whether the batch can drain.

## Persistence and conservation

Save schema 26 adds:

- `undergroundSolids`;
- `undergroundLiquids`.

Schema 25 migrates exactly to empty route records because underground transport did not exist previously. Schema 26 requires both records explicitly.

The material ledger counts in-transit underground solid/liquid cargo separately and counts the exact embodied construction cost of each route. Save validation replays endpoint placement, direction, handling state, capacity, containment and remaining-distance invariants before accepting the world.

## Surface-space proof

Focused regression coverage places ordinary surface belt/pipe infrastructure on cells in the middle of a buried span while keeping both route portals exclusive. This is the spatial value #139 is intended to prove: topology can cross congestion without pretending the cargo ceased to exist.

Exact-head CI evidence belongs on the Pull Request. No browser PASS is claimed unless browser interaction/presentation is separately exercised.
