# Shared UI Visual Grammar v0.1 — The Directorate's Industrial Interface

> **Status:** EXPLORATORY CROSS-SCREEN DESIGN SYSTEM, drafted 2026-10-12. This is the **first unified visual/interaction grammar**, not a shipped theme, finished wireframe, canonical color/font palette, new UI framework, asset pack, implementation ticket, or new roadmap phase.
>
> **Accepted anchors:** [WORLD_IDENTITY.md](WORLD_IDENTITY.md) and decisions D-038–D-040. **Chosen concept:** [Main Menu C — Propaganda Meets Reality](MAIN_MENU_DIRECTION_V0_1.md). **Related explorations:** [HUD](HUD_DIRECTION_V0_1.md), [Factory Inspector](FACTORY_INSPECTOR_DIRECTION_V0_1.md), [Company Terminal](COMPANY_TERMINAL_DIRECTION_V0_1.md), [Field Notebook](FIELD_NOTEBOOK_DIRECTION_V0_1.md), [v0-alpha brainstorm](UX_UI_ART_BRAINSTORM_V0_ALPHA.md).
>
> **Rule in one sentence:** **One fictional institution and industrial material culture; multiple task-specific degrees of theater; exactly one authoritative industrial reality.**

## 0. Scope and decisions: do not accidentally canonize exploration

| Status | Statement |
| --- | --- |
| **Accepted** | Real world = heavy, angular, non-junkyard **Dieselpunk**; official-image layer = colorful mid-century state industrial/space propaganda + pulp sci-fi. The actual world uses fixed 2D three-quarter visuals; world-first gameplay; satirical state voice must not obscure factual engineering data. |
| **Chosen for Main Menu** | **Hybrid Concept C / Propaganda Meets Reality**: living industrial scene contrasted with official state imagery; a clear command plaque. |
| **Working default hypotheses** | Compact everyday HUD and contextual inspector; Inspector as a short industrial dossier + on-demand route diagnostics + optional detailed site-work sheet; Terminal as industrial console + occasional manifest document/broadcast; Notebook as earned-evidence journal + optional known-material dossiers. |
| **Not decided** | Exact placement, width, pixel spacing, display fonts, imagery, accent palette, window skins, final names/emblems, navigation specifics, animation style and depth; A/B/C screen choices other than Main Menu are **not** user-approved final selections. |
| **Not shipped** | Menu/Inspector/Terminal/Notebook redesign, final art/animation packs, general content-pack art swapping, new narrative engine, new game simulation systems or any code changes from this document. |

**Authority hierarchy:** Simulation and public `PlayerSnapshot` for mechanical facts; domain design contracts for accepted game logic; [WORLD_IDENTITY.md](WORLD_IDENTITY.md) for art/fiction direction; this exploratory grammar for *presentation proposals*. A mockup cannot grant undiscovered recipes, change fuel semantics or make a “Closed roof” mean “Idle machine”.

## 1. Shared fiction: the same organization, different jobs

Everything can plausibly have been fabricated or issued by the **same state-run industrial apparatus**:

- a **state seal / graphic mark family**, not necessarily the same giant stamp on every surface;
- **serial/model grammar** for sites, machines, material specimens, form references and technical plates;
- **complementary type hierarchy**: ceremonial state heading, plain technical operational text, legible numerals, incidental typed/hand-marked archival accents;
- **enamel, painted steel, cast metal, printed stock** as coherent motifs rather than unrelated application skins;
- **official vs engineering dual voice**: official praise, directives and euphemisms versus precise and unambiguous operating state and experiment evidence.

**Do not settle proper nouns by accident.** *Directorate, Site 47, Unit 03-A, Varkov-45, invented seals and slogan examples* remain candidates, not canon or save IDs.

### The “ceremony dial”

