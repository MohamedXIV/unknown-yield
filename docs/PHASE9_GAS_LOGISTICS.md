# Phase 9 / #109 — pressurized gas logistics

Status: design and implementation plan approved by user on 2026-10-03; implemented on `codex/109-pressurized-gas`. Based on live issues #109 and #100 and main `7f88eb3c326194836e3f360755daf2c87b4287fb`. #108 is closed through PR #162. No open competing PR was present when inspected. Verification evidence: [PHASE9_GAS_ACCEPTANCE.md](PHASE9_GAS_ACCEPTANCE.md). GitHub acceptance/merge is separate from the local gate.

## Intent and scope

Extend the accepted physical liquid chain with a playable liquid → gas → solid branch. Gas must use sealed pressure infrastructure and compatible machine interfaces, retain exact integer quantities during blockage and save/load, and refuse ordinary solid/liquid paths. sim-core remains authoritative; authored reactions remain hidden until observed. No pressure physics, leaks, hazards, terminal upgrades, cylinder cargo subsystem or later-phase logistics.

The selected transport is a directed pressure-line path. Issue #109 permits pressure transport/cylinder handling; this slice selects pressure lines and stationary pressure vessels, not both pressure lines and movable cylinders. Vessels are physical storage buildings, not global inventory or disguised solid cargo.

## Alternatives and decision

1. Separate pressure-line/vessel/compressor records with gas-only interfaces (selected). This preserves an inspectable containment boundary and avoids accepting gas into existing liquid infrastructure. The small reservation/commit transfer algorithm may be shared where semantics are identical, but gas admission and occupancy rules stay explicit.
2. Reuse liquid pipes/tanks by adding a color or accepting both states (rejected). This would blur ordinary-liquid rejection and make the player-facing containment distinction cosmetic.
3. Add filled cylinder items and packing/unpacking machines (deferred). This adds container identity, container return logistics and multiple conservation dimensions beyond the smallest complete #109 path.

## Containment and transfer contract

Content adds `gas` handling state, `gasLogistics` definitions for pressure lines, pressure vessels and source compressors, and gas-compatible processor interfaces. Capacity, transfer limits, footprints, construction costs and compressor fuel costs are authored content. One sealed compatibility class is sufficient; there are no numeric pressure values or pressure bands.

Each line cell and vessel holds one stable material ID plus a nonnegative integer quantity bounded by its authored capacity. Zero contents use null identity. Gas never mixes implicitly, changes material because of infrastructure, vents, disappears or enters site stock.

Lines have explicit inlet/outlet directions and readable bends. A source compressor is an unbuffered socket adapter, accepting only a gas-output machine or vessel and admitting only into a matching pressure-line inlet. A vessel requires a compressor at its output for a new path. Disabled, unfueled, empty or blocked compressors retain upstream material and charge no fuel. Successful admissions charge the authored fuel cost once; compressors do not consume gas.

Transfers resolve from pre-step source/destination quantities. Destination identity/capacity and source quantities are reserved before atomic commit. Each unit advances at most one transport edge per logistics step. Full outlets, incompatible identity, wrong socket direction and missing destinations cause deterministic backpressure. Stable ordering prevents insertion order from changing throughput. Already admitted contents can drain while the source compressor is disabled.

Gas production can remain in a compatible machine output without a compressor. Machine jobs use the existing input escrow, defined transformation counters and output-capacity rules. Ordinary belts, depots, site stock, terminal staging, liquid pipes/tanks/pumps and incompatible machine sockets cannot receive gas. Gas infrastructure reciprocally rejects liquid and solid material. Refusal never consumes or relocates the batch.

## Construction and recovery

Add normal player build commands/tools for pressure lines, pressure vessels and compressors, plus compressor enable/disable and empty-line configuration. sim-core validates atomic cost/payment/refund, geometry, obstruction, factory walls and matching ports. All ground logistics share one occupancy layer; no overlap or implied crossing between liquid, gas and solid structures.

Loaded lines/vessels refuse rerouting and dismantling. Recovery is stop feed → provide a compatible destination → drain → edit the empty structure → resume. Reclaim refunds exactly the construction material embodied in an empty structure. A port or factory cannot be removed while dependent pressure infrastructure remains.

