# Company Terminal Direction v0.1 — The Directorate's Industrial Lifeline

> **Status:** EXPLORATORY DESIGN — 2026-10-12. This document records candidate composition, information architecture, narrative voice and interaction studies, **not** a final approved UI, added game mechanics, implemented art, code changes or a new roadmap phase.
>
> **Companions:** [Main Menu C](MAIN_MENU_DIRECTION_V0_1.md), [HUD v0.1](HUD_DIRECTION_V0_1.md), [Factory Inspector v0.1](FACTORY_INSPECTOR_DIRECTION_V0_1.md), [UX/UI & Art Brainstorm v0-alpha](UX_UI_ART_BRAINSTORM_V0_ALPHA.md). **Binding identity:** [WORLD_IDENTITY.md](WORLD_IDENTITY.md). **Existing UX and economy truth:** [PHASE16_PRODUCTION_UX.md](PHASE16_PRODUCTION_UX.md), [ECONOMY.md](ECONOMY.md) and the Phase 13 contracts.

## 1. Experience thesis

> **HighFleet's command instrumentation × Papers, Please's bureaucratic documents × Tropico's theatrical institutional hypocrisy — with Against the Storm's everyday legibility.**

The Company Terminal is **a physical, on-map off-world freight installation** and the expedition's economic/technological connection to an authoritarian state apparatus. It should be the strongest showcase for institutional personality **without reducing factory play to a market dashboard or a paperwork mini-game**.

The governing contrast is deliberately theatrical:

- **Official story:** the *People's Central Procurement Directorate* generously authorizes patriotic allocation, scientific progress and heroic shipments.
- **Physical reality:** pallets, tanks, pipes, sealed gas docks, customs-like cargo manifests, limited staging, queues/backpressure, legal handling, compensation, debt and a single authoritative material ledger.
- **Useful human interface:** player sees exactly what is physically available, what can legally ship or import, what is blocking action, and what the next realistic industrial choice is.

**Example fictional wording (not approved world names):** “The Central Procurement Directorate wishes to remind all workers that fluctuating State-Approved Compensation Rates are not market prices.” The joke belongs to the *agency's voice*; the displayed rates and quantities must remain true.

## 2. Existing live code and accepted contracts inspected

**Baseline inspected:** `main` commit `1d6c5b3a` before writing this direction. The following are actual systems, not speculative features:

| Existing source | Supported behavior and constraint | Design implication |
| --- | --- | --- |
| `apps/web/game/production-ux.ts` / Phase 16 UX | `terminalOverview` prioritizes **manifest selected → exportable physical cargo → obligation → company work → idle**; consumes `PlayerSnapshot` | Preserve *action-first status*; do not replace with arbitrary headline |
| `apps/web/components/GameClient.tsx` | A world-first Terminal panel already exposes milestones, market bulletins, opportunities, module install/remove, imports, shipment manifest, per-material keep/auto-export and assistance | Recompose/hierarchize existing information before inventing extra screens |
| `PHASE16_PRODUCTION_UX.md` | Existing section navigation: **Work / Handling / Shipment / Company** within one Terminal surface | Keep recognizable four-section navigation. No SaaS-like multipage website |
| `PHASE13_SHIPMENT_MANIFESTS.md` | Manifest quantities are **persisted intent**, not moved/reserved cargo; legal dispatch requires real staging and shared shipping capacity; pending explicit manifest pauses auto-export; automatic and manual shipment paths share gate | A “manifest selected” badge does **not** mean cargo is in transit or already exported |
| `PHASE13_IMPORTS.md` / `PHASE13_TERMINAL_HANDLING.md` | Imported physical goods enter bounded dry staging or matching fixed terminal module; unload to real belts/pipes/gas lines under actual handling/containment requirements | Imported cargo cannot appear in site stock or a fictional global warehouse |
| `ECONOMY.md` and Phase 13 exit | Discovery creates listings; demand/saturation and physical exports determine compensation; opportunity eligibility is knowledge-bound; obligations are repaid before usable net operating allocation | World construction and routing are the player's response to economic change; no parallel “finance minigame” |
| `PHASE13_PROPERTY_DIRECTIVES.md` | Some special directives request a **target property** while concealing acceptable reaction solutions; rewards may be *import allocations*, which materialize physically only through a legal import request | The Directorate can issue an impossible-sounding research challenge without revealing the hidden recipe |
| `PHASE15_FUEL_PROGRESSION.md` | Ordinary `Save.fuel` is **abstract company operating allocation**; advanced propellant and research coolant are **physical imported materials** stored/consumed through terminal modules | Never show a drum, fuel tank or power-grid reading as if it describes ordinary company allocation |