| Surface | State/propaganda presence | Physical/material expression | Interaction priority |
| --- | --- | --- | --- |
| **Main Menu** | **High**: dramatic message, banner, seal, optimistic graphic treatment | Live/curated diesel-industrial scene beneath propaganda | Start/continue/load/settings/credits accessible immediately |
| **In-game HUD** | **Very low**: designation and occasional transmission only | Light enamel/dark steel edge modules; mostly world visible | Build, select, change mode, acknowledge real alerts |
| **Factory/Machine Inspector** | **Low**: unit plate, serial, filing heading | Workshop service sheet, industrial instrument discipline | What / why / next actionable intervention |
| **Company Terminal** | **Medium–high** for Work/Company; **low–medium** for Handling/Shipment | Freight console + selective state documents | Actual cargo, authorized handling, manifest, compensation and obligation |
| **Field Notebook** | **Low–medium**: archive cover, occasional stamp | Scientific evidence binder/sheet with clear experiment summaries | Known / unresolved / observed hazard / next test |
| **Overlays / placement feedback** | **Near zero** | Technical arrows, ports, valid/invalid footprints | Physical causality and readability in-world |
| **Field Brief / tutorial** | **Low–medium**, occasional appointment message | Brief official transmission, not full-screen cinematic | One genuine next action at a time |

**Why:** the more often someone repeats an action, the less decoration it should require. Political satire has a home; it should not impose an extra click tax on every belt.

## 2. Material/shape grammar: world assets versus UI chrome

### Physical world (Phaser; accepted style)

- **Machine silhouette:** angular, weighted, recognizable operating function; tanks and cylinders where mechanically credible, not uniformly rounded Atompunk appliances.
- **Shared manufacture:** modular casings, fittings, bolts, service doors, serial plates, hazard markings and industrial typeplates; functioning pipes and freight routes remain readable.
- **Wear:** controlled paint loss, soot, heat marks and repair history. **Not** universal rust, noise or trash.
- **Alien material:** distinct properties through silhouette, motion and appropriate colors; the planet resists the standardized industrial architecture.
- **Layering:** keep actual entrances, ports, attached routes, hover/selection and cutaway factory interiors consistent with the fixed 2D camera and true topology.

### UI chrome (React; proposed, separate from gameplay truth)

Use a **three-level physicality budget**:

1. **Minimal functional:** HUD tool buttons, overlays, short machine status, compact actionable labels. No thick frames; sober, readable, functional.
2. **Operational instrument:** Factory Inspector, Terminal handling/shipments, expanded analysis. Fine steel/enamel strokes, stamped names, small indicator plates, modest dimensional edge detail.
3. **Ceremonial/documentary:** Main Menu plaque, official company bulletins, unusual report, first-export celebration, science-file cover. Graphic poster ink, large type, distressed print *in bounded decorative areas*.

The visual idiom should feel related across levels without copy-pasting the same heavy plaque six times.

**No framework from this list:** these are direction categories, not new React component requirements, compositing shaders or procedural UI asset generators.

## 3. Candidate palette and semantic color system (NOT final tokens)

A **single working palette family** may be tested in mockups, with restrained state accents and bright alien materials. The following are **illustrative swatches** for reproducible comparison, **not approved hex values, current CSS token replacements or validated accessibility pairs**:

| Candidate design token | Illustrative swatch | Primary job | Constraint |
| --- | --- | --- | --- |
| `surface.world-edge` | `#1E2625` (charcoal green/graphite) | edge overlays / HUD backing | stay visually distinct from near-black world areas |
| `surface.instrument` | `#2D3837` (gunmetal olive) | ordinary panels | neutral, not every panel a gray rectangle |
| `surface.document` | `#E5D8BB` (aged technical cream) | bounded reports/official manifests | avoid bright full-screen light panel on dark map |
| `text.primary` | `#F0E7D1` (warm near-white) | main words and numbers on dark UI | legibility before authenticity |
| `text.secondary` | `#B9BEAF` (neutral warm gray) | supporting label | never use faint text for costs or causes |
| `accent.state` | `#A4493B` (oxide/crimson) | institutional seals, propaganda accents | **not automatically an error color** |
| `accent.action` | `#CFB16F` (industrial brass) | selected controls / active focus | may differ from hazardous warning |
| `signal.positive` | `#93B8A1` (muted process green) | verified operation / success | word and icon required |
| `signal.warning` | `#E0A55B` (amber) | true noncritical hazard or blockage | contrast test required |
| `signal.critical` | `#D97563` (safety vermilion) | actual incident / destructive risk | cannot be mistaken for state-brand red |
| `signal.analysis` | `#70B7BF` (cold cyan) | selected route/port diagnostic | do not imply a universal physical fluid |
| `alien.known` | **content-specific** | discovered material presentation | do not assign global semantic truth from color |

