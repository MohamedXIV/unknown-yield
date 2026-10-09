# Phase 20 P4/P5 — Static dismantle audit and executable acceptance oracle

**Owner:** ChatGPT (GitHub-side review only); **runtime/tests:** Codex Cloud VM.
**Status:** code-reading findings on main `1c07deaf39bcdc7bfd3d89b2251a83aa7921be08`, NOT new passing tests. Supplements [P0 interaction contract](PHASE20_INTERACTION_CONTRACT.md) and [#266](https://github.com/MohamedXIV/unknown-yield/issues/266) / [#267](https://github.com/MohamedXIV/unknown-yield/issues/267); do not bypass #262.

## 1. Source observations with direct implementation consequences

All references below are to the current code, not inferred hypothetical behavior.

1. **The existing single command is authoritative:** `packages/sim-core/src/commands.ts` `applyCommand`, case `dismantle` (~1152–1342), owns the restrictions and refunds. `Simulation.command` executes with `apply=true`; `Simulation.preview` calls `applyCommand(..., false)` (~57–101). A new `dismantleMany` must reuse the *same* single-target logic rather than duplicate its many safety checks in UI.
2. **An incomplete `CommandResult.cost` is not a reliable refund ledger.** Elevated, underground and factory branches return a cost; the gas, liquid, machine, storage, belt and port branches call `ok(...)` with no cost despite adding construction stock. For P4 the exact refund should be computed from authoritative structural accounting (or from the actual successful operation), not `sum(result.cost || 0)`.
3. **Structural plates vs physical carried plates must be distinguished.** An ordinary belt carrying one unit of the build-material type is allowed to return that cargo along with its dismantled structure, unless it is a loaded junction. Therefore the raw `buildMaterial` stock increase may be **larger than the structural refund**. Construction refund corresponds to released **embodied** materials in `packages/sim-core/src/ledger.ts` (~222–281), whereas cargo return is a separate physical material movement (~167–198). Report `reclaimedStructureMaterial`, `retrievedCargo` (when relevant), and `netBuildStockDelta` without conflating them. Always verify full ledger reconciliation after serialization/load.
4. **Loaded restrictions vary by kind:** elevated cargo; underground solid cargo or underground liquid quantity; gas line/vessel quantity; liquid pipe/tank quantity, or a pump's incident quantity; active machine `job` or nonzero input/output/incident inventory; storage inventory; loaded junction; ordinary belt with non-build-material cargo. A belt carrying build material has different handling than any other loaded belt.
5. **Factory parent rules are dynamic:** `dismantle` refuses a factory with ports, machines, belts, overlapping liquid/gas infrastructure (~1259–1278). A port refuses while attached lines/belts/pumps/compressors exist and while it is a relocation-required port (~1317–1339). A correctly ordered batch may safely remove eligible children **then** the port and shell; an ineligible child must leave its dependent parent protected. Do not force parent removal just because it was part of the selection.
6. **The authority stores mixed identities:** belts, pipes and gas lines use positional record keys with distinct ID values; machines/storages/factories/route records are keyed by ID; ports live in `factory.ports[]`. A batch planner cannot assume every collection is `Record<id, object>`, and should index by true stable ID once per batch rather than scan the whole world per candidate.
7. **Single-point hit testing is not an area-selection oracle.** `apps/web/game/interaction.ts` `hitTest` (~437–475) checks terminal and closed factory first, then structures, pipes, lines, routes and belts, returning deposits for inspection. For area mode, enumerate entities and their real footprint/endpoint geometry directly: do not sample one hit per cell, which can miss layered content or treat a deposit as deletable.
8. **Gesture arbitration is independent of React.** `apps/web/game/touch-gesture.ts` threshold is **8px** (~28); second touch cancels build and pinches cannot dispatch it (~55–130). New P5 area interaction must not circumvent this cancellation, and it should provide an explicit safe touch alternative for confirmation.
9. **Geometry guardrails exist:** `storageError` rejects overlap with factories (~556–598), whereas machines, belts, ports, gas and liquid may be hosted inside/at factories under specific rules. Don't invent a general “all storage is a factory child” assumption, but test parent constraints on actual valid placements and nontrivial factory interiors.
10. **Material ledger is the conservation oracle:** `collectLedger` counts source, in-world cargo, escrow, storage, staging and embodied structure; `auditLedger` checks `delta===0` (~329–334). `Simulation.load` rejects a saved world that fails audit (~419–431). Every accepted/blocked batch scenario needs before/after ledger evidence, not only an unchanged total stock.

## 2. Recommended deterministic P4 batch contract

**Committed decisions already in P0:** best-effort among *independent* eligible targets; only one explicit player gesture; stable unique IDs; upper bound of 256; revalidation at commit. The proposed oracle below clarifies how those decisions can be proved without changing old single commands.

- Parse a bounded list of stable target IDs, not player coordinates or UI labels. Deduplicate by stable ID before validation and count duplicate input as `ignored` rather than reclaiming twice.
- Reject more than **256 unique candidate IDs** with zero mutation; define the same limit for preview and actual command. Always reject attempts to include protected terminal/deposit IDs, even when a forged client submits them.
- Establish a deterministic dependency order: free transport lines/routes first, then removable machines/transfer/containers, then ports (only after connected transport), then factory shells. Within an independent class, sort by stable ID so input permutations produce identical results.
- Evaluate operations on a staged authoritative world, applying the **existing single-target command checks** at each step, so a parent sees children already removed. The preflight must not mutate the real world (including ID counter, tick, stock, cargo, factory state or flows).
- Best effort means a mixed result can have `removed=[A]` and `blocked=[B]`, but no removed item may bypass its own current checks or ignore a protected dependent item. Stable reasons should survive repeat simulations, and success messaging must not imply “everything removed” when one or more IDs remain.
- Revalidate against current authoritative world on commit; never trust the prior canvas ghost. Unknown/stale ID cannot be silently reassigned to a structure now sitting in the same location.
- Distinguish outcome counters: selected/unique, removed, blocked, ignored, structural refunds, cargo recovered, actual stock deltas. Verify `sum(removed,blocked,ignored)===uniqueEligibleInput` according to the final documented de-duplication convention.
- If the same batch is replayed after a successful removal, it must not refund again. Clarify whether stale IDs are reported as ignored/blocked but **not** as success.
- Preserve `Simulation.command` throughput monitor invalidation: topology changes should invalidate; a total no-op should not pretend to rebuild the factory graph.
- No need for a new save schema if the command is transient and only canonical structures change; nevertheless prove serialization round-trip and `auditLedger`.

## 3. VM test oracle: explicit setup, action, expected outcome

Codex must construct legal deterministic fixtures using real `Simulation`/content definitions; positions below are *not* prescribed coordinates.

| Scenario | Input | Required oracle |
| --- | --- | --- |
| B01: empty | `dismantleMany(ids=[])` | Defined successful no-op, zero changes and zero recovery |
| B02: one | One empty belt ID | Same world+inventory result as existing `dismantle` (except richer report) |
| B03: input permutation | A,B,C vs C,A,B, independent empty structures | Byte-identical final save, deterministic ordered result |
| B04: duplicate | A,A,A | Exactly one deletion/refund; duplicate is ignored/deduplicated |
| B05: stale replay | Previously deleted ID | No double refund, no substitute selection by location |
| B06: cap | 257 distinct candidate IDs | Clear validation rejection, **no** changes |
| B07: mixed blockers | Empty belt A, belt B carrying a non-build material | A removed, B retained/cargo untouched; exact reason returned |
| B08: loaded build material | Ordinary belt carries 1 build plate | If single command permits removal, structural refund **and cargo return** tracked separately |
| B09: junction | Loaded junction belt + empty ordinary belt | Loaded junction remains, ordinary belt removed, junction ID and cargo unchanged |
| B10: liquid | Nonempty pipe/tank and empty neighboring pipe | Loaded parts untouched, allowed empty parts removed; quantity/material unchanged elsewhere |
| B11: gas | Nonempty pressure line/vessel + empty line | Same: no venting or cargo disappearance |
| B12: machine | Active job or nonzero buffers + empty machine | Protected job/buffers remain; only eligible machine removed |
| B13: port dependency | Factory wall port and belt occupying it | If both selected and belt empty: belt first, then port. If only port selected: blocked |
| B14: relocation | Port required by relocation state | Still blocked even if other attachments removed |
| B15: factory dependency | Shell + internal active machine + empty belt | Remove eligible belt only, active machine and shell remain |
| B16: removable factory | Valid empty factory shell plus all dismantlable children in selection | Children then port(s) then shell, with correct refund once each |
| B17: protected/fabricated IDs | Terminal, deposit, unknown, valid belt | Protected/unknown IDs never removed; valid belt can still succeed according to policy |
| B18: imported definition | Factory processor with a machine definition from external runtime pack | Exact kind and reclaim use canonical dynamic definition ID, no hard-coded fixture assumption |
| B19: preview purity | Before/after serialize around preview | Byte-identical, including `nextId`, tick, cargo and flow records |
| B20: stale preview | Obtain preview, then change topology/load, then commit | Latest state revalidated, accurate changed blocked/removal report |
| B21: persistence | Mixed accepted/blocked batch, save and load | `auditLedger.ok`, same structures/cargo/refunds and serializable status after restore |
| B22: metadata | Gas/pipe/machine/storage/belt/port refund | No dependence on `CommandResult.cost` being populated; structural and cargo deltas independently correct |

**Do not fake successful construction/placement in tests with mutable hand-authored snapshots unless the test is explicitly about malformed state.** Build a valid site and assert that the resulting save is accepted by the same public loader.

## 4. VM/browser P5 interaction oracle

| Scenario | User path | Expected behavior |
| --- | --- | --- |
| U01 | Open dismantle (`X`) and click | Single still default; only one entity removed |
| U02 | Switch to Area All, drag rectangle then **Cancel** | World unchanged, selection cleared; no action on drag |
| U03 | Area All, choose 2 empty belts + 1 loaded pipe, Confirm | Show proposed eligible/blocked counts; commit removes belts, preserves loaded pipe; explicit partial-success notice |
| U04 | Area Exact starts on crusher vs another processor definition | Only same `definitionId` matches, even with identical machine role |
| U05 | Area Family starts on belt; select belt + pipe + pressure line + nearby machine | Only transport line family candidates; machine ignored |
| U06 | Exact/Family starts on empty ground or a deposit | Invalid anchor and **no** fallback to first found structure |
| U07 | Drag right-to-left / bottom-to-top | Same normalized rectangle and target list as reverse drag for Area All |
| U08 | Selection grazes factory/tank/storage corner | Whole-footprint rule prevents surprising large removal |
| U09 | Route endpoints inside same area | Route ID appears once, not once per endpoint |
| U10 | Closed factory vs open factory interior | Selection respects actual visible shell/interior geometry; no hidden child surprise |
| U11 | Right mouse drag to pan while armed | Camera pans, no selection commit |
| U12 | Touch scroll/pinch, canceled touch, canvas leave | No demolition and no leaked drag anchor |
| U13 | Explicit touch controls for anchor/area/confirm | Usable without unsafe pan/build conflation |
| U14 | Keyboard focus/mode/confirm/Escape | Visible named controls and confirm; Escape cancels; no hotkey collision |
| U15 | Colors unavailable/reduced motion | Text counts and reason descriptions are readable without green/red alone |
| U16 | After batch removes selected inspector target | Inspector and highlight clear or retarget honestly; no stale entity UI |
| U17 | Client snapshot changes while selection is open | Commit revalidates current world; don't act on stale candidate IDs |
| U18 | Runtime content pack with dynamic machine ID | Same exact-type selection and known locked build constraints |

For P7 use the **real production static-export browser** and record actual head, test command/results, JS errors, keyboard/touch-emulated behavior, screenshots if relevant, and whether any frame-pacing measurement was performed. **No VM test has been run as part of this static audit.**

## 5. Review checklist for ChatGPT after Codex PRs

- Has the implementation reused actual `dismantle` checks instead of creating a more permissive code path?
- Are empty/loaded pumps, lines, routes, buffers, relocation ports and factories guarded without exceptions?
- Is `reclaimedStructureMaterial` separate from carried construction-material cargo? Is `cost` treated as advisory, not the sole refund source?
- Are duplicate/stale IDs, priority order, parent dependencies and 256 cap deterministic?
- Do preview and commit agree if state is unchanged, while commit rejects stale assumptions after state changes?
- Are transport geometry and open-factory visibility computed by identities/footprints, not per-cell `hitTest` sampling?
- Are mouse, keyboard and mobile cancel semantics verified without accessibility regressions?
- Do exact head tests, typecheck/lint/build, real browser gate and ledger reconciliation pass with evidence?
- Are no hidden recipes, save migrations, Vercel deploys or extra framework abstractions introduced accidentally?

**Communication:** attach this audit to the P4/P5 issues as review guidance. Codex is still responsible for implementation, runtime/browser tests and proof. ChatGPT can review GitHub PRs without consuming a second VM. 