**Terminology caution:** “Central Procurement Directorate,” “State-Approved Compensation Rates,” “Site 47,” agency crests and bureaucrat names are **fictional writing candidates**. They are not final material IDs, renamed code APIs or implemented localization keys.

## 3. A terminal with two simultaneous visual worlds

### Physical on-map installation (Phaser)

- Heavy rectangular Dieselpunk terminal architecture, cargo bay and loading/receiving points, concrete/steel gantries, pneumatic couplers, marked service lanes and dock silhouettes.
- Actual dry staging / terminal modules and outlets should relate visually to the **correct current topology** and cargo phase, without fabricating operational throughput or physical handling routes.
- When selected, outline the real installation. Optional in-world highlights can identify a blocked dock, physical staging, an import outlet or a selected shipment's *present* cargo; they must not animate selected manifest intent as if goods had left the map.
- Controlled 2D three-quarter rendering; existing 3D blockout pipeline for consistent sprites. The Terminal should *feel massive in the game world*, while its UI remains comfortably small enough to operate.

### Official communication (React)

- A fictional state-industrial agency stamp, patriotic slogan, serialized requisition forms, authorizing signatures, technical rubber-stamp graphics, repeated typography and an occasional mid-century pulp poster panel.
- The theatrical layer is richest in **Work** and **Company**, restrained in **Handling** and **Shipment**.
- Avoid rendering every card as parchment or every interaction as opening a separate file cabinet. Use small artifacts of bureaucracy to punctuate meaningful exchanges.

### Operator's actual controls (React)

- Dark-steel / enamel operational surfaces, clear technical type, status indicators, sufficient contrast and simple action buttons.
- Persistent hierarchy: **what needs attention → quantity / reason → action → detailed documentation on demand**.
- The data remains derived from **public PlayerSnapshot**; no new sim rules or truth in a CSS widget.

**This is a hybrid game interface, not a skeuomorphic desktop app.** Let the Terminal suggest a physical institutional machine without requiring one hundred levers.

## 4. Candidate information architecture

Keep the **existing four anchors**: **Work**, **Handling**, **Shipment**, **Company**. A selected tab/section may get a stronger visual treatment, but the first iteration need not replace the functioning scroll/jump navigation with a bespoke router.

```text
+-----------------------------------------------------------------+
| REAL WORLD: SELECTED TERMINAL / PHYSICAL FREIGHT AREA            |
|                                                                 |
|         ┌── DIRECTORATE TRANSMISSION / TERMINAL PLAQUE ───────┐ |
|         │ UPLINK CONNECTED          WORK ORDER REF: ...        │ |
|         │ TODAY'S PRIORITY: 6 PHYSICAL UNITS SELECTED         │ |
|         │ [WORK] [HANDLING] [SHIPMENT] [COMPANY]               │ |
|         ├──────────────────────────────────────────────────────┤ |
|         │ PRIMARY ACTIVE SECTION                               │ |
|         │ - real quantities / availability / constraints       │ |
|         │ - one clear principal action                         │ |
|         │ - detailed data and state-approved flavor            │ |
|         ├──────────────────────────────────────────────────────┤ |
|         │ engineering receipt / stamped official notice       │ |
|         └──────────────────────────────────────────────────────┘ |
|                                                                 |
+-----------------------------------------------------------------+
```

The drawing shows *information hierarchy*, **not** approved panel width, side placement or literal HTML layout. The world remains in view and the panel can collapse after the task.

### Current-status header: order of importance

Adopt the current `terminalOverview` priority when opening the Terminal: **selected manifest**, otherwise **physically staged exportable cargo**, otherwise **open obligation**, otherwise **active company work**, otherwise **idle**. Do not replace the authority with an all-knowing “daily quota” invented by art.

One-line examples:

- **“Shipment Ready — 6 units selected (pending dispatch)”** — selection is intent only.
- **“Cargo Received — 18 exportable units physically staged”** — goods remain in real holding.
- **“Obligation Open — exports repay company debt first”** — tell the truth before patriotic euphemism.
- **“New Directorate Request”** — only if a real opportunity is offered.

