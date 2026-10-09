# Phase 20 — Smart Construction & Selective Dismantling

**Selected by the player on 2026-10-09.** Canonical epic: [#261](https://github.com/MohamedXIV/unknown-yield/issues/261). This is an **active roadmap**, not a claim that the work has shipped. Start at [#262](https://github.com/MohamedXIV/unknown-yield/issues/262) and follow the issue dependency graph.

## Product problem

Today's player builds a belt by dragging a Manhattan path. The client sends the complete set of cells to sim-core. One already-occupied belt cell triggers validation failure for the entire command. The path direction is inferred for new cells, but existing endpoint direction, factory ports, diverters and junctions need explicit continuity checks before they can safely be treated as reusable. Dismantle accepts a single entity ID; there is no authoritative batch-target reporting or filtered world-space selection.

The objective is not merely fewer clicks: **the player should be able to extend, splice, correct, and carefully remove production infrastructure while respecting the physical industrial world**. No disappearing cargo, silent demolition, hidden-recipe exposure, or automatic control over authored processes.

## Desired feel, with concrete examples

### 1. Smart idempotent belt planning

If the player drags a continuous eight-cell line, with cells 1–3 and 6 already occupied by *compatible, correctly oriented* belts, the intended plan is:
- four existing belts reused without creating entities or charging materials;
- four missing segments added and charged exactly once;
- success counted as **4 added / 4 reused / 0 blocked**, including a clear preview;
- performing the same gesture again results in **0 added / 8 reused**, no cost, no placement audio.

Existing cells may be at the start, end, or inside the path; separate empty gaps must be filled. If there is an incompatible facing, cargo-bearing special junction or an unrelated building on the route, the planner must show the obstruction and cannot silently rotate, erase, replace or route around it. All-resource-failed and no-op cases must not masquerade as successful physical construction.

The gesture's direction determines planned flow along bends. Existing compatible endpoints/ports should be joined only when sim-core confirms physically valid directed connectivity. A right-angle L may be ambiguous: expose a simple choice of horizontal-first / vertical-first rather than guess a dangerous detour. Single-cell `R` rotation is preserved.

### 2. Safe directed liquids and gas

Liquid `placePipes` and gas `placePressureLines` should eventually get equivalent compatible reuse and missing-cell insertion. Existing `inlet`/`outlet`, containment and cargo rules matter; “same occupied cell” is **not** proof of a compatible path. P1 ground belts and P2 connection semantics precede P3 pipe/gas parity.

### 3. Four modes of dismantle

| Player-facing mode | Gesture | Inclusion |
| --- | --- | --- |
| **Single** (default) | Click/tap a target | Exactly one valid player-built object |
| **Area: All** | Drag/select a rectangular region | All eligible player-built objects, under safety gates |
| **Area: Exact type** | Start on a target and drag selection | Only the first target's exact entity type/definition |
| **Area: Family** | Start on a target and drag selection | Only the first target's semantic parent family |

“Exact type” distinguishes, for example, one machine definition from another. “Family” is broader: a **transport lines** group can contain ground belts, liquid pipes and pressure lines; other families may include machines, storage/containment and route objects. The family taxonomy must come from actual placed entity semantics, not simply from the Phase 17 build toolbar (where liquids and solids are separated). Imported machine IDs must still work.

For every mode, **preflight then commit**: distinguish eligible/blocked/ignored targets, tell the player why loaded and structurally dependent equipment is protected, show counts and reclaim estimate, and require explicit confirmation when warranted. The default Single tool remains non-destructive until clicked; touch panning/pinch and right-drag desktop camera must not dismantle anything. No irreversible surprise operation while the selection is being drawn.

Areas, endpoint-attached elevated/underground routes, factory shells vs open interiors, ports, and overlapping entities require careful hit-test priority. An entire route has a stable identity and must never be double-selected. Resource deposits and the orbital terminal are not player-built dismantle targets.

### 4. Additional high-value UX

- **Pipette/sample tool**: point at an existing machine or logistics piece and select the corresponding build tool without menu hunting; unlocks and dynamic content IDs still apply.
- **Live preflight legend**: new vs reused vs blocked (construction), eligible vs protected vs ignored (demolition), cost/reclaim estimate and reason text. Color must not be the only signal.
- **Visible bend choice**: flip L-corner routing when there are two equally short valid paths; show arrows before release.
- **Deliberate touch/keyboard action path**: keyboard-accessible mode switch, confirm/cancel, helpful focus/announcements, and an alternative to error-prone direct touch dragging for destructive selection.
- **One short gesture, one feedback cue**: avoid per-tile SFX/VFX allocations and keep the Phaser world as the dominant view.

### Design decisions owned by P0 (#262)

P0 finalizes the reusable-vs-incompatible rules, semantic family classification, geometry-selection inclusion rules, selection-size cap, mixed valid/blocked batch policy, target ordering for factory descendants, safe command and preview/result shapes, and accessible pointer/touch input contract. Later issues must not make contradictory local decisions.

The design must keep the **authoritative commit** separate from prediction. Sim-core validates the actual world, inventory, cargo, health/containment and dependencies at command time. Previews do not mutate world state or replace that validation. A stale preview cannot authorize deletion.

## Delivery graph

```text
#262 P0: UX/semantics + classification contract
  ├── #263 P1: idempotent gap-aware belts
  │     └── #264 P2: flow direction + safe joining
  │           └── #265 P3: pipe/pressure-line parity
  └── #266 P4: authoritative batch dismantle
        └── #267 P5: four selective area modes
#264 + #267 ──> #268 P6: ergonomics/accessibility
#263–#268 ─────> #269 P7: production-browser + conservation exit
```

Each child is a separate issue and focused PR. P1/P2/P3 and P4/P5 may proceed as independent tracks **after P0 decisions**. P6 is deliberately late enough to integrate two real workflows instead of polishing a mockup. P7 records exact evidence and closes the epic only after safeguards and the completed production-browser integration are proven.

## Code boundaries and regression guardrails

- `apps/web/game/interaction.ts`: existing `beltPath` and `buildCommand` for route commands and single dismantle.
- `apps/web/game/world.ts`: world gesture start/end and preview rendering, mobile cancellation, Phaser graphics invalidation.
- `packages/sim-core/src/commands.ts`: `placeBelts`, `placePipes`, `placePressureLines` and cargo-/buffer-safe `dismantle`; new multi-target operations must preserve their checks and tracked refund behavior.
- `apps/web/components/GameClient.tsx`: grouping, inspectors, notices, hotkeys/preferences and accessible controls.

No React state on every frame, no mutable truth in Phaser, no automatic world hot-swap, and no generic undo/replay subsystem. Do not add construction timers (Phase 19 #250 NO-GO), blueprint/upgrade planners, automatic underground obstacle-avoidance, bulk forced destruction or a broad visual re-skin under Phase 20.

Test new route costs and conservation, nested structure dismantling, stale/duplicate IDs, save/restore and dynamic authored content. Use economical GitHub Actions PR merge gates and the real static-production browser harness; do not substitute Chrome emulation for physical-device FPS evidence. Phase 7 32-factory profiling budget remains deferred and unmet.

## Exit

[#269](https://github.com/MohamedXIV/unknown-yield/issues/269) supplies the integrated reproducible world proof: reuse existing belts, close discontinuous gaps, turn into a valid connection, join liquid/gas lines, use all four dismantle modes including loaded/protected equipment, verify materials and save/load, and exercise desktop/keyboard/mobile-emulated controls. Create `docs/PHASE20_EXIT_REVIEW.md` at that point, listing measured results and remaining human/device review separately.

The Phase 20 roadmap authorizes no other gameplay phase or automatic visual re-design.