Phaser renders distinct sealed-line markings, vessel shape and compressor direction from snapshots. React tools/inspectors show localized quantity/capacity, material after discovery, socket direction and truthful disabled/no-fuel/needs-input/incompatible/blocked status. No UI or renderer computes material movement. Unknown authored gas names and reaction outcomes must not leak through tools, help text or inspectors.

## Authored demonstration

Add provisional stable ID `gas-0`, one dedicated liquid-input/gas-output processor and one gas-input/solid-output processor. Preserve every existing recipe outcome. The upstream processor receives the already accepted liquid path; its observed output discovers gas. The downstream processor receives only a pressure line and produces an existing solid through its authored reaction. Use localized, replaceable wording; machine names/help describe interfaces without revealing undiscovered outcomes.

The demo proves dependency on #108 without requiring terminal gas export. #111 owns compatible terminal modules and exports; the current dry terminal must truthfully refuse gas.

## Persistence, accounting and factory integration

Introduce explicit gas line/vessel/compressor save records and bump save schema 14 → 15. Bump fixture content world-01-v7 → world-01-v8 independently. Older content/save combinations may be rejected explicitly during pre-release development; migration is not a gate. Invalid load must preserve the running expedition atomically.

Validate gas identities/quantities/capacities, empty identity consistency, compatible machine buffers/jobs, dry/liquid-location rejection, unique IDs, coordinates, occupancy, socket geometry and supported content versions. Save/load preserves exact blockage, compressor enable state, discovery and future transfers. Snapshots are detached and omit canonical hidden reaction truth.

Extend ledger locations with pressure-line and vessel holdings and exact construction embodiment. Reconcile deposits, stock, staging, buffers, transport, storage, jobs, defined consumption/production and exports after each simulation step. Fuel remains the existing separate accounting domain.

Extend connected factory recurrence/topology with gas members, external connected gas backlog and compressor settings; unrelated reservoirs must not couple factories. Moving backlog withdraws throughput certification until real recurrence returns. Closed-factory inspection reports physical gas holdings separately from liquid holdings.

Blueprint export must include relative gas layout and compressor settings, excluding quantities/material contents. Introduce blueprint schema 4 when gas members exist, validate overlaps/wall ports and preserve current v1–v3 behavior. Content Studio import/export roundtrip must preserve gas handling interfaces and logistics configuration without introducing new Studio editor scope.

## Verification and acceptance

Focused domain tests first, with new behavior observed failing before implementation:

- gas-only admission and reciprocal liquid/solid rejection at every relevant endpoint;
- capacity, identity mismatch, directed sockets, stable ordering and no same-step multihop;
- full vessel/outlet, disabled/unfueled compressor, successful-only fuel charge and downstream drainage;
- atomic construction/preview/refund, overlap/port guards, loaded-edit refusal and drain/reroute/resume;
- normal-command liquid → gas → solid discovery chain, hidden snapshot boundary and exact ledger reconciliation at every step;
- blocked/flowing save roundtrips and uninterrupted-versus-restored future equality;
- invalid quantities/identity/location/overlap/version rejected without mutation;
- connected backlog and factory certification, blueprint layout/settings without contents, Studio roundtrip and semantic/locale validation.

Run focused tests, then `npm test -- --maxWorkers=4`, `npm run typecheck`, `npm run lint`, `npm run build` and `git diff --check`.

Browser acceptance uses normal controls on the local app: construct the upstream liquid chain and gas processors; observe gas discovery; fill a vessel and block an outlet; disable admission and drain into a real compatible destination; reroute an empty line and resume; demonstrate an ordinary-liquid/solid path retaining incompatible output; save/reload/restore; inspect closed and reopened factory state. Record screenshots and console diagnostics. Domain tests, not pixels, establish exact conservation.

Execution stays in the existing checkout on a focused `codex/109-pressurized-gas` branch, with no worktree, remote agent, Vercel work or new dependency. Acceptance evidence belongs in `docs/PHASE9_GAS_ACCEPTANCE.md`; update the accepted decision/content/simulation contracts and execution direction only to match verified outcomes. A focused PR references #109; epic #100 remains open.
