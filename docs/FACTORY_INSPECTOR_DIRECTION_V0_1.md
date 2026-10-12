# Factory & Machine Inspector Direction v0.1 — The Industrial Dossier

> **Status:** exploratory design direction, 2026-10-12. **Not** final wireframes, an implementation request, an approved new system or evidence that art has been produced. It develops the next UI surface discussed after the chosen [Main Menu C](MAIN_MENU_DIRECTION_V0_1.md) and [HUD v0.1](HUD_DIRECTION_V0_1.md).
>
> **Core design:** A **Factory is persistent industrial capital with a readable external contract**; a **Machine is an operable component with its own cause/status and physical buffers**. The Inspector must respect that distinction while feeling like a state-issued Dieselpunk technical dossier, **not** a SaaS analytics page.
>
> **Truth sources:** [PHASE3_EXIT_REVIEW.md](PHASE3_EXIT_REVIEW.md), [PHASE16_PRODUCTION_UX.md](PHASE16_PRODUCTION_UX.md), [PHASE12_FACTORY_RESHAPE.md](PHASE12_FACTORY_RESHAPE.md), [PHASE12_RELOCATION_LIFECYCLE.md](PHASE12_RELOCATION_LIFECYCLE.md), [WORLD_IDENTITY.md](WORLD_IDENTITY.md).

## 1. Game feel and a reference blend

**Experience thesis:** the player should feel like a capable industrial site director who can inspect a functioning plant from outside, but can remove its roof and follow **actual material flow** when something needs repair.

Our study triangle:

- **Against the Storm — comprehension:** compact production summary, a clear next action, manageable secondary depth. **Do not borrow visible hidden recipes.**
- **HighFleet — industrial material and instrumentation:** stamped unit identifiers, technical labels, restrained indicators, mechanical seriousness. **Don't require clumsy simulated switches for frequent actions.**
- **Frostpunk — integration with the world:** equipment stays physically present behind/alongside the interface, with strong selection focus. **Don't let theatrical framing obscure physical routes.**

Secondary: **Oxygen Not Included** for targeted logistics highlighting, **Papers, Please** for small official document motifs. Neither supplies the gameplay rules.

**The fictional state's stamp gives the unit identity; the engineering readout tells the truth.** A triumphant propaganda sentence should *never* replace an incident cause, erase buffer contents or mislead about certification.

## 2. Actual code baseline (inspected at `34300a7f`)

We already have meaningful foundations; don't commission new simulation logic merely to change the layout.

| Existing contract / UI | Readable source | Design implication |
| --- | --- | --- |
| Factory `FactoryView` has dimensions, `ports` with input/output roles, relocation state, `contract.machineCount`, `statusCounts`, optional liquid/gas inventories, and throughput | `packages/sim-core/src/types.ts`; `factory-contract.ts` | Factory view is a **summary**, not a second full inventory/executor |
| Throughput state is **`measuring` or `stable`**. Stable inputs/outputs and units/min reflect measured boundary transfers | `factory-throughput.ts`; `apps/web/game/factory-presentation.ts` | **Never display guessed rates** for an uncertified contract. Label `MEASURING` and link to diagnosis when blocked; do not equate all measuring with an incident |
| Closing/opening the roof is presentation-only. Detailed machines, routes and cargo persist. On save/load, throughput re-certifies | `PHASE3_EXIT_REVIEW.md` | Switching from Factory to Machine view must be continuous; no false production reset or “factory becomes abstract simulation” |
| `selectionOverview` already maps machine statuses, aggregate factory incidents and factory blockages to actionable copy | `apps/web/game/production-ux.ts` | Use/review the established authority; do not duplicate a conflicting diagnosis model inside React |
| The current selection panel exposes factory equipment, physical buffers, measured contract, shell reshape, intact relocation and port/dismantle actions | `apps/web/components/GameClient.tsx` | Main need is **hierarchy, grouping and world linkage**, not hypothetical extra features |
| Intact relocation has downtime and exact external reconnection gates; reshape changes shell bounds while preserving interior positions | `docs/PHASE12_RELOCATION_LIFECYCLE.md`; `docs/PHASE12_FACTORY_RESHAPE.md` | Do **not** present “Move” as an instant cosmetic button or assume exterior routes reconnect themselves |
| Machine statuses include `processing`, `incident`, `disabled`, `needs-input`, `needs-compatible-input`, `output-full`, `needs-fuel`, `needs-special-fuel`, `fuel-class-locked`, `ready`, and exhausted sources | `apps/web/game/machine-status.ts` | Surface actual, specific reason; **not** a generic red “BROKEN” badge |

