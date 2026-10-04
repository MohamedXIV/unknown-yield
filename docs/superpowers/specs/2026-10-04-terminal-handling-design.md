# #111 — physical terminal handling for liquid and gas cargo

Status: conversational design approved on 2026-10-04; this written spec awaits review. Based on main `9a2f7be167f013454491d5781ee6370175b9170d`, live issue #111 and OPEN parent #100. #110 is CLOSED through PR #164. No competing open PR existed at exploration. No product implementation or verification is claimed.

## Intent and acceptance

Connect the accepted physical liquid/gas infrastructure to compatible terminal staging and export. Installed handling modules must admit real cargo at defined world inlets; a capability unlock alone must not transfer material. Refusal leaves quantities at their source. sim-core owns admission, inventories, progression, export and conservation. Hidden recipes and undiscovered material identities remain private.

The slice implements both a liquid dock and a gas dock. The existing corrosive liquid is the special-handling demonstration; it does not require a third cargo state or another chemistry chain. Existing dry staging and the Phase 5 granules outbound gate retain their behavior.

## Selected architecture

Use two fixed dock slots inside the existing terminal footprint, each supplied by an authored module definition. Each installed module owns a bounded single-material holding. Pipes deliver directly to the liquid inlet; pressure lines deliver directly to the gas inlet. Installation is a terminal command, not placement of a separate building or a free UI flag.

A shared mixed liquid/gas inventory would obscure identity and independent capacity. Separate placeable terminal buildings would add placement and routing scope that this issue does not need. Fixed module slots expose physical geography while extending the existing company terminal and capability model.

## Content and provisional fixture

Add `site.terminalModules`, defaulting to an empty array for content without modules. A module defines stable `id`, localized `nameKey`, `handlingState` (`liquid` or `gas`), `containmentCapabilities`, integer `capacity`, integer positive `cost`, `requiredTerminalCapabilityId`, and `inlet: { x, y, side }`. Inlet coordinates are relative to the terminal rectangle; side uses the existing east/south/west/north direction convention and denotes the outward-facing edge. The arriving line must point inward from the adjacent outside cell.

Definitions describe concrete slots: at most one module per handling state in this slice, with unique slot cells. Modules are not rotatable or relocatable at runtime. No generic terminal editor or configurable multi-slot framework is introduced.

Provisional fixture `world-01-v10`:

| Module ID | Inlet relative cell / side | Capacity | Plates | Containment | Required capability |
| --- | --- | ---: | ---: | --- | --- |
| `liquid-dock` | `(1, 3)` / south | 24 | 30 | `corrosion-resistant` | `liquid-outbound` |
| `gas-dock` | `(3, 1)` / east | 16 | 36 | empty | `gas-outbound` |

With the current terminal `(38,26,4,4)`, liquid arrives from `(39,30)` pointing north into `(39,29)`; gas arrives from `(42,27)` pointing west into `(41,27)`. These are fixture choices, not global geometry or balance rules. Existing dry belt admission across terminal edges remains unchanged, including these cells; the dry and sealed interfaces are separate and cannot exchange holdings.

Extend existing `economy.terminalCapabilities` and `economy.milestones`:

- `liquid-outbound` unlocks from durable confirmed `liquefy-raw` evidence.
- `gas-outbound` unlocks from durable confirmed `vaporize-liquid-0` evidence.
- Unlock grants installation eligibility. Installation still requires exact construction stock and an unoccupied slot.
- No timed order/directive or export of the blocked material is an unlock prerequisite. No reward fuel is added by these milestones.

Add Exchange listings for `liquid-0` and `gas-0`, gated by their respective capabilities. Provisional base/floor compensation is 6/2 for liquid and 8/3 for gas; baseline demand 10000, saturation per unit 1000, and recovery per market tick 250. Preserve the existing granules listing and gate. New listing identity, compensation and policy controls appear only after company knowledge of the material. These numbers are authored fixture balance, not extra market mechanics.

Validation covers duplicate IDs/states/inlets, non-edge or out-of-bounds inlets, side/edge mismatch, missing logistics definitions, unknown containment/capability references, missing milestone unlockers, locale coverage and required-material protection. For each listing requiring a module capability, its material must fit that module's state and all-of containment. Extend blocked-export dependency checks to module installation: reject an unlock chain requiring export or an order for any listed material whose admission the module gates. Preserve existing milestone cycle checks.

## Runtime commands and holdings

Persist `terminalModules: Record<moduleDefinitionId, { materialId: string | null, quantity: number }>`; map membership means installed. Definition IDs are fixed identities and do not consume the placed-entity ID counter. Fresh state has no installed modules.

- `installTerminalModule { definitionId }`: validate definition, milestone-derived capability, absence of installation and available plates; debit exactly the authored cost and create empty contents atomically.
- `removeTerminalModule { definitionId }`: require an installed empty module; refund its exact authored cost and remove the installation atomically. Loaded removal fails with no mutation. Unknown/duplicate installation fails with no debit.
- Existing material `keep` / `export` policy applies to dock holdings as well as dry staging. New liquid/gas policies start as Keep so cargo can be inspected before shipment. No separate module policy, transfer-to-stock or discard command.
- Command preview uses the same predicates without mutation. Localized result keys explain locked, missing stock, installed, loaded and empty states.

Module changes re-observe factory throughput signatures rather than globally clearing unrelated certificates. Signatures of factories whose external route reaches the terminal include relevant installation/capability/cargo state; changes to their receiving contract withdraw their certificate. No aggregate execution work is added.

## Physical admission and transport

Only a pipe/pressure-line outlet entering its corresponding authored inlet from the prescribed side can receive a terminal target. Pump/compressor rules remain source-to-line only; no direct machine/tank/vessel teleportation into terminal holdings. Wrong terminal edge, wrong direction, absent installation, incompatible state/containment, mismatched nonempty identity and insufficient capacity all refuse transfer before reservations or mutation.