For **document-light surfaces**, use separate dark ink tokens rather than `text.primary` warm-white. Palette needs real contrast measurements at actual font sizes and behind actual gameplay footage before final adoption.

Semantic hierarchy: **danger and action semantics outrank national branding**. A red government seal must not be indistinguishable from a red machine incident, and “success” must not be communicated only as green. Solid/liquid/gas and different transport layers require shape/labels/arrows *in addition to color*.

## 4. Typography: two voices, one readable interface

**Register A — Directorate display:** condensed/industrial/heroic title faces and small caps **only for headers, propaganda and document cover art**. Study mid-century print and industrial stenciling as style, not proof that every number should be a stencil.

**Register B — Operational text:** legible modern sans for procedures, diagnostics, material names, explanations and button labels; numeric tabular figures for units, caps, costs, rates, capacity, time when actual state supports them.

**Register C — Archival micro-detail:** selectively monospaced batch labels, short document serials, restrained stamped typography. Not a fixed-pitch body font for five paragraphs of experimental notes.

Proposals for an eventual token scale to *test*, not mandate: large display (menu), section title, object title, primary body, secondary annotation, small technical eyebrow and prominent tabular quantity. **Do not hardcode 8–10px text just to emulate old dashboards.** Minimum readable size must be checked with viewport zoom, text scaling and screenshots. Current `globals.css` uses Segoe UI/Arial and Consolas/Courier for practical baseline; this document does not replace font files or require font licensing/downloads.

Language: localized display names may grow; design flexible layouts rather than fixing a single English character count. No image-only text for critical controls; propaganda art can contain decorative typesetting but interactive captions need accessible text.

## 5. Shared component grammar (presentation and behavior)

### Identity rail / unit plate

Small official emblem + site/module/unit ID + readable authored name. In Menu this can be large; in HUD and inspectors it must be compact. A model number is presentation metadata unless an existing stable object ID or authored model name safely supplies it.

### Status / priority strip

A predictable order: **what is happening → what caused it (if genuinely known) → next available action → details**. Status is a labeled word+icon+appropriate color. Never use the same “CLOSED” badge for a factory's **roof closed** and its machinery being **disabled**. Distinguish `CONTRACT MEASURING` from actual operating status; rate figures exist only when measured/stable, not as imaginary `nominal 60/min` from artwork.

### Action buttons

Use a **consistent action hierarchy**:

- **Primary:** the one useful immediately available action (e.g. `Open Interior`, `Dispatch Shipment` where valid).
- **Secondary:** inspect, navigate, reveal, compare, change context.
- **Dangerous:** dismantle/reclaim potentially destructive actions with context, eligibility, accurate consequences and confirmation if required.
- **Unavailable:** disabled with actual reason (missing physical cargo, cost, locked capability, etc.), never decorative fake toggles.

Visual metaphors may be a mechanical pushbutton or printed work-order link; hit targets, keyboard/focus, pointer and cancellation remain modern. **No second confirmation click for harmless everyday operations just to simulate stamps.**

### Tabs / filters / navigation

- **Notebook:** keep actual four filters `All / Open / Hazards / Confirmed` and current knowledge semantics.
- **Terminal:** keep `Work / Handling / Shipment / Company` as recognizable section access. Navigation can be styled like document index tabs but does not become a separate SPA dashboard.
- **Inspector:** compact summary first; production/I-O/equipment/conditions/site works expanded on demand; sections remain proposed grouping.
- Consistent selected, focus and disabled cues, and stable location of return/close.

### Data and charts

A **visible quantity must come from public authoritative state**. Rates belong to measured boundary throughput or another proven metric; distinguish planned selection from physical transfer. Units cannot be implied by unrelated science-fiction gauges.

Avoid default global top bars full of fabricated `220 MW`, `87% morale`, `2,384 crew` and similar mockup placeholders **when those systems are not in Unknown Yield**. The core game does not gain a power grid or workforce system by copying a beautiful screenshot.

### Notifications / official stamp

