# Phase 20 P0 — World Interaction Contract

**Status: agreed design contract; runtime implementation and automated tests remain OPEN under [#262](https://github.com/MohamedXIV/unknown-yield/issues/262).** Read [PHASE20_SCOPE.md](PHASE20_SCOPE.md) first.

This document records the decisions achievable by GitHub-side code/design review without a local VM. It is not test evidence or an implementation claim. The Codex Cloud worker owns checked-in TypeScript + runnable tests and may propose a clearly explained contract amendment if exact sim-core constraints contradict any rule here.

## 1. Existing contracts and ownership

- `apps/web/game/interaction.ts`: `beltPath` traverses x then y, `buildCommand` supplies all cells to `placeBelts`, `hitTest` chooses one ID; `demolish` makes a single `dismantle`.
- `packages/sim-core/src/commands.ts`: `placeBelts` validates every cell with `beltError` and currently rejects existing belts; `placePipes` and `placePressureLines` validate directed inlets/outlets and staged occupancy. `dismantle` enforces cargo, buffer, active job, port and factory-child protections.
- `packages/sim-core/src/types.ts`: canonical entity IDs in save/snapshots; machines and storage have `definitionId`; belts may carry a `junction` and `cargo`, pipes and pressure lines have `inlet/outlet`; routes are one logical object with `entry/exit`. No player-facing string is a type.
- `apps/web/game/world.ts`: pointer/touch gestures, view-only graphics and command previews. `GameClient.tsx`: UI and accessible status, but never authoritative production state.
- `sim-core` decides truth and effects; rendering/UI are projections. Avoid new global simulation clocks, schedulers or persistent jobs.

## 2. Pure planner and command boundary

Define a small, testable **snapshot-to-plan** boundary independent of Phaser/React/DOM. The public semantics are:

```ts
type CellDisposition = "add" | "reuse" | "blocked";
type CellPlan = { x: number; y: number; disposition: CellDisposition; reason?: string };
type PathPlan = {
  cells: CellPlan[];
  addCount: number;
  reuseCount: number;
  blockedCount: number;
  totalCost: number; // ONLY new segments, in build-material units
  valid: boolean;
};
// Shapes are illustrative; choose exported TS names that fit existing code.
```

Existing compatible structures are **reused** without ID allocation, rotation, state reset or charge. Missing legal segments are **added**. Incompatible or foreign occupancy becomes a **blocked** cell with a stable reason code. A blocked build path commits **nothing** (atomic topology) and does not spend inventory; it may be previewed as a mixed add/reuse/blocked plan. Resource insufficiency is a path-level blocker: never implement a silently shortened partially affordable route.

On preview, compute only when anchor, hovered grid cell, selected routing mode or authoritative world structural snapshot changes — **not** on every Phaser frame and not by setting React state per cell. On commit, sim-core must recompute/revalidate from the authoritative current world; a green ghost is not permission to bypass the current state.

Successful **all-reused** path: no mutations, zero cost, no new IDs and no placement VFX/SFX. Repeat gesture is idempotent. Preserve existing single-cell R rotation (direction only affects new objects, never secretly rotates reused objects).

**Flow:** facing of new path cells follows ordered path traversal. At bends, the segment must carry outgoing flow to the next cell; a single endpoint aligns with the incoming segment only when it yields a valid connection. At an existing endpoint/port, validate actual continuity and allowed inlet/outlet roles, not just cardinal adjacency. Compatible existing junctions may be reused **unchanged** only if their current flow/branch/crossing behavior already satisfies the gesture; otherwise block. A loaded ordinary belt may be reused unchanged if fully compatible; its cargo must not be reset. P1 may restrict itself to safe directional matches while P2 expands corner/connection rules. Never implement auto-junction upgrade or pathfinding around obstacles under Phase 20.

P3 extends this logic to directed `placePipes` and `placePressureLines`; both **inlet and outlet** and (for liquids) the containment profile must match. Matching geometry alone never proves safe reuse. Do not change held cargo, pressure or containment when doing so.

## 3. Dismantle entity classification

Classify by **placed entity kind** and, where applicable, a definition ID. UI palette groups and localized names are not valid authority for demolition selection.

| Snapshot collection | Exact type token | Semantic family |
| --- | --- | --- |
| `belts` (including junction-equipped belts) | `belt` | `transport-lines` |
| `pipes` | `pipe` | `transport-lines` |
| `pressureLines` | `pressure-line` | `transport-lines` |
| `undergroundSolids` | `underground-solid` | `transport-routes` |
| `undergroundLiquids` | `underground-liquid` | `transport-routes` |
| `elevatedSolids` | `elevated-solid` | `transport-routes` |
| `machines` | `machine:<definitionId>` | `production-machines` |
| `storages` | `storage:<definitionId>` | `storage-containment` |
| `tanks` | `tank` | `storage-containment` |
| `pressureVessels` | `pressure-vessel` | `storage-containment` |
| `pumps` | `pump` | `transfer-devices` |
| `compressors` | `compressor` | `transfer-devices` |
| `factories` | `factory` | `factory-infrastructure` |
| `factories[].ports` | `factory-port` | `factory-infrastructure` |

A machine `definitionId` can come from an imported runtime content pack; never require it to appear in a hard-coded union. A junction belt is still exactly a **belt** for selection and carries its special dismantle protection unchanged. Liquid containment profiles classify **compatibility**, not the semantic kind of an existing pipe for *removal*.

`terminal`, finite `deposits`, hidden deposits and atmospheric source regions are **not dismantlable player-built entities**, even when ordinary inspect `hitTest` returns their IDs. Unrecognized/stale IDs become blocked/ignored with reasons; never use them to infer a substitute target.

## 4. Four selection modes

| Mode | Anchor | Selection |
| --- | --- | --- |
| `single` | clicked target | one ID through existing `dismantle` |
| `area-all` | none | every visible, eligible player-built object in area |
| `area-exact` | first touched real entity | area candidates with identical exact token |
| `area-family` | first touched real entity | area candidates with identical family token |

The exact/family token **freezes at pointer-down**. If pointer starts on an ore field, the terminal or empty ground, filtered mode must not switch to another target underneath or at pointer-up; report invalid anchor, no action.

**Rectangle rule:** normalize opposite corners, clamp to the map, inclusive grid bounds. For 1x1 pieces, cell center inside the rectangle is enough. For footprints larger than 1x1 (machines, factories, tanks, storage, vessels), require the **whole footprint** in the area; do not dismantle a factory merely because a selection grazes its corner. For underground/elevated routes, require **both portal/end cells inside**; select each route ID exactly once. No automatic whole-connected-network selection. Closed factories show/select their shell but not hidden children; open factory interiors can expose and select their contents. A selected factory with children remains protected until its dependencies are actually dismantled.

An individual cell can host multiple layers/IDs. Area collection is defined by entity identities plus visibility/geometry, **not** by calling single-target `hitTest` for each tile and losing overlaid structures. Stable deduplication is mandatory.

## 5. Preflight and authoritative batch demolition

Retain existing `{type:"dismantle",id}` as the default. Introduce a **bounded** batch command for area selection; the authoritative command takes stable unique IDs and enough frozen filter identity to revalidate selection at execution (e.g. `mode,anchorId,ids`), not the browser pixel rectangle as trusted world truth. The implementation may choose an equivalent schema.

Recommended initial cap: **256 unique candidate IDs per command**; an over-limit action is rejected with a clear status and zero mutation. Stable duplicate IDs collapse to one candidate; no duplicate refunds. Generate an ordered, explicit report:
- `removed[]`: authoritative successful IDs;
- `blocked[]`: id + stable reason;
- `ignored[]`: stale/filtered/non-destructible IDs as applicable;
- `recoveredBuildMaterial`: actual net change of construction material when reclaim is applied; distinguish carried cargo from recovered construction if necessary.

**Batch policy:** safe deterministic **best-effort**, not blind all-or-nothing: independent eligible targets are reclaimed and protected targets remain untouched; visibly report both categories. Revalidate every single-target restriction on a staged authoritative state before mutation. Evaluate dependencies in stable order: loose lines/routes, machines/transfer devices/storage and equipment, ports after attached transport, factory shell last. For adjacent/non-dependent IDs, use stable ID order. If a blocked child remains, its parent must still be blocked. Do not use a hypothetical successful removal to hide an actual failed child.

A batch preview and commit can differ because the simulation advances: commit must report **actual** results with no stale-force override. If commands are internally staged for performance or atomic validation, results must exactly match final applied state. Never collapse all failures into a false “success,” and never infer refunds from `CommandResult.cost` alone (some current single dismantle cases omit that field). No stock can be returned twice.

**Destructive UX:** `single` is the default each new session. For area modes, show selected/blocked/ignored counts and a reclaim estimate **before applying**; selection drag itself is non-mutating. Require an explicit confirm on multi-entity action, with Cancel and keyboard Enter/Escape; no silent apply on pinch or pan. A single-target area hit may use the existing single action UX if safe. No automatic discarding/draining of any cargo.

## 6. Interaction and accessibility

- Desktop: `X` keeps opening dismantle; choose the area mode visibly in world overlay/build controls, preserve right-button pan and `Esc` cancel. Pressing Escape while selecting must not commit. Avoid collision with grouped-tool hold shortcuts.
- Mobile: avoid treating one-finger camera pan, multi-touch pinch, canceled gestures, leave-window or long press as an implicit destructive confirmation. Expose **explicit anchor/area/confirm controls** if direct drag is ambiguous.
- Accessibility: a non-color legend and text/ARIA labels for **Add / Reuse / Blocked** and **Eligible / Protected / Ignored**, inline explanations for refusal, focusable mode choices and announcements; reduced motion suppresses any additional shake/repeated VFX.
- Construction tool sampling/pipette and flipping L-corner order are P6 (not P0); don't turn this contract into a new dashboard or general-purpose area editor.
- Production browser acceptance and human mobile-device comfort are different claims. Preserve the existing camera performance fix and inspect actual frame measurements in P7; do not assert new physical-device 60 FPS.

## 7. Acceptance cases assigned to VM-based implementation/tests

```text
Build: start-existing / end-existing / multiple internal gaps / all-existing
Build: incompatible facing / loaded junction mismatch / foreign occupancy / stock deficit
Build: reversed drag / 4 cardinal paths / both L-corner orders / factory port
Build: valid unchanged cargo on reused segments / zero-op has no sound / no doubled refund
Pipes: inlet+outlet matching / containment mismatch / loaded gas/liquid preserved
Demolish: single / area-all / exact(machine definition) / family(belt+pipe+pressure-line)
Demolish: import-pack machine definition / junction belt / tank vs pump
Demolish: loaded belt/junction/pipe/machine / protected terminal/deposit
Demolish: parent factory with and without children; ports attached to lines
Demolish: stale IDs, duplicates, 257-ID rejection, overlap and route dedup
Input: cancel, keyboard, accessible status, touch pan/pinch, reduced motion
System: deterministic fresh run, material conservation, saved-world reload, no JS errors
```

**P0 completion definition:** checked-in contract **plus** tested pure entity classifier/candidate selection or equivalent minimum TS implementation; run focused tests, typecheck and appropriate PR gate evidence in Codex Cloud VM. Merely merging these docs **does not close #262**. Codex Cloud owns runnable implementation and evidence; ChatGPT GitHub-side reviewer owns contract consistency and PR review. Any contract change must be documented and justified rather than silently weakened.