**Caveat:** existing factory-aggregated “observed buffers” in the UI are not a guarantee of a complete all-media, all-container factory stock ledger. Never label a partial aggregation as “all materials in this factory”; use precise component/subsystem wording or an authoritative fully specified ledger if later implemented. These files were read for **design grounding**, not newly tested on a live device in this pass.

## 3. The three related contexts — one selected object at a time

| Context | Primary question | Leading surface |
| --- | --- | --- |
| **Closed factory selected** | “What goes in, what comes out, is it healthy, and what do I do next?” | Compact **External Contract Dossier** attached to the real selected building |
| **Factory interior open** | “Where exactly is the restriction, port or component?” | Same dossier remains, with equipment/junction/port emphasis in-world |
| **Machine/component selected** | “Why did this particular device stop or operate, and how can I change it safely?” | Specific **Machine Service Sheet** using known statuses and physical input/output buffers |

These are **focus levels**, not three different fullscreen dashboards. Selecting an internal machine should preserve the player's spatial context and provide an obvious return to its parent factory.

### A. Factory selected / CLOSED (conceptual wireframe)

Illustrative labels and example numbers below are **not current production data**, canon materials, or promises of actual running throughput:

```text
┌──────────────────────────────────┐
│ DIRECTORATE WORKS · PLANT F-014  │  ← small official unit plate
│ Thermal Processing Works        │  ← authored name, placeholder
│ [RUNNING]      [STABLE CONTRACT] │
├──────────────────────────────────┤
│ OUTPUT        18 units/min       │  ← example verified measured boundary
│ INPUT         12 units/min       │  ← example verified measured boundary
│                               ›  │
│ 2 IN  ·  1 OUT  ·  4 MACHINES     │
├──────────────────────────────────┤
│ DIAGNOSIS                         │
│ No blocking conditions reported  │
│                                   │
│ [Open Interior]  [Inspect Ports]  │
├──────────────────────────────────┤
│ Technical details        ▾        │
│ Site works / relocate    ▾        │
└──────────────────────────────────┘
```

**Important:** the rate display **must be per observed material** with proper units; if multiple materials flow, use a compact list/toggled expansion, not a mathematically misleading single “factory efficiency” or sum of incomparable goods. The abbreviated two-line rates are only a **layout study**.

The exterior itself should show reliable visual cues — input/output sockets, official model plate, subtle operational light, roof form and ideally *on-demand* brief contract markings. Numbers belong in the inspector/selection overlay where they remain readable.

### B. Contract not certified: don't pretend it is a failure

```text
PLANT F-014               [MEASURING]
External rates not certified yet.
Boundary flow is being observed.
[Open Interior]  [Inspect Connected Ports]
```

If actual blocking causes are known from public statuses, present them **independently**:

```text
PLANT F-014      [BLOCKED] [NOT CERTIFIED]
2 machines waiting for input.
[Open Interior]  [Inspect Internal Machines]
```

A factory may be operating without a stable measured throughput contract; “MEASURING” is neither a bad grade nor proof that nothing is moving. On save/load, the contract's transient certification appropriately resumes from measuring. Don't show old rates from a previous session or fabricated “estimated” production.

### C. Select a machine: service sheet, not factory analytics

```text
UNIT M-062 · CRUSHER                      [OUTPUT FULL]
Cause: Downstream capacity is full/disconnected.
Action: Inspect actual output path.
Input buffer:  ... physical quantities (if available)
Output buffer: ... physical quantities (if available)
[Highlight Output] [Open Parent Factory]
Advanced: operation / running batch / fuel / safe stop
```

Machine name, current `MachineStatus`, job/progress where present, physical input/output, fuel requirement and available controls depend on existing snapshot/commands. The design can group controls; it cannot grant auto-routing, add unsafe reclaim shortcuts or predict unknown input reactions.

## 4. Default information architecture

### Always visible for selected factory

1. **Identity:** localized factory name or neutral “Factory F-014”; stable ID, readable type; physical dimensions only when useful.
2. **Operational state:** aggregate real status counts; prioritize actual incidents, blocked input/output and relocation hold above ceremonial “production success” labels.
3. **External contract:** inputs and outputs by observed material with `units/min` only if `stable`. Show input/output port counts and arrow orientation separately from measured rates.
4. **Next useful action:** diagnose affected machine, open interior, inspect a port, or review a relocation reconnection, only if supported by current commands/UI.
5. **Small primary control:** **Open Interior / Close Roof** (existing action); never label roof close as “Stop production.”

### Expanded sections (suggested order)