Use **state proclamations** rarely, tied to real events; provide dismiss/reopen when appropriate. Engineering incident alerts must be faster and more prominent than patriotic celebrations. Propaganda can characterize an outcome, but cannot produce or certify the outcome itself.

### Selection and analysis overlays

Highlight real selected boundaries, ports, material routing and incident cells. Optional colored flow markers must show real transport state and topology. `Analysis` is an explanatory mode, not a separate debug simulator; do not make every pipe shimmer all the time.

## 6. Spatial layout and responsive behavior: one world with attached instruments

### Desktop candidate skeleton, not pixel-locked

```text
┌────────────────────── slim state pulse ───────────────────────┐
│ Site / allocation (if relevant)       Official messages/help  │
│                                                               │
│ [Tool?]        PLAYABLE 2D INDUSTRIAL WORLD                    │
│ [Rail?]               selected equipment                      │
│ [    ]                                      ┌───────────────┐  │
│                                             │ CONTEXT SHEET │  │
│                                             │ What / why /  │  │
│                                             │ next action   │  │
│                                             └───────────────┘  │
│     small active build instructions / optional overlay legend │
└───────────────────────────────────────────────────────────────┘
```

- **HUD:** narrow site/economy/action pulse, not a permanent five-resource corporate stock ticker; left tool rail leading hypothesis, bottom dock or hybrid still viable.
- **Inspector:** right contextual compact panel leading hypothesis; do not block the selected object after camera reframe. Collapse/open detailed reports deliberately.
- **Terminal:** on-map terminal stays visible. Compact everyday console; larger freight document only when needed.
- **Notebook:** evidence summary, four filters, facts; optionally expand a known-material dossier; reading should not relocate gameplay.
- **Main Menu:** chosen Hybrid C background scene with a side plaque (left/right undecided) and optimistic official print.

### Viewport and overlap rules

Treat desktop widescreen, a narrower laptop window, and mobile/narrow widths as **test contexts** rather than inventing completed mobile UX. The world should never become a thumbnail between left and right sidebars. A narrower viewport may use **one active panel/sheet at a time** (selected object, Notebook or Terminal), with clear close/return and scroll; placement controls remain accessible.

Do not assert a magic minimum percentage of exposed world area before measuring actual screenshots, nor demand per-app responsive CSS framework. Keep overlays layered with deliberate input ownership so world gestures do not leak into scrollable document panels.

### Existing production baseline (not mistaken for approved skin)

As of `fcfe419e`, `apps/web/app/globals.css` already has `--bg / --panel / --line / --text / --muted / --gold / --green / --mono`, top HUD, `.context-panel`, `.context-tabs`, `.build-bar`, responsive rules and reduced-motion provisions. The world canvas is full-screen. That is a functioning **implementation baseline**, **not** the final approved Dieselpunk design system. Existing code also contains a fixed art asset registry in `apps/web/game/art-assets.ts` and `/art/phase16/` SVGs; it cannot yet swap arbitrary new art/animations via content packs.

**Do not use this design draft to justify rewriting `globals.css`, replacing icons/fonts or converting the UI to a generic component library today.** A later scoped implementation should take a few representative surfaces through proof first.

## 7. Information voice and truth boundaries: two registers, one contract

| Context | Official state text (sample only) | Technical truth (must be grounded) |
| --- | --- | --- |
| New assignment | “COMRADE, THE FUTURE AWAITS YOUR INDUSTRY” | Begin / Continue / Load controls accurately linked to actual saves |
| Selected factory | Unit stamp + registry plate | Machine states, physical buffers, truthful reasons; roof state is **not** operating state |
| Measured production | “EXEMPLARY OUTPUT HAS BEEN RECORDED” (only if deserved) | Only certified `stable` boundary rates; `measuring` is not failure |
| Actual incident | “UNPLANNED STRUCTURAL ADVANCEMENT” | Actual known hazard class, cause and supported recovery sequence |
| Export | “EVERY TON A VICTORY” | Cargo physically staged and dispatched, authoritative quantity and settlement |
| Assistance | “THE PEOPLE'S GENEROSITY IS WITHOUT LIMIT” | Actual allocation, open obligation and repayment rules |
| Discovery | “FILED FOR NATIONAL SCIENCE” | Only known/confirmed input/setup/outcome; hints remain unresolved |

