# HUD Direction v0.1 — The World Is the Interface

> **Status:** exploratory design direction, 2026-10-12. The user agreed to develop this approach alongside the **chosen Concept C Main Menu**, but exact HUD geometry, resource density and toolbar position are **not yet approved final decisions**. No new UI or art was shipped.
>
> **Main Menu companion:** [MAIN_MENU_DIRECTION_V0_1.md](MAIN_MENU_DIRECTION_V0_1.md). **Source principles:** [WORLD_IDENTITY.md](WORLD_IDENTITY.md), [PHASE16_PRODUCTION_UX.md](PHASE16_PRODUCTION_UX.md), [PHASE16_ONBOARDING.md](PHASE16_ONBOARDING.md), [UX/UI + Art Brainstorm](UX_UI_ART_BRAINSTORM_V0_ALPHA.md).

## 1. Design hypothesis

> **HighFleet's industrial vocabulary + Against the Storm's usability, inside Frostpunk-like world-first composition.**

The **map and factories own the screen**. React controls remain visually subordinate to the Phaser world and respond to **meaningful snapshot/UI changes**, not to every sprite/belt animation tick. The simulation keeps inventory, factory, hazard, market, terminal and knowledge truth. No visual embellishment can manufacture undiscovered reaction outputs, stock, route capacity or a physical fuel network.

World-first does **not** mean hiding controls until players guess how to act. Default information is compact; selection and an explicit analysis mode bring precision on demand.

## 2. Screen zones — candidate desktop layout

```text
+-----------------------------------------------------------------------+
| TOP LEFT: Site / allocation / state        TOP RIGHT: message / alerts |
|                                                                       |
| [TOOLS]                     PHASER WORLD                               |
| [site ]     extraction, factory shells, real routed cargo            |
| [build]     selected machine and readable operating states            |
| [pipes]                                                                 |
| [inspect]                                [CONTEXTUAL INSPECTOR]        |
| [other ]                                identity / state              |
|                                         cause / next action            |
|                                         evidence / extended details    |
|                                                                       |
|            TEMPORARY ANALYSIS OVERLAY: only when requested             |
|                                                                       |
|      transient build help / keys / selected category as needed        |
+-----------------------------------------------------------------------+
```

A **left vertical tool rail** is our leading candidate, *not locked*. Evaluate it against a bottom dock and a hybrid arrangement. A **right contextual inspector** is the leading placement, but can adapt on narrow screens; no menu/inspector should consistently occlude the object being edited.

The HUD must adapt to **Normal Play, Selection and Analysis**. Placement mode and factory-edit mode are **interaction subcontexts**, not a fourth management dashboard.

## 3. Normal Play — default minimal permanent UI

### Top-left: state and economy pulse

Candidate tiny group:

- **Site** identifier, meaningful current status (only if genuinely available);
- ordinary **Operating Allocation** / present `Save.fuel` budget (a **number**, not a physical canister or liquid gauge);
- pause/speed control **if already supported**, clearly differentiated from site status;
- maybe condensed standing/obligation marker **if useful in playtesting**.

**Do not** plaster 12 material counters, all market rates, every storage quantity, research progress and all physical fuel reservoirs along the top. Their location matters: show them through selections, terminal, notebook and contextual views.

**No invented metrics:** only show values derived from authoritative public state. Names and labels are fiction/presentation; quantities and obligations are factual.

### Top-right: rare important state transmissions

Use a restrained radio/official bulletin stack:

- new meaningful directive;
- export accepted / reward settled;
- newly confirmed discovery;
- machine/containment incident;
- impending shortage or critical blocked operation *when actually detectable*.

Prioritize: **immediate incident > blocked operation/shortage > actionable directive > celebratory flavor**. Deduplicate repeated conditions; never spam a “new transmission” every simulation tick. Distinguish a fictional congratulations from the factual technical diagnostic needed to resolve a failure.

### Left rail: fast build/analysis access (candidate)

Organize by **player action** rather than ministry department: Extraction / Factory & Processing / Solid Logistics / Liquid / Gas / Storage / Terminal & Site / Inspect & Analysis / Dismantle & Reclaim. This grouping is a concept; the actual toolbar must contain **only implemented/available or honestly locked** actions. Don't imply machines or infrastructure that current content does not provide.