- **Production & I/O:** verified external contract, port directions, measurement state and internal equipment statuses.
- **Internal Equipment & Buffers:** list of real machines with selectable status and correct physical material locations; no fictional aggregate disappearance.
- **Condition / Recovery:** hazard evidence, incident lockouts, trapped/recoverable material and supported recovery sequence; details only from public state.
- **Site Works & Logistics:** reshape, intact relocation, downtime, reconnection requirements, ports, optional blueprint where **actually supported**. Expose costs and constraints before committing changes.
- **Reclamation (danger zone):** dismantling details including physical contents, safe stop/reclaim refusal and confirmation when needed. Never put destructive actions adjacent to routine roof control.

Use accordions or grouped subsections **before** adding a new tab framework. No full-screen modal for everyday selection. Keep expanded state predictable when switching objects; no abrupt world camera jump on each click.

## 5. Status, priority and accuracy

First visible message should respond to the most important *known real state*, not one universal green/red lamp:

1. **Incident / trapped material / required recovery** (highest operational consequence).
2. **Relocation downtime or missing reconnection** (genuinely prevents expected operation).
3. **Blocked output, input, incompatible handling or unavailable special fuel** (show the **specific reason** and affected actual equipment).
4. **Disabled by operator** (different from a failure; retained material is not lost).
5. **Operating / ready / measuring / certified** (use clear independent operational vs measurement indicators).

This is an **editorial display priority suggestion**, not a change to `selectionOverview` logic or a claim that all conditions can currently be inferred at factory level. In particular, the factory-level existing derived copy groups some machine statuses and may require **presentation-only** refinement later; avoid declaring a new AI diagnostic system.

**Two badges can coexist:** `RUNNING` (status) and `CONTRACT MEASURING` (measurement) — because operational truth and certification are distinct. **A factory contract's stable rate is not a permanent nominal recipe.**

### Suggested state-to-action relationships

| Public status | Explain | Legitimate next investigation |
| --- | --- | --- |
| `processing` | Machine currently operating | Watch real progress and physically held material |
| `needs-input` | Upstream supply missing | Trace actual feeder/port (may be external) |
| `needs-compatible-input` | Setup/inlet incompatible with delivered material | Inspect available setup/containment and *observed* evidence |
| `output-full` | Downstream capacity saturated or disconnected | Check output port, belt/pipe/pressure route or storage |
| `needs-fuel` | Ordinary company allocation insufficient | Check real export/allocation/assistance context |
| `needs-special-fuel` | Physical advanced operating fuel absent from required terminal module | Inspect terminal-held import and class requirement |
| `fuel-class-locked` | Certification milestone not met | View public evidence/milestone hint; never reveal hidden recipe |
| `incident` | Physical event requires recovery | Inspect known hazard and compatible recovery options |
| `disabled` | Intentionally stopped | Re-enable when allowed; preserve buffers and other world contents |
| `deposit-exhausted` / `source-exhausted` | Actual source depleted | Redirect / relocate extraction if supported |

Always differentiate **abstract company fuel allocation** from **physical advanced fuel**. No faux diesel gauge for `Save.fuel`, no universal throughput percentage without measured source.

## 6. Visual and tactile treatment

**The selected plant is the hero.** React dossier: narrow steel/enamel frame, lightly embossed identifier, clear lamps/icons, very selective state crimson and safety amber, technical numerals with a clean contrast. Physical buttons can suggest workshop push switches but have modern mouse/keyboard affordances.

**Avoid:** rust overlay on every panel, perpetual needle sweep, flashy scanlines, tiny numeric fonts, ornamental bolts eating hit targets, enormous “CERTIFIED” stamps over quantities, fake analog speedometer indicating made-up health percentage. Atompunk-style shiny circular appliance shells remain excluded as a base aesthetic.

**Factory physical art** should reinforce the same industrial family: stamped plate on exterior, visually plausible ports, hard-edged roof/cutaway, unique function-appropriate machine silhouette, input/output direction, service hatches, restrained animation tied to actual states. A service light can mirror the inspector's status but must not replace it.

**Propaganda restraint:** the Factory Inspector is an *engineering document*, not a government celebration panel. Put political humor in occasional signed notices, nameplates or archival remarks; normal diagnostics are precise and easy to scan. Narratively, the contrast with bright official propaganda becomes stronger when the factory readout is sober.

**Comfort:** legible at actual play zoom, text scaling, explicit keyboard focus, high-enough click targets, reduced motion, no color-only diagnoses, warning icons + words, no moving ornament near important values. On narrow screens, inspector may become a compact sheet without permanently hiding the selected factory.

## 7. Spatial coupling — avoid a separate database game