Specifically: the basic `Save.fuel` balance is an **abstract company operating allocation**, while higher operating fuels are **physical imported materials**. Distinct symbols and labels are required; don't adopt an arbitrary fuel canister, grid electricity or pipe-network visualization for the abstract allocation. Engineering readouts must never reveal hidden recipe outputs or target names for unknown reactions.

## 8. UI motion, sound and tactile response

**Main Menu:** restrained environmental smoke, gantry/conveyor idle motion and distant public-address atmosphere; title and options stable; reduced-motion equivalent.

**HUD / tool palette:** immediate pointer/keyboard confirmation, understandable orientation/validation and cancellation; no animated ornament around every numeric field.

**Inspector:** selection pulse on the real factory, slight panel reveal, operational state change based on actual sim event. Diagnose first, celebrate later.

**Terminal:** functional dispatch/receipt acknowledgement only after real settlement. A restrained **official broadcast chime** or stamped paper effect may accompany important events, but no lengthy mandatory customs minigame.

**Notebook:** brief reveal/highlight of *newly earned* evidence; no faux animated scanner that magically unveils unseen recipes or forced page turns.

**Sound design:** heavy machine layers are world audio; official broadcasts are institution audio. Mute controls, reduced motion and screen comfort take priority over retro authenticity. **No flashing status lamps, invasive screen shake, forced film grain/scanline shader or aggressive dithering.**

## 9. Asset/presentation families to author later

The shared look must be coherent across world and UI; AI-generated splash art alone is **not** an art direction proof.

| Family | Reusable visual objects (proposal) | Where it appears |
| --- | --- | --- |
| **State institution** | fictional seal variants, registration mark, archive stamp, typography treatment, propaganda templates | Menu, terminal, notebook, unit plates |
| **Industrial operating UI** | steel/enamel panel edges, gauges with truthful values, plain gauges/indicators, buttons, warning motifs | HUD, inspector, terminal handling |
| **Documents** | requisition sheet, hazard report, manifest, field lab card | Terminal Work/Shipment, Notebook, work order |
| **World machinery** | factory shell/roof, extractor, processor, terminal, dry/dock module, pipes/belts/ports, damage masks | Phaser world; selected-object mini thumbnails when authorable |
| **Material identities** | known deposit/specimen sprites, phase/container silhouettes, technical labels, optional lab-designation tags | World, inventory, notebook, terminal |
| **Feedback** | selected border, blocked route, true hazard callout, success stamp, reduced-motion static variant | In-world selection, panels, messages |

**Art production rule:** representative fixed-camera 3D blockout → 2D renders/sprites/layers → gameplay-zoom review (see [ART_PIPELINE.md](ART_PIPELINE.md)). A technical schematic or small illustration must derive from the same physical design family, not independent unrelated art generation.

Data-driven labels should stay separate from stable sim IDs. Later art/animation references may be authored as metadata with explicit validation, but current runtime pack-swappable animation system does **not** exist.

## 10. Lessons from the first Inspector concept images

The previously generated **Compact Dossier / Spatial Diagnostics / Detailed Work Order** concepts are **mood/layout exploration** only:

**Worth keeping:**

- selected industrial building visually anchors the screen;
- cream/red Directorate plate contrasts with dark functional machinery;
- purposeful pipework, gantries, equipment mass and state industrial signage;
- route highlighting in diagnostic mode, richer paperwork only for special operations;
- different density for everyday selection versus intentional detailed work order.

**Do not treat as canonical implementation data:**

- A mockup top bar with thousands of workers, hundreds of megawatts, “morale 87%”, etc. **These are not established systems.**
- “Closed” in a factory sheet used as if the factory were powered off; **roof open/closed is presentation-only** in Unknown Yield.
- “Nominal 60/min” and “Overall Condition 32%” without authoritative simulation metrics; **certification and operating state differ**, and no universal percentage gauge should be invented.
- Voluminous 3D-looking dioramas are not permission to change our **fixed 2D, three-quarter** art pipeline; visually beautiful mockups can overstate feasible runtime depth and details at actual gameplay zoom.
- Large paper panels taking half the world, when frequent context inspection should remain compact.
- Logos/names/“power grid” solutions inserted by image generation should be treated as **illustrative fiction**, not actual repo capability.