A secondary low-priority bulletin may be funny, but never compete with a meaningful shortage, legal handling lock or shipment readiness.

## 5. Four operating surfaces

### I. WORK — official requisitions and scientific directives

**Fantasy:** bulletin board of stamped state orders. **Real UX:** show achievable opportunities and discovery constraints without prescribing a hidden solution.

- Group **Corporate Orders**, **Special Directives**, and **Property Directives** by their actual status/type; avoid making them RPG quests.
- Each card: authenticated title, known target/specification, quantity or public property, reward, expiry when available, genuine progress, outstanding constraint and any physical import-allocation reward.
- Property directives may ask for a *local stable route* or known outcome class while keeping all `solutionReactionIds` concealed.
- Market bulletins can explain why demand changed, as **reported** in actual saved company market state; never assert a simulated geopolitical cause that does not exist.
- Header can feel pompous: **“DIRECTORATE REQUEST NO. 014 — EXEMPLARY LABOR IS EXPECTED.”**
- Human-readable action links should take the player back toward **Notebook** evidence or the **actual factory world**, not a fake “auto fulfill” control.

**Do not:** make every notification mandatory, forge recipe hints, award materials for reading text, or invent acceptance buttons when the current opportunity system does not require accepting jobs.

### II. HANDLING — authorized capacity, imports and real docks

**Fantasy:** customs/handling permit station. **Real UX:** physical dock operations and exact compatible transport.

- Show each fixed dock/module with **installed/unlocked**, physical contained material and quantity/capacity, inlet/outlet location and real handling requirements.
- Separate **ordinary dry holding**, **pressurized gas**, **cryogenic/hazard-isolated/secure liquid** and other authored module distinctions with accurate labels, not a fictional universal input/output tube.
- Show **import requests** with company allocation price (if payable), import entitlement (if granted), holding capacity and a specific refusal cause: locked, missing module, full, incompatible or insufficient operating allocation.
- On a successful import, show **where material physically arrived and how to move it into the world**. Imported stocks wait if a downstream route is blocked.
- A concise approval stamp may appear after a real successful order, followed immediately by factual material/quantity/holding location.

**No free cargo:** a government seal graphic does not bypass installed module, certification, capacity or material conservation. “Import Allocation” rewards are an entitlement until a legal request delivers conserved physical goods.

### III. SHIPMENT — warehouse is real, manifest is intent

**Fantasy:** official freight manifest stamped for the orbital carrier. **Real UX:** making informed choices about physical stock and dispatch capacity.

- Top hierarchy: **Physically staged**, **Selected for manifest**, **Shared dispatch capacity**, **Legal/handling readiness**, then **Dispatch**.
- Per known listed product show **real available quantity**, authoritatively allowed selection bounds, current compensation where available, handling lock and policy **Keep / Auto-export**.
- Explicit selection does not consume/relocate goods. Pending manifest pauses auto-export; this must be visible to avoid false “factory stopped” diagnoses.
- Successful dispatch removes exactly valid physical goods from the site, updates the ledger, credits lawful export settlement and counts toward eligible orders; no “shipping timer” fiction.
- A short receipt should distinguish **gross export compensation**, **obligation repayment** and **net operating allocation** *only where those values can be correctly derived from authoritative state/events*. These detailed per-dispatch figures are a **presentation proposal**, not a currently verified receipt data contract; do not invent them or imply every individual figure is already exposed.
- Current Exchange rates are signals that may change by authoritative company cadence; never hard-code future returns or conflate gross and net balances.
- Keep auto-export as an honest fast path for industrial lines; the player should not need to manually stamp every truckload.

**Example fictional copy (optional):** “Shipment Accepted. A proud contribution to the common future.” Under it, the actual technical settlement: quantity, exported material and current company allocation.

### IV. COMPANY — the state's benevolent grasp

**Fantasy:** requisition office, patriotic correspondence and “emergency assistance.” **Real UX:** operating allocation, liabilities, assistance eligibility and progression.

- The **basic company operating allocation** is abstract; present as a numeric operating budget, not physical imported oil, canisters or electric-grid wattage.
- Display **outstanding obligation** separately from standing/recovery progress and physical import supplies.
- Assistance is not a free gift: show authentic eligibility, grant size, new obligation amount and why a request is currently blocked.
- Export compensation repays obligation **first**; order/directive bonus allocations do not repay it. Label the difference in UI; government copy may jokingly call the liability “fraternal contribution recovery.”
- Recovery continuation requires the **actual** prescribed export repayment progress; no generalized “infinite free bailouts” text, arbitrary caps or fabricated game-over rule.
- Science milestones, handling certifications and market notices may be linked/organized in this section when that helps comprehension, but they remain evidence-driven.