- Selection highlights the *real selected factory*, its boundary and ports. A “Port” row may select/highlight a real port only when the interaction exists; otherwise keep it as proposal.
- **Open Interior** uses the existing roof action; the game still runs the **detailed simulation**.
- Selecting an internal machine changes the dossier focus but keeps parent factory navigation available.
- If machine `output-full`, identify the affected real output and downstream route where the actual topology permits. A dedicated `Inspect Output Route` action is **proposed**, not yet verified as an implemented selection/hit-test workflow.
- For relocation: show suspension/downtime plus **connection restoration requirements**; physically disconnected belts/pipes are **not** reattached by decorative animation.
- For reshape: equipment and logistics remain at their real coordinates; use a proposal/preview of change only if available, never imply an invisible auto-move.
- Destructive dismantling must respect the existing physical material/conservation and safety rules (including refusal conditions). UI confirmation can't make an illegal command legal.

## 8. Proposed interaction studies and comparisons

**Study 1 — Healthy external plant (fast scan):** select a productive closed factory; can the player see **real** certified inputs/outputs and which building is selected within a glance? Can they open the roof without accidentally disabling the plant?

**Study 2 — Uncertified but actually operating:** select a just-built or just-loaded factory; does `MEASURING` remain understandable and non-alarming? Can a player tell whether actual machinery is running?

**Study 3 — Factory blocked downstream:** choose blocked plant → see count/reason → open/locate affected machine → inspect actual output buffer/route → adjust physical logistics → verify observed recovery. Compare simple shortlist vs expanded engineering sheet.

**Study 4 — Industrial capital survives:** suspend a processing line, keep physical contents, reopen later; verify UI never promises discard or insta-reclaim. Repeat after save/load when throughput must re-certify.

**Study 5 — Relocation constraints:** after move, show countdown then exact disconnected medium/port requirements, distinguish normal factory trouble from relocation hold.

**Study 6 — Hazard:** expose a contained incident, locate the correct machine, read technical evidence, view recovery action. Official jokes must never cover the reason or trapped material.

### Competing layout variants (still open)

| Variant | Concept | Trade-off |
| --- | --- | --- |
| **A — Compact edge dossier (leading hypothesis)** | Right-edge narrow summary, collapsible detailed subsections, selected building fully visible | Clear everyday scan; can become scroll-heavy if all site-works controls remain expanded |
| **B — Split summary + on-map I/O overlay** | Very small edge summary with selected ports/rates highlighted on world | Strong spatial link; requires careful legibility and selection behavior |
| **C — Deep industrial work order sheet** | Larger document surface only when explicitly requesting diagnostics or site work | Immersive technical look; can feel like bureaucratic friction if it replaces normal selection |

**Likely blend to try:** **A as default; B for optional focused diagnosis; C only for complex site works/recovery**, not one uniformly bulky inspector. Final layout remains **unapproved until mockup/playtest**.

## 9. Boundaries and validation questions

**No scope creep:** no new factory aggregate executor, no universal predicted efficiency gauge, no omniscient production recipe database, no new simulation status, no auto-routing, no “destroy content” shortcut, no top-level inventory fiction. The design is about exposing and organizing real current systems.

**Data-driven identity:** localized machine names, prospective family/model serial styling, industrial plates, animations and graphics should eventually be authored presentation metadata while **stable IDs, evidence and physical state remain separate**. `Factory F-014`, `Thermal Processing Works` and all examples are **not** canonical names.

Before art/implementation commitment, validate:

1. What does the player see in under 3 seconds when selecting an active vs stopped factory?
2. Does separating measured certification from operational status reduce confusion?
3. Can the interface remain compact with one building, then scale to many factories without turning into an accounting dashboard?
4. Can a player reach a real problem machine from a closed factory with fewer interactions?
5. Are per-material measured rates, buffers, selected route and relocation constraints factually available in each panel state?
6. Do we even need a special factory diagram, or is world highlighting more legible?
7. Do controls remain discoverable under keyboard-only, reduced motion, larger text and narrower widths?

## 10. Status and next surfaces

**Carried forward:** world-first HUD, selected Main Menu C, accepted Dieselpunk/state-graphic split, existing Factor-as-Function gameplay semantics (factory-as-function). This document advances **factory/machine inspection design only**, without changing those contracts.

**Recommended for a next discussion:** choose the preferred inspector layout **A/B/C or a blend** from *actual wireframes*, then design the **Company Terminal** and **Field Notebook** with a common institutional graphic grammar but different information hierarchies.

**Document history:** v0.1 created 2026-10-12 as exploration; no runtime/UI/art implementation or new roadmap phase.