Principles:

- short path from category to actual placement, with visible orientation, cost and compatibility;
- keyboard shortcuts and clear state for selected tool / cancel / rotate;
- locked categories should not create a maze of unavailable icons;
- danger/reclaim affordances should clearly distinguish supported dismantling modes, physical contents and consequences;
- transient hover labels/tooltips; no permanently huge text panel.

### No selection: world remains unobstructed

The context inspector should collapse or disappear when not needed, not become a universal task dashboard. Essential onboarding stays one step at a time via the existing **state-derived Field Brief**, which can be dismissed/reopened.

## 4. Selection Mode — a daily-use inspector

**Always answer in this order:**

1. **What is this?** Unit ID / localized machine or building name / current state;
2. **Why is it operating or blocked?** Accurate current cause in plain language;
3. **What can I do next?** One meaningful action, optionally highlighting the relevant world object or route;
4. **Expand for detail:** rates, internal buffers, ingredient/operation *observations*, handling requirements, physical inventories, topology, history when supported.

Example **conceptual** readout; numbers are illustrative, not actual run evidence:

```text
STATE INDUSTRIAL WORKS / UNIT 014
Thermal Processing Plant                 [BLOCKED]
Cause: Output buffer full.
Action: Inspect the downstream output route.
Buffer: 120 / 120 [example only]
[Inspect output route] [Open factory]
```

**Functional controls must be discoverable and honest:** “Inspect output route” should perform an actual selection/highlight/overlay, or remain a labeled design proposal; no inert fake control. Neither a machinist’s lamp nor state propaganda replaces a useful explanation.

**Closed factories:** Inspector's I/O contract and bottleneck remain easy to read; reopen exposes the same preserved interior truth. **Never use a decorative animation to suggest contents reset**.

### Expanded details

Use tabs/accordions only when needed; likely sections: **Overview / Inputs & Outputs / Production / Logistics / Conditions & Recovery**. The actual data model dictates available sections. Only confirmed evidence goes to the player Notebook; unrevealed authored recipes stay hidden. Avoid giant always-visible tables.

## 5. Analysis Mode — temporary X-ray of the industrial world

The user chooses an analysis layer; it should be easy to toggle off and must leave the underlying layout recognizable.

Potential overlay study surfaces:

| Overlay candidate | Useful view | Truth/feasibility caveat |
| --- | --- | --- |
| Solid transport | Direction, selected flow, junction and output blockages | Real belt topology, not invented simulated speed/color |
| Liquid & containment | Route types, compatibility, current holds/failures | No generic fluid dynamics or omniscient hidden chemistry |
| Gas handling | Pressure-line topology and handling state | Do not imply a full pressure simulation |
| Underground/elevated | Shafts/entry-exit, selected segment/path and elevation | Must represent true routing and collision rules |
| Factory I/O | Port direction, known inputs/outputs, source and sink | Never show undiscovered reactions |
| Incident & recovery | Affected module, hazard evidence, blocked transfers and service actions | Explain confirmed incident facts, not spoilers |
| Material whereabouts | Stock/buffer/storage/terminal locations when the player is entitled to know them | No magical global stockpile |

Study **Oxygen Not Included** for overlay clarity, not its cartoon visual identity. Overlay combinations must have explicit priorities; avoid an all-on rainbow. Each overlay should be legible by shapes/arrows/labels as well as hues. Visual highlighting should return users to the relevant real tile/machine, not a different abstract database view.

## 6. Contextual mode transitions and example flows

### Flow A — construct the first production route

`Open relevant category → place extractor/factory → rotate/place oriented logistics → see true placement validity → let real material move.`

The UI should never “help” by inventing input materials or skipping construction costs. Existing Phase 16 onboarding guides one concept at a time.

### Flow B — diagnose a blocked factory

`Select blocked factory → read output-full diagnosis → identify blocked exit / route → optionally enable transport overlay → modify real logistics → observe authoritative recovery.`

Success is measured by fewer wrong guesses and no need to search giant panels; don't auto-complete the routing puzzle.