**Satire here can go furthest:** a ceremony praising the Directorate's generosity over a terse, unambiguous debt record. For example: “National Assistance Has Been Granted. Repayment is a Privilege.” The actual allocation and debt lines remain immediately legible.

## 6. The two kinds of fuel must look different

| Model | Actual sim status | Suggested visual presentation | Wrong visual metaphor |
| --- | --- | --- | --- |
| **Ordinary operating fuel / `Save.fuel`** | Abstract company allocation credited/consumed by operations and economic activity | State-stamped **Operating Allocation** ledger number and factual cost/reward | Diesel tank in the factory yard, fluid inventory, amperes, energy grid, transported barrels |
| **Advanced imported propellant / research coolant** | Conserved physical cargo in specialized Terminal modules, consumed according to authored class | **Material dossier** with class, phase, containment, local held quantity and correct dock/outlet | Treating cargo as universal cash or converting it to the ordinary allocation bar |

The example name **`MK-OIL/45` / `Varkov-45`** remains *fictional naming exploration*, not canonical stock or new physics.

## 7. Three visual compositions to consider

| Candidate | Visual treatment | Main risk / appropriate use |
| --- | --- | --- |
| **A — Directorate Console** (leading normal-play hypothesis) | Compact right-edge dark command instrument with thin enamel, cargo/priority card and four section links; selected Terminal remains visible | If too small, longer work cards become overwhelming; keep deep sections collapsible |
| **B — Freight Manifest Desk** | A larger deliberately opened physical-paper/steel document sheet for exact shipment assembly, authorization and receipt | If applied to every operation, makes routine exports unnecessarily bureaucratic |
| **C — Official Broadcast Window** | Occasional heroic mid-century pulp poster/commissar bulletin beside factual company state and directives | Easily becomes ad-like distraction or hidden real diagnostics; must stay event-triggered, dismissible and secondary |

**Suggested hybrid:** A for everyday Terminal interaction; B *on demand* for detailed dispatch/assistance paperwork; C for short officially sanctioned victories, request/market bulletins or political flavor. **This hybrid is a proposal, not yet selected by the user.**

The physical installation, artwork and UI should use one emblem/serial/type family shared with the chosen [Main Menu C](MAIN_MENU_DIRECTION_V0_1.md), while varying **ornament intensity by task**. Routine Handling/Shipment is utilitarian; Work/Company may be more theatrical.

## 8. Two-tone writing system

| Situation | State-broadcast voice (optional, fictional) | Factual operator-facing text |
| --- | --- | --- |
| Export accepted | “EVERY TON A VICTORY!” | Exact physically exported quantity and updated authoritative allocation |
| New discovery | “THE PEOPLE'S SCIENCE MARCHES FORWARD!” | Only confirmed known evidence and the newly permitted opportunities |
| Market saturation | “National compensation ratios are self-correcting.” | Current listing demand/saturation and legal export compensation |
| No compatible receiving dock | “The Directorate awaits appropriate certification.” | “Cryogenic receiving module not installed” or actual authoritative rejection reason |
| Economic recovery | “The People's Generosity Is Without Rival.” | Grant eligibility, obligation repayment order and recovery state |
| Failed experiment | “Enthusiastic disassembly has been registered.” | Exact known physical hazard and technical recovery instructions |

**Rule:** do not let the broadcast joke misstate a gameplay fact, hide a required action, leak a hidden recipe or fill every quiet moment with propaganda. Satire comes from *inconsistency between bureaucratic pride and physical truth*, not inaccurate diagnostics.

## 9. Candidate interaction flows

### First export: science becomes political theater

`Mine/process physically → route cargo to real Terminal staging → choose valid manifest or pre-existing auto-export policy → dispatch/settle → authoritatively record export/allocation → optional brief patriotic bulletin.`

Validate that the player can see freight moving into the Terminal *before* any receipt appears. The first shipment should celebrate a demonstrated industrial accomplishment, not require a forced tutorial cutscene.

### An authorized import

`Identify new physical supply need → check its phase/handling and certification → install appropriate module if legal and affordable → request import → goods arrive in real bounded holding → connect valid outlet to the actual world → consumed in real industry.`