**Test real usability with a gameplay-scale scene**, not only high-resolution concept illustration.

## 11. Focused v0.2 mockup matrix (proposed next proof)

Before mass asset production or a final palette, use **one consistent representative scene/state** across illustrations and UI variants:

### One common production moment

- fixed-angle 2D industrial site with **one factory exterior/interior**, actual ore/deposit, extractor, belt/pipe routes, physical terminal/dock, a known material, subtle real-looking alien terrain;
- same chosen state situation across all screens (e.g. real blocked output / known hazard, **only** if the chosen snapshot would allow it);
- all labels/quantities either **from a named real test snapshot** or conspicuously marked **CONCEPT ONLY** and excluded from truth claims;
- ensure world area remains legible at an actual viewport size and comfortable zoom.

### Compare these surfaces side by side

1. **Main Menu C** — real plant panorama + small official propaganda plaque; test left/right composition without inventing a finished save scene.
2. **Normal HUD + one selected factory** — likely compact dark instrument UI, no fabricated grid/crew/production numbers.
3. **Factory Inspector + Spatial Diagnostics** — practical summary vs highlighted physical route; interior/roof continuity.
4. **Terminal** — a compact physically anchored freight command console, a deliberate extended manifest, and a small official broadcast **as states, not three separate games**.
5. **Field Notebook** — open/confirmed/hazard evidence cards plus optional known-material dossier; no hidden products or full recipe graph.

A useful output is a **single side-by-side contact sheet or 16:9 screenshots with a common palette/world reference**, plus 1-line notes per visual: *keep / change / reject / unresolved*. Mockups should explore **two contrast/ornament intensities**, not twenty unrelated AI styles.

### Review criteria

- **Legibility** at gameplay scale; amount of world still visible; distinction between selected factory and decorative HUD.
- **Unity**: all five are recognizably the same expedition/institution/world with different uses, rather than separate apps.
- **Pace**: every frequent interaction has an immediate path; ceremonial bureaucracy never adds repetitive busywork.
- **Correctness**: no invented mechanics, values, power supplies, aggregate factory execution, hidden recipe output or physical ordinary “fuel”.
- **Art feasibility**: actual 2D sprites can convincingly achieve the suggested visual quality using approved fixed projection.
- **Accessibility**: legible type, icons+words, keyboard focus, adequate hit targets, reduced motion and limited visual noise.
- **User preference**: final mockup approval is the design decision; `v0.1` documents alone do not mean an approved final skin.

### Open questions after review

- Is the default HUD a left rail or a bottom dock, and does the real selected object remain unobstructed?
- Which exact panel aspect and anchoring works on desktop and narrower viewport?
- Should the Terminal/Notebook normally share a compact edge treatment, or open as a wider occasional document?
- How bright can the official cream document area be without hurting the dark world view?
- How much in-world propaganda art is healthy before it competes with operating signs?
- Should company/unit names become bespoke display metadata now, or remain neutral placeholders until asset families exist?
- Are two font families enough, with a small industrial stencil treatment baked into titles only?

## 12. Implementation guardrails and change log

**No code, art or roadmap change is authorized solely by this grammar.** Design experiments should precede implementation. When the look is approved, prefer narrow reusable design tokens/components over wholesale `GameClient.tsx`/CSS rewrites; measure any risky rendering style on target devices and preserve performance/security/sim invariants.

- **2026-10-12 — v0.1 created:** reconciles accepted Dieselpunk/propaganda identity and five UI exploration docs into shared material/type/color/behavior/voice/asset rules; records misleading aspects of generated Inspector concepts.
- **Pending visual review:** no final hexes, fonts, brand mark, panel geometry, specific art assets or confirmed A/B/C for Inspector/Terminal/Notebook.
- **Suggested next deliverable:** controlled visual mockups/contact sheet for comparison and iterative v0.2 edits, **not** a new epic.

**Related source of truth:** [GAME_DESIGN.md](GAME_DESIGN.md), [ECONOMY.md](ECONOMY.md), [CONTENT_MODEL.md](CONTENT_MODEL.md), [ART_PIPELINE.md](ART_PIPELINE.md), [PHASE16_PRODUCTION_UX.md](PHASE16_PRODUCTION_UX.md).