### Flow C — first shipment

`Cargo reaches real terminal → select terminal / review physical staging & manifest → confirm dispatch → see actual export settlement → brief Directorate congratulation.`

The congratulation must never obscure the fuel allocation/obligation numbers or consume cargo itself. Ordinary company allocation is abstract; advanced imported operating fuels are physical materials at terminal modules.

## 7. Visual language and interaction feel

**Industrial but light:** charcoal/olive/cream panels, thin enamel-steel boundary, small stamped uppercase section labels, precise numeral spacing and sparingly used state red, hazard yellow/orange and alien product accents. Do not turn everything into distressed paper, giant rivet graphics or permanently illuminated gauges.

**Two typography registers:**

- display/government headings: deliberate, proud, high-character and occasional slogans;
- operational values, quantities, rates and actions: readable straightforward technical type, scalable and unambiguous.

**Motion:** responsive simple transitions; machine/world motion remains Phaser-owned. CSS/React movement must respect reduced motion; don't add heavy per-frame renders, flicker, screen shake or gratuitous animation packages. Sound and animation should represent actual machine operation/feedback.

**Accessibility:** focus/hover/selected states, large enough hit areas, text contrast and scaling, keyboard shortcuts with alternatives, shape-encoded state indicators, no reliance on color, appropriately condensed layout for narrow windows and future physical-device testing.

## 8. Shared identity with the chosen Main Menu

The menu is **ceremonial** and the HUD **operational**; both belong to the same Directorate via:

- fictional seal family and serial/model designation style;
- durable color/material/type hierarchy;
- a consistent official announcement voice;
- optimistic government language against practical harsh manufacturing;
- *never* softening engineering truth in order to sell state propaganda.

A state-stamped small HUD label can echo a giant propaganda poster. Don't import the entire menu title, huge heroic illustration or thick border into play.

## 9. Alternatives to compare, not yet decided

| Question | Leading hypothesis | Alternate / test |
| --- | --- | --- |
| Build controls | **Left vertical rail** | Bottom dock / left-plus-bottom hybrid; assess selection speed and center map occlusion |
| Inspector placement | **Contextual right edge** | Side switching or position-aware layout; test selected machine visibility |
| Permanent resource density | **Only site pulse + operating allocation** | Add small actionable indicators for obligations, terminal activity or active site hazard if demanded by playtest |
| Notification behavior | **Sparse transmission stack** | State summary button with badge and short toasts; measure disruption |
| Analysis access | **Explicit temporary overlays** | Inline per-selection highlights for simpler diagnoses |
| Toolbar appearance | **Modern affordances within light steel/enamel framing** | More diegetic instrument chrome; compare readability and click economy |

### Evaluate with playtasks

- A new player can find a build tool, identify orientation and cancel cleanly.
- A first failed experiment explains **what happened physically** without leaking recipes.
- A blocked factory can be diagnosed without opening an unrelated screen.
- Export value, import stock and the ordinary allocation balance cannot be confused.
- At typical game zoom, the UI does not hide the physical buildings and routes that matter.
- “Official pride” never replaces or delays corrective hazard feedback.
- HUD still works with reduced motion and larger text.

No acceptance timings/percentages are asserted until we actually test humans on the build.

## 10. Status & next design surfaces

- **Agreed at concept level:** world-first, compact normal play, contextual inspector, temporary analysis, **practicality over fully diegetic friction**, shared Directorate visual identity with Main Menu C.
- **Leading but unapproved placement proposals:** left build rail, right inspector, minimal allocation-only persistent counters.
- **Inspector follow-up now documented:** [Factory & Machine Inspector Direction v0.1](FACTORY_INSPECTOR_DIRECTION_V0_1.md) grounds the closed factory contract, machine diagnosis, measured throughput and site works in live code. **Terminal** design is now explored in [Company Terminal Direction v0.1](COMPANY_TERMINAL_DIRECTION_V0_1.md); **Field Notebook** now has a design draft in [Field Notebook Direction v0.1](FIELD_NOTEBOOK_DIRECTION_V0_1.md); layout and art remain open to visual review. Do not start implementation, rename IDs or open another phase from this draft alone.