No immediate inventory teleport or content spoiler.

### The aid paradox

`Operating allocation is depleted → investigate whether assistance can be legally requested → see exact grant and obligation → accept only after comprehending consequences → exports repay debt before net allocation → recovery standing clears only through real qualifying export.`

Government praise can follow, but obligation must remain visible.

### A special scientific order

`Receive a company-known property goal → inspect Notebook observations (not authored solution) → experiment in actual factory → achieve confirmed valid evidence → receive real entitlement/operating reward → claim imported physical reward through correct Terminal module when supported.`

No research button that directly creates discovery.

## 10. Usability, accessibility and implementation limits

- **World-first:** open the panel from a selected physical terminal or a quick HUD access path; avoid separate browser-style internal routing or full-screen SaaS dashboard. A temporarily expanded document sheet is acceptable for complex decisions if dismissible.
- **Information density:** priority summary first, four section anchors second, nested details only on demand. If the default panel becomes a scroll marathon, the information architecture has failed.
- **Physical context:** optional highlights align with actual dock and outlet coordinates. No holographic phantom cargo or simulated teleporting movement.
- **Feedback:** errors state **why** (cost, module, lock, capacity, knowledge, available material); success reports only real settlement. Distinguish success of selection from success of dispatch.
- **Visual styling:** heavy hard-edged freight equipment in world; readable compact operational type in UI; careful enamel/red-cream state accent and occasional print-paper artwork. No full-color poster over critical numeric fields.
- **Accessibility:** keyboard focus, large enough targets, reduced motion, no flash/flicker, text scaling, icons + labels, and separate typography treatments that never undermine contrast.
- **Performance:** don't animate per-belt-cargo UI lists in React every frame; public snapshot-derived state remains authoritative. Keep content-bound names, iconography, official text and art refs separate from sim IDs where supported.
- **No new mechanics:** no new market subsystem, military combat, quality meter, speculative cargo transport, terminal minigame, physical ordinary fuel storage, recruitment/crew morale systems, cinematic dialogue campaign or modding framework.
- **No invented panel data:** “daily quota,” realtime import ETA, individual settlement breakdown, stamped authorization number or detailed forecasts are mockup design notions unless current snapshot/event data supports them. Use local authored flavor only when it is nonauthoritative and nonmisleading.

## 11. Visual proof tasks before finalizing

1. **Same physical terminal, three panel states:** idle; physically staged cargo; pending six-unit manifest. Compare whether the reason/next action is obvious with one glance.
2. **Bureaucracy vs speed:** build a manifest, change Keep/Auto-export and dispatch without unnecessary modal confirmations.
3. **Import handling:** use dry, gas and cryogenic cases to prove the correct physical module/outlet appears, not a generic inventory button.
4. **Obligation honesty:** player should distinguish gross legal export compensation, debt repayment and usable net allocation.
5. **Contract mystery:** a property directive never reveals acceptable hidden reactions; the player understands what sort of scientific problem they are invited to solve.
6. **Source-tone test:** read a joke on one line and the correct actionable engineering message immediately below. No secondary explanation required.
7. **Composition test:** compare compact A versus extended B at 16:9 and narrower sizes without hiding the on-map Terminal and real cargo network.
8. **Menu/HUD continuity:** state seal, serial plate and color accents clearly relate to the chosen hybrid Main Menu and Factory Inspector, but neither duplicates their full chrome.

No actual user-playtest metrics, implementation proof or final pixel-perfect mockups are claimed here.

## 12. Status ledger and next conversation

**Carried over as approved:** fictional authoritarian Dieselpunk visual direction; official propaganda distinct from truthful simulation; Main Menu Concept C; existing material/market/terminal/save/knowledge rules and world-first production UX.

**Leading but still open:** A as daily console, B for detailed manifest, C for occasional broadcasts; ratio of paper vs steel; right-edge versus other docking; amount of poster illustration inside Work/Company; how to emphasize the physically selected dock without overlay overload.

**Field Notebook companion:** [Field Notebook Direction v0.1](FIELD_NOTEBOOK_DIRECTION_V0_1.md) proposes a quieter state-issued science archive using only known evidence. **Next joint review:** compare focused mockups and revisit shared UI grammar only after Inspector, Terminal and Notebook have been evaluated together.

**Document history:** v0.1 brainstorm direction created 2026-10-12; documentation-only, no new phase or art/runtime implementation.