Use the existing all-of containment predicate. The receiver exposes the installed dock's identity, occupied material, quantity, capacity and authored protection. Successful admission debits the existing source and credits the same units to dock contents on the normal transport cadence. Multiple sources cannot over-reserve capacity or claim different identities in the same step. Keep the existing deterministic line ordering, integer transfer limits and pump/compressor fuel rules. Gravity line-to-dock arrival has no new fuel charge.

Diagnostics distinguish a terminal connection from a missing route and report module absence/lock, incompatible interface/protection, identity conflict or full capacity when relevant. A blocked line retains its cargo and current route across Save/Load. Diagnostics expose material/requirements only after discovery using the existing sanitized snapshot boundary.

## Export and progression integration

Factor the physical export settlement into one authoritative path used for dry staging and dock holdings on the existing transport cadence. The export target must still be installed and compatible. Require Export policy, a company-known valid Exchange listing and the existing milestone capability gate before shipping any units.

Shipping updates source contents, total exports, per-material export ledger, authoritative compensation, debt repayment, market saturation, recovery standing and order progress exactly once. Debt is repaid before net fuel allocation. Empty dock contents reset material identity to null. No duplicate settlement from exposing dock totals to the UI; no material mirroring in dry staging or site stock. Keep/full cargo remains physical until export becomes eligible and selected.

No new order, directive, assistance package or fuel class is introduced. Capability and content definitions do not reveal hidden reaction predictions. Before discovery, a generic dock and its localized progression hint may be visible, but neither its future material listing nor a predicted recipe/output may appear.

## Conservation, serialization and authoring

Advance save schema to 17 and browser save slot to v11; content version is separately `world-01-v10`. Pre-release backward save compatibility is not a priority. Accept only schema 17 for this content version and explicitly reject older saves atomically without replacing the running world. Do not modify prior schema migrations or introduce a misleading cross-content migration. Factory blueprint schema remains 5: terminal modules are site infrastructure and never factory blueprint contents.

Extend ledger holdings with dock cargo and embodied module plates. Every install/remove/arrival/export remains audit-neutral except the existing defined transformation/export flows. Keep dry staging capacity independent from each dock capacity; do not double-count presentation totals.

Load validates exact module keys, installed capability legitimacy, material identity/null coherence, nonnegative integer quantities, individual capacity, company material knowledge, handling and all-of protection, then exact conservation before replacing live state. Reject unknown/overfull/incompatible/locked module records rather than repairing them. Restored progression, market memory, policy and cargo must continue deterministically without replaying rewards.

Content Studio import/export preserves module definitions, capabilities, milestones and listings through its existing base-content boundary. Add locale key coverage and roundtrip tests; no new broad Studio editor scope.

## Player interaction and presentation

The terminal panel shows localized dock names, capacity, unlocked/installed state, plate cost, current discovered cargo, Keep/Export policy and install/remove controls with meaningful disabled reasons. Show physical inlet coordinates/direction so players can connect the normal pipe or pressure-line tools.

Phaser draws state-specific inlet markers at authored cells and indicates installed/locked/full state from snapshots. It does not own inventory or admission truth. React remains outside per-frame transforms. Existing dry staging UI and granules capability feedback remain accurate. Newly authored player-facing text uses locale resources.

## Verification gate

Focused domain and content tests precede the full gate:

1. Reject invalid module geometry/references/protection and circular or self-blocked progression; preserve content/locale Studio roundtrip.
2. Installation preview/payment/refund is exact; locked, duplicate, underfunded and loaded removal commands are atomic and ledger-clean.
3. Wrong/missing/incompatible terminal targets retain upstream liquid/gas, spend no extra fuel and reveal no hidden recipe truth.
4. Compatible liquid and gas physically arrive; Keep fills each independent dock and creates upstream backpressure; identity cannot mix; dry staging remains independent.
5. Export settlement clears only the shipped location and records exact exports, compensation/debt, saturation and applicable order progress once. Granules behavior stays green.
6. Save/Load with installed docks, dock cargo, upstream cargo, Keep/Export policies and open debt restores deterministic future behavior; tampered records and older schema/content fail atomically.
7. Relevant factory contract changes invalidate certification while unrelated factory certification persists; blueprints exclude modules.
8. A native fresh-world chain discovers liquid and gas via real jobs, unlocks and installs docks, stages both physically, refuses premature/incompatible admission and exports through legal policies with ledger reconciliation after each step.

Run focused Vitest files, then `npm test -- --maxWorkers=4`, `npm run typecheck`, `npm run lint`, `npm run build` (including static export verification), and `git diff --check`. Run the full test suite alone to avoid the previously observed concurrent build resource contention; do not change test timeouts to hide failures.

Browser acceptance uses normal controls without state injection: demonstrate discovery/unlock, line blocked before installation, dock installation and real arrival, Keep backpressure, loaded removal refusal, Save/Load retained holdings, and Export with visible totals/debt/market effects. Exercise both handling states; record any full-capacity scenarios proven only in domain tests honestly. Inspect console warnings/errors, capture evidence and record the exact tested head.

Update EXECUTION, CONTENT_MODEL, SIMULATION, DECISIONS and scoped Phase 9 logs/evidence. Deliver one PR closing #111; do not start #112/#113 or close #100. Merge remains subject to the user's final approval.

## Explicit exclusions

No pressure/fluid physics, leaks, hazards, movable cylinders, terminal building placement, imports, new chemistry, generic transport abstraction, dependencies, workers, aggregate execution, remote agents, worktrees, Vercel changes or later-phase systems. Existing routes and inventories remain authoritative through the native simulation.
