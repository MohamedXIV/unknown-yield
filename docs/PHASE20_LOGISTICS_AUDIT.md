# Phase 20 — Smart Logistics Route Audit & Acceptance Matrix

**GitHub-side static review, 2026-10-09.** Owner: ChatGPT (non-VM), implementation and executed tests: Codex Cloud VM. Applies to [#263](https://github.com/MohamedXIV/unknown-yield/issues/263), [#264](https://github.com/MohamedXIV/unknown-yield/issues/264), [#265](https://github.com/MohamedXIV/unknown-yield/issues/265) and later #268/#269. Complements the [P0 interaction contract](PHASE20_INTERACTION_CONTRACT.md). **No implementation or test run is claimed by this review.**

Source snapshot reviewed: main `9051b6c9d68f04b29c4652e1390fd5a8cb6fd1af`. Codex should re-read *live* source before implementing, not infer the branch is unchanged.

## A. What the existing code actually does

1. **Route input order and endpoint direction:** `apps/web/game/interaction.ts` `beltPath` (~424–435) constructs a Manhattan route **horizontal first, then vertical**. For `placeBelts` (~570–582), per-cell facing derives from the NEXT route cell; the final cell faces along the last travelled step, unless it is a one-cell click, in which case `R` direction applies. A drag in reverse direction therefore means a different transport flow, not merely a reversed selection rectangle.
2. **All-cell failure and cost:** `packages/sim-core/src/commands.ts` `placeBelts` (~897–933) checks every requested cell and costs `cmd.points.length * beltCost`. `beltError` (~684–731 in `geometry.ts`) rejects an already present belt, so a compatible already-built cell makes the entire drag fail. No legitimate reuse is possible today. Preserve the existing validator for **new** cells, but analyze occupancy before treating an **existing** cell as either reuse or blocker.
3. **Plain belts accept incoming material from every side.** `packages/sim-core/src/junctions.ts` `beltArms` (~4–24) returns `inlets=[0,1,2,3]` for an ordinary belt and a single **active** outlet (`switched?alternate:direction`). The incoming movement is allowed based on whether the destination's `inlets` accepts the opposite travel direction (`production.ts` ~208–225; ~615–629). **Do not reject a normal existing belt merely because its facing differs from the direction material enters it.** At a reused interior/start cell, however, its *active outlet* must actually face the next route cell if the requested path purports to continue through it.
4. **Junctions have genuinely constrained arms.** `beltArms`: splitter accepts the back inlet and can exit forward/side; merger accepts back/side and exits forward; crossing has two arms plus axis/window/held/pending state. `production.ts` ~623–629 tests accepted inlet and crossing gate, while ~390–397 and ~692–729 own source outlet selection/fairness. Existing junction configuration and occupied material must **never** be overwritten just because a preview arrow is drawn. An inlet can be *structurally configured* but temporarily closed/occupied: distinguish **topology-compatible** from **transfer-ready-right-now** in the explanation, not simply “already built means connected.”
5. **Diverter state matters:** `commands.ts` ~981–1042 supports alternate path, switch, explicit primary/alternate selection. A reused diverter's desired *active outlet* must match the intended continuation; leaving it unchanged is essential. A wall-port belt cannot be diverted, and a configured junction cannot be treated as an ordinary alternate-exit diverter.
6. **Source/sink compatibility is not adjacency alone:** Solid movement checks the actual recipient (`production.ts` `dryReceiver`, `targetFor`) and factories use directional ports and machine/storage socket geometry (`geometry.ts` `socket`, `portError`, `beltError`). A belt visually touching a machine without an authored compatible port/socket may not actually convey cargo. The cosmetic `apps/web/game/belt-presentation.ts` `beltPresentations` is a read-only view, **not a substitute for sim-core movement validity**. Test port, storage, machine and terminal connections with actual steps or authoritative diagnostics where appropriate.
7. **Pipes/gas are more strictly directional than ordinary belts:** `interaction.ts` ~525–545 creates `inlet` and `outlet` for each ordered cell. `commands.ts` ~324–359 and ~440–485 validate adjacent directed endpoints, duplicate/self-intersection, inlet≠outlet, stage occupancy and charge every provided cell. `liquids.ts` ~149–158 and `gases.ts` ~110–120 admit material to a pre-existing line only from its configured `inlet`. Thus reusable directed pipe/pressure segments need their **actual inlet + outlet** to match the requested traversal, plus liquid containment profile compatibility; simple “same cell” reuse loses flow semantics.
8. **Stage and committed state must differ only deliberately:** Current `placePipes`/`placePressureLines` clone the entire Save for validation, insert `id: "preview"` into the temporary stage, then allocate real IDs on commit. For reusable cells, **never insert a fake preview segment over a real existing one** or reset material ID, quantity, profile or existing ID; no duplicates or extra plates. Keep preview pure.
9. **Build UI and feedback must reflect the real applied delta:** `world.ts` draws one red/green tint for entire build preview and directional arrows along command points (~1687–1849). `placement-feedback.ts` uses new IDs after a successful command to derive audio/VFX. With reuse, provide `add/reuse/blocked` per-cell visuals and text counts; an all-reused command yields zero new IDs and **no placement cue**. Do not rerun expensive full-world planning on each 60 Hz rendered frame.
10. **Existing regression anchors exist:** `packages/sim-core/test/routing.test.ts`, `junctions.test.ts`, `liquid-logistics.test.ts`, `gas-logistics.test.ts`, `apps/web/test/interaction.test.ts`, `belt-presentation.test.ts`. Preserve cases covering diverter loaded cargo, junction split/merge fairness, crossing admission, liquid/gas backpressure, reverse drags, turns, containment and actual transport. This review does not claim to have executed those tests.

## B. Reuse compatibility across path positions (design decision)

The path contains ordered positions `p[0] ... p[n-1]`. Reused cells are not automatically equivalent to following the original gesture's full direction. Make these **structural** tests before labelling them `reuse`:

| Position on gesture | New belt | Ordinary existing belt | Existing configured junction or diverter |
| --- | --- | --- | --- |
| Start (`n > 1`) | Orient to `p[1]` | **Active outlet reaches `p[1]`**; incoming side not constrained | Selected active/allowed outlet reaches `p[1]`; no config or cargo mutation |
| Interior (`0 < i < n-1`) | Orient to `p[i+1]` | Accepts incoming from `p[i-1]` (all four on plain belt) AND active outlet to `p[i+1]` | Both inbound arm and outbound arm valid under existing config; if crossing has transient pending/held gate, report that separately |
| End (`i = n-1`) | Default to travel direction from `p[i-1]`, unless a validated explicit end-connection choice applies | Only need acceptance of incoming from `p[i-1]`; **do not require its outlet to point along the incoming step** — it can continue an existing network beyond the dragged selection | Incoming arm must be valid; don't silently change its future outlet/split behavior |
| Single cell (`n = 1`) | Existing `R` direction | Successful no-op when already occupied by a belt and no impossible connection is being promised; no auto-rotation | Safe existing no-op, never auto-reconfigure junction |

This is deliberately **not** a blanket test of `existing.direction === gestureDirection` at every point. The last reused cell can point onward to an existing destination. For an ordinary belt inserted in a bend, the material can enter from a side; its **outlet** determines where it will exit.

A reused belt can be loaded and still be structurally compatible — its cargo is preserved. Distinguish a full/occupied *runtime capacity* from an invalid *physical connection*. Block only when the requested reconfiguration would be necessary or unsafe; don't forbid building empty gap cells merely because a neighboring network is temporarily full. If the route is topologically valid but currently unable to transfer because of full buffers, the notice should say **connected but blocked flow**, not falsely claim an invalid placement.

**Atomicity:** a route containing an actual incompatible occupied cell or missing resources must cause **zero additions** and zero charge. Do not silently truncate at the blocker or fill only a convenient partial subset. A path of all compatible reused cells is an idempotent success with zero cost, no fresh IDs, no placement SFX.

## C. Liquid/gas compatibility decisions

- A line cell is reusable only if its actual `inlet` equals the requested arrival side and `outlet` equals the requested exit, except a deliberately agreed terminating connection contract that still preserves real transport behavior. L-turns require different inlet/outlet at the turning cell; forbid reversed/outward-only joins from being shown green.
- For liquids, the existing `containmentProfileId` must be the **same valid requested profile** for unconditional reuse. A different profile, even if capable of holding the current liquid, requires a separate explicit configuration action and must not be silently converted by dragging.
- A nonzero `quantity` is **not automatically a reuse blocker** when matching inlet/outlet and profile already exist: keep the exact material identity and quantity. Incompatibility must not be remedied by draining to nowhere. Gas pressure line equivalent, without containment profile.
- Pumps/compressors/tanks/vessels/terminal ports are separate transport entities, not disguised line cells. Their real flow/containment rules matter for joining; if the current primitives cannot model a safe join, expose the blocker rather than changing the neighbor.
- The `placePipes`/`placePressureLines` validation currently clones/stages an entire Save; keep the new planner bounded, and avoid cloning the world separately for each segment. Add cost for **new** cells only, from the actual relevant containment-dependent construction cost.
- A successfully reused path cannot change `nextId`, quantities, contents, route switches or future transport order. Compare serialized structures byte-for-byte before and after a no-op and after a partially reused path (excluding only added entities and charged stock).

## D. Focused VM acceptance matrix, to implement in #263–#265

Use real fixture content, `Simulation` commands and optionally tick/serialize/load. Exact positional coordinates are fixture-dependent; the acceptance outcome is not.

| ID | Target issue | Concrete path and setup | Required result |
| --- | --- | --- | --- |
| L01 | #263 | Path starts over compatible existing ordinary belt | Add remaining missing cells only, reuse first ID |
| L02 | #263 | Path ends at compatible existing belt | Accept incoming into end; do **not** force end's outlet to point along incoming direction |
| L03 | #263 | Existing compatible belts on two interior cells, multiple separate empty gaps | Fill every gap; no old IDs change, new-only cost |
| L04 | #263 | Repeat exact path after successful initial build | Zero new cells, cost=0, identical Save and no cue |
| L05 | #263 | Click one empty cell with `R` set north | New belt gets north facing, charged once |
| L06 | #263 | Click occupied compatible belt with a different `R` setting | Reuse/no-op, no forced rotation |
| L07 | #263 | Noncontiguous path, self-crossing or repeated point | Reject, zero mutation as before |
| L08 | #263 | Existing unrelated structure on a required route cell | Explain blocker and reject whole command |
| L09 | #263 | Insufficient stock for **new-only** segments | Reject whole command; preview shows exact required shortage |
| L10 | #263 | Existing compatible loaded ordinary belt in route, new gap to add | Cargo remains; valid route may build; no duplicate item or charge |
| L11 | #264 | Both horizontal-first and vertical-first L-corner paths in each quadrant | Predictable arrows and direction, every actual new corner flows |
| L12 | #264 | Drag reverse between same physical endpoints | New segments face reversed traversal; existing incompatible exit visibly blocks |
| L13 | #264 | Existing interior plain belt facing route's NEXT cell, arrival from side | **Valid**: ordinary belt accepts all incoming sides |
| L14 | #264 | Existing interior plain belt facing elsewhere | **Block**: can't continue path without reconfiguring pre-existing belt |
| L15 | #264 | Existing endpoint plain belt faces onward to next existing network cell | Valid directed join, don't rewrite endpoint direction |
| L16 | #264 | Existing switched diverter matches intended continuation | Reuse untouched; preserve `alternate`, `switched`, cargo |
| L17 | #264 | Diverter active outlet conflicts with planned continuation | Block; do not call `setDivertRoute` automatically |
| L18 | #264 | Splitter/merger/crossing with a plausible *adjacent* but disallowed inlet | Block, no junction definition/branch/cursor mutation |
| L19 | #264 | Crossing configured as matching arm but temporarily pending/occupied | Distinguish topological validity from temporary flow blockage; preserve crossing state |
| L20 | #264 | Factory directional port wall and a neighboring valid/invalid socket | Only real matching port/socket yields claimed connection |
| L21 | #264 | Connect existing belt into valid storage/machine/terminal network | Topology plus actual transport ticks/diagnostics confirm direction; no magical cargo |
| L22 | #264 | Route invalid after preview due to a just-placed structure | Commit revalidates, no stale overwrite |
| L23 | #265 | Reuse first/middle/end `placePipes` cells with exact `inlet`, `outlet`, same containment | Charge only new pipe cells, preserve all existing quantities |
| L24 | #265 | Existing pipe has same location but reversed inlet/outlet | Explicit block, no reroute or hidden drain |
| L25 | #265 | Existing pipe has differing containment profile | Block, even if currently empty, until explicit configuration |
| L26 | #265 | Loaded compatible pipe and missing adjacent gap | Preserve quantity/material, fill gap and resume movement deterministically |
| L27 | #265 | Gas line matching directed endpoints and missing gap | Same reuse and new-only construction cost; gas content untouched |
| L28 | #265 | Loaded gas line has conflicting direction | Block, never erase or vent gas |
| L29 | #265 | Liquid/gas L-turn with correctly paired inlet/outlet | Validate full directed continuity and actual movement |
| L30 | #265 | Gas/liquid path intersects pump/tank/compressor/vessel at invalid port | Respect separate entity type/real placement rules; never replace it with a line |
| L31 | #265 | Existing line path all reused | Byte-identical Save (including `nextId`), cost=0 and no placement feedback |
| L32 | #265 | Conflict after several valid added positions in planned route | Atomic zero-change failure, no partial charges |
| L33 | #269 | Save/load and continuous step after successful belt + pipe + gas gap repair | Exact ledger, persisted identities, transport flow/cargo preserved |
| L34 | #269 | Build a representative complex world and move camera while preview is static | No per-frame React rerender/full `structuredClone`; record measured frame/preview cost, not assumed FPS |

**Existing regression anchors to rerun in VM:**

- `packages/sim-core/test/routing.test.ts`
- `packages/sim-core/test/junctions.test.ts`
- `packages/sim-core/test/liquid-logistics.test.ts`
- `packages/sim-core/test/gas-logistics.test.ts`
- `packages/sim-core/test/liquid-persistence.test.ts`, `gas-persistence.test.ts`
- `apps/web/test/interaction.test.ts`, `belt-presentation.test.ts`, `placement-feedback.test.ts`

Test the current `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` for the final issue gate. Real browser acceptance belongs in VM, not this static review. No manual GitHub Actions dispatch or Vercel deploy needed from ChatGPT's docs work.

## E. Coordination with Codex

- #262 P0 (code + executable tests) precedes construction implementation. This document **does not authorize implementation before P0 is accepted**.
- Codex is already working independently in its VM. Do not modify its source branches or create a second implementation PR from ChatGPT.
- Exact source semantics take precedence over decorative previews and oversimplified “arrows equal flow” heuristics.
- If a new design decision is required, describe the counterexample in the issue/PR, preserve the player intent, and propose the smallest compatible adjustment with a focused test. Don't quietly broaden to auto junction construction, pathfinding or automation.
- ChatGPT can review Codex PRs through GitHub when they appear. The user keeps physical-device acceptance, separate from browser emulation.

**This audit is a handoff and test oracle, not an assertion that any listed tests have already passed.**
