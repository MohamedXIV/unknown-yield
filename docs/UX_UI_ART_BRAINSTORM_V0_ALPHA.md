# Unknown Yield — UX/UI, Game Art & Experience Brainstorm v0-alpha

> **Status: EXPLORATORY WORKING DRAFT — 2026-10-12.**
>
> This is an **idea inventory and discussion map**, not an approved final UI specification, art-production backlog, new roadmap phase, or assertion that new assets/menus were implemented. Its purpose is to preserve promising inspirations and disagreements while we converge through critique, screenshots, mockups and playtests.
>
> **Canonical accepted identity:** [WORLD_IDENTITY.md](WORLD_IDENTITY.md) and decisions D-038–D-040. **Existing production UX:** [PHASE16_PRODUCTION_UX.md](PHASE16_PRODUCTION_UX.md). **Technical art pipeline:** [ART_PIPELINE.md](ART_PIPELINE.md). **State-derived onboarding:** [PHASE16_ONBOARDING.md](PHASE16_ONBOARDING.md).
>
> **Scope:** player-facing UX/UI **and** game-world art, illustration, machinery, material identity, atmosphere, feedback, game feel, narrative flavor and presentation. The user explicitly wants to look beyond UI screenshots because production art has not yet been finalized.

## 0. The guiding hypothesis

**An industrial science game should feel like commanding a real, imperfect, state-operated expedition — not operating a generic React business dashboard.**

**Physical reality:** hard-edged, heavy, comprehensible **Dieselpunk industry** on a strange planet.

**Official image:** optimistic, colorful **mid-century industrial/space propaganda + pulp science-fiction illustration**. The government's idealized image need not resemble its actual machinery.

**Human experience:** readable and fast modern strategy-game interactions with visible physical consequences; progressive discovery and just enough official comedy to give events personality.

**Desired player reaction:** *“I can see what happened, I understand what I might try next, and I want another experiment.”*

### What is already approved, versus open

| Status | Direction |
| --- | --- |
| **Accepted (do not reopen incidentally)** | Fixed 2D three-quarter world; Phaser world rendering and React interface layer; simulation truth independent of presentation; physical inventory; hidden recipe knowledge; factory-as-function; Dieselpunk physical identity; separate pulp/state propaganda; factual engineering diagnostics; stable content IDs |
| **Promising blend, NOT final spec** | **HighFleet × Frostpunk × Against the Storm** as the main UI/art study triangle; **Papers, Please** for bureaucracy; **Oxygen Not Included** for diagnostic overlays |
| **Exploring** | Main menu compositions, HUD placement, window styles, interaction patterns, typography, information density, machinery/detail rendering, ambient sound, narrative delivery, fictional logo and emblem |
| **Not approved / not implemented** | Full UI redesign, custom diegetic renderer, cinematics, radio characters, exact government nomenclature, specific material names, an extra story campaign, new mechanics or performance promises |

## 1. Reference library — games to study, not templates to copy

These entries are **our qualitative design hypotheses**, not independently verified feature-by-feature reviews, licenses to reuse art, or declarations that each game already solves Unknown Yield's problem. Review actual footage/UI stills and record evidence before selecting final patterns.

| Reference | Study for UX/UI | Study for game art/design/feel | Avoid copying |
| --- | --- | --- | --- |
| **HighFleet** | Radar/control panels, instrument legibility, operational readouts, hardware-like interaction, layered command decisions | Mechanical/military credibility, commanding old powerful hardware, sound and tactile feedback | Excessively cryptic controls, obligatory physical knob manipulation for every click, combat/aircraft systems |
| **Frostpunk** | World-first composition, strong information hierarchy, focused context/action surfaces, atmosphere that supports decisions | Monumental heavy industrial architecture, scale, cold oppressive mood, social stakes | Unnecessary radial menus, giant panels hiding build space, mandatory survival-city mechanics |
| **Against the Storm** | Production building inspection, actionable status hierarchy, satisfying readable progression, contextual guidance | Color/shape grouping of resources and buildings, readable settlements, responsiveness and moment-to-moment cadence | Its specific fantasy look, recipe spoilers, forced run-based structure or quest checklists |
| **Papers, Please** | Dossiers, permits, forms, stamped reports, state-issued orders and classification | Bureaucratic absurdity, friction used intentionally, ideology told through procedure | Making ordinary construction or exports tedious paperwork; passport-inspection gameplay |
| **Oxygen Not Included** | Distinct diagnostic overlay modes for liquids/gases/routes/states; color + symbol-coded networks | At-a-glance simulation causality, readable movement and network visualization | Cartoon character look, copying colony-survival systems, overly abstract always-on heatmaps |
| **Captain of Industry** | Build categories, industry/throughput panels, construction feedback, logistics status | Large-scale readable industrial terrain and transport, physical consequences | Dense all-at-once information, truck/earthworks mechanics without a demonstrated need |
| **Workers & Resources: Soviet Republic** | Context-sensitive industry management, planned-economy concepts and informational density | Soviet-inspired industrial massing, utilitarian signage, state-infrastructure fantasy | Its potentially steep interaction complexity, city/population simulation scope |
| **Hardspace: Shipbreaker** | Job briefs, debt/obligation explanation, corporate messages, equipment feedback | Workplace-industrial physicality; a darkly humorous gap between official claims and lived labor | First-person tool handling, disassembly as the main loop |
| **Tropico** | Comedic political messaging, satirical objectives, recognizable recurring government voice | Theatrical nationalism and the contrast of leader branding versus real policy | Island cartoonism, direct government/political-management sim |
| **Helldivers** | Official bombast, short triumphant bulletins, slogans and mission-completion framing | Propaganda that is gleefully confident and increasingly ridiculous | Military shooter interface, relentless joke frequency, US-style sci-fi armor as our machine language |

### Working selection: division of labor, not one Frankenstein skin

- **HighFleet** → operational/terminal instrumentation and tactile industrial identity.
- **Frostpunk** → overall world-first screen composition and oppressive industrial weight.
- **Against the Storm** → production inspector, comprehension, compact decision guidance and user flow.
- **Papers, Please** → specific institutional documents and stamped state messages.
- **Oxygen Not Included** → temporary purpose-built analysis overlays.
- **Captain of Industry / Workers & Resources** → construction/logistics legibility and real industrial form.
- **Hardspace / Tropico / Helldivers** → forms of institutional comedy, obligation and propaganda, **not** base-world genre mechanics.

**Do not combine every reference's UI density or add their game systems.** An inspiration is valid only if it makes the present discovery-to-industrialization loop clearer or more satisfying.

## 2. Visual grammar proposals (not final asset specifications)

### A. Real-world versus state-image contrast

**Working plant:** heavy compressors, squared furnaces, chunky extractors, service gantries, stamped casings, painted wear, visible interfaces, bolted walls, worn enamel, cable and pipe management, utilitarian hazard markings. Clean enough to read at 2D zoom; not a rusty junkyard.

**Publicity illustration:** heroic worker/scientist silhouettes, sharp diagonals, planetary horizons, bold shapes, visible brush/print texture, oversized optimistic type and fake-unassailable achievements. Industrial posters and pulp covers can influence composition, not machine geometry.

**Alien geology:** unfamiliar color and shape language; deposits, reaction products and hazards need distinguishable physical behavior and reveal details as player knowledge grows.

**Unique flavor opportunity:** before industrialization, a site looks like foreign territory being imposed on by standardized state equipment. Later, confirmed alien discoveries lead to visibly modified human machines and new industrial districts.

### B. Shape and material language

| Surface | Draft shape / treatment | Readability rule |
| --- | --- | --- |
| Factory shell | Angular armored roof plates, thick walls, vents, reinforced corners | Input/output ports visible and differentiated; open/closed must not appear as two unrelated buildings |
| Extractor/miner | Low, weighted industrial silhouette; drill/feed purpose visible | Active mining, blocked output, and no fuel have readable differences |
| Crusher/furnace/reactor | Function-first moving parts, service panels, analog indicator cluster | Animation reflects authoritative operating state, not perpetual decorative spinning |
| Terminal | Large physical off-world logistics machine with bureaucratic placards, freight bay markings | Export must still be understood as *physical cargo leaving the map* |
| Belts/pipes/gantries | Clearly distinct footprint, elevation, flow direction, containment and junction grammar | Routing remains legible with realistic clutter/roof masks disabled when needed |
| Material / hazard | Unique form, container and motion cues; rare glow for meaningful discoveries | Never encode phase, danger or discovery exclusively by hue |
| UI surface | Enamel/metallized panels, selective bolts, stamped headings, subtle parchment for documents | Decorative housing must not shrink click targets or obscure text |

Possible accents (not chosen palette): graphite, painted olive/cream, dark brick/oxblood, muted safety yellow, cold signal lamps, rare bizarre alien hues. User-sensitive comfort: restrained contrast, no persistent flicker or intense dithering.

### C. Art technique / performance direction

Preserve the accepted pipeline **simple 3D blockout → fixed-camera reference renders/passes → coherent 2D sprite/animation/masks → Phaser**. The exact asset production recipe will be tested on **one representative vertical sample**, not a whole art library.

Potential reusable overlays: operational emissive, wear, warning, corrosion, smoke, heated surfaces, contamination and structural damage. Treat machinery components, spritesheet animation and transitions as **data-addressed assets** eventually, while acknowledging that current asset registry/content packs do not implement general animation-art pack swapping.

**Game feel questions:** Which motions and audio affirm successful/blocked transfer? When should a machine sound mechanical or dangerously pressurized? How much animation survives when the factory roof is closed? Can we show a modest believable industrial disaster without expensive unique cinematic assets?

## 3. UX principles for Unknown Yield

1. **World-first, always:** Phaser/world is the permanent scene; React in-game panels and menus are subordinate, never a SaaS dashboard around a framed game.
2. **Modern usability under antique visual language:** the shell may suggest hardware; ordinary actions should remain 1–2 clear interactions with consistent mouse/keyboard support. **Hardware fantasy is presentation, not mandatory UI friction.**
3. **Three questions in every inspector:** *What is happening? Why? What can I do?* Keep advanced diagnostics accessible without overwhelming the default view.
4. **Explain observed truth, not hidden solutions:** allow hypothesis and evidence; no authored undiscovered recipe lists or fake causality.
5. **The map is an instrument:** physical location, routing, storage and factory persistence matter; detailed UI must map back to a selected place/object.
6. **Progressive disclosure:** show only the controls, concepts and reports relevant to an experienced or immediate constraint; never demand the whole industrial bureaucracy at onboarding.
7. **State broadcasts entertain; technical UI informs:** separate satirical official voice from factual inventory, hazard, quantity, logistics and engineering causes.
8. **Accessibility and low-fatigue presentation:** readable scalable type, focus indicators, reduced motion, no excessive bloom/grain/dither, shape/icon redundancy to color, no permanently animated decoration around critical values.
9. **Data-driven presentation where it pays:** names, dossier copy, families and art references should not force sim-core code changes; don't build a speculative UI DSL or modding platform.
10. **Decisions before decoration:** success means the next good industrial choice is obvious enough to attempt, not that a screenshot looks mechanically impressive.

## 4. Screen-by-screen exploration

These are sketches of *possible* designs. No layout has been approved.

### 4.1 Main Menu — first encounter with the state

**Concept A: “Official Recruitment Poster.”** Hand-painted pulp/state propaganda showing a heroic off-world industrial installation. Start/continue options integrated into a restrained side plaque; motion is subtle.

**Concept B: “Directorate Control Console.”** Industrial steel frame, assignment ledger and occasional mechanical indicator. The installation or planetary orbit remains visible behind a restrained menu.

**Concept C: “The Actual Site.”** A live/animated industrial panorama behind an overprinted official proclamation, with the worn truth visibly contradicting the heroic headline.

Functional labels stay unambiguous: **Begin Assignment — New Game**, **Resume Duty — Continue**, **Personnel Archives — Load**, **Regulations — Settings/Help**. Quit only where the build platform supports it. No network/profile/account SaaS homepage. Need safe continue/loading/error/unavailable states and keyboard navigation.

**Still undecided:** illustrated versus live-rendered background; exactly how serious/comedic first contact should be; which of A/B/C communicates the game's true play immediately.

### 4.2 In-game HUD — play, don't administer a website

- Keep **most screen area reserved for the world**; transient notices, commands, camera and compact company standing use edges.
- **Construction tools** should be fast to reach, grouped by understandable activity (site / factory / internal processing / solid/fluid/gas logistics / inspection). Persist selection state visually.
- **Only alert genuinely actionable issues**: blocked output, unmet inputs/fuel, containment risk, unhandled discovered material, meaningful contract changes.
- **Context inspector** opens near an edge or selected object's accessible place without hiding the building it refers to. Show status/cause/next action before tabular details.
- **Factory open/close** should visually maintain building identity, working ports, preserved buffers and external routes. No new page or modal just to enter edit mode.
- Present company presence through concise radio/bulletin toasts; never hijack the player's pointer during a busy build.

Questions: top HUD versus corner cluster; iconized narrow toolrail versus bottom dock; inspector anchoring; whether instrument-like controls improve reading or only reduce available game view.

### 4.3 Factory Inspector — the daily-use workhorse

**Default:** building/model/official name, on/off/blocked/hazard state, current input/output, bottleneck and next possible corrective action. One compact summary. **Expanded:** rate history, internal buffers, process/evidence, containment, control modes and connected routes.

Example workflow: select a stopped refinery → “Output route saturated” with highlighted blocked port → inspect route overlay → fix junction or divert material → resume. **No invented recipe previews**.

Tactile counters/lamps are fine, but click-to-operate levers must not become a mandatory puzzle. Draw inspiration from Against the Storm's actionable production surfaces, HighFleet's industrial vocabulary and Frostpunk's composition.

### 4.4 Field Notebook — a scientist inside a regime

A **technical dossier** not a recipe encyclopedia. Separate **Confirmed / Suspected / Open / Hazards**, sourced from public observed knowledge only. Cards may carry stamped laboratory classifications, discovery dates (when available), photos/illustrations, and causal notes; they must not fabricate scientific knowledge.

A government heading might proudly say **“New Contribution to the People's Science”**, while the engineer's report states a measured physical result. Consider an **official notice / technician's annotation** split for flavor; both must not contradict gameplay truth on factual fields.

Study Papers, Please for legible documents and Against the Storm for practical scanning/filtering. Avoid requiring lengthy reading to repeat simple experiments.

### 4.5 Terminal — industrial asset and state institution

The **Terminal is physically on-map**, not a fictional remote fintech dashboard. Selecting it opens a company-issued panel with strong material/cargo reality:

- current cargo, manifest, module readiness and real export/import routes;
- *Central Procurement* as possible fictional rebrand of existing market operations, **not** a new market system;
- company demands, evidence-bound orders, special directives and obligations;
- quota/saturation explanation and delivery consequences.

The public-facing voice can celebrate every shipment; a factual panel must always show **actual quantity/value/obligations**. HighFleet's industrial controls + Papers, Please's permits + the existing Production UX hierarchy are complementary.

**Known semantic nuance:** ordinary `Save.fuel` is an **abstract company allocation**, not a physical fuel in a tank. Higher operating fuels are imported physical materials in terminal modules. Do not use a misleading diesel canister icon for the abstract allocation merely because `Varkov-45` is a compelling *fictional* physical propellant name.

### 4.6 Build/Logistics diagnostics — learning from the actual map

Investigate **temporary overlay modes** (not an always-on rainbow):

- solid belt flow and directional junctions;
- liquid containment and blockages;
- gas pressure-line coverage and incompatible connections;
- underground/elevated routes with explicit entry/exit and height/level;
- factory inputs/outputs, throughput and bottlenecks;
- state of hazards / damaged modules;
- material location and storage occupancy.

Overlays must render **supported authoritative snapshot facts** and obey discovery restrictions; show information by symbols/arrows/shapes plus color. An overlay is an exploratory UI affordance, **not evidence we have a full physical flow/pressure/power sim**. Study Oxygen Not Included; preserve Unknown Yield's exact topology and conservation invariants.

### 4.7 Official notifications and comedy

Microcopy should build **one identifiable fictional state voice** rather than random unconnected jokes. Consider three templates:
1. **Heroic bulletin** after first export or verified discovery.
2. **Directive** that turns a real production opportunity into a patriotic instruction.
3. **Incident euphemism** plus a clearly differentiated **accurate technical report**.

Narrative should be event-triggered and sparse enough to leave players alone while building; never grant hidden knowledge, alter simulation, or invent accomplishments just to make a joke. A named recurring bureaucrat is an option, not required implementation.

## 5. Proposed progressive first-hour experience — to validate, NOT force

Use the existing state-derived **Field Brief** rather than adding a separate mandatory cinematic campaign. The following are *experience beats*, not promised timings, recipes or new content:

| Beat | Player action and discovery | UI/art/emotional payoff |
| --- | --- | --- |
| Appointment | A compact Directorate transmission and visible functional site | State identity + immediate world/camera control |
| First extraction | Place an extractor, see **material actually move** | Clear status lights, belt animation, orientation cues |
| First experiment | Set up a plausible operation without being shown its recipe outcome | Industrial anticipation, informative motion/sound |
| First evidence | Inspect the observed result/hazard in the Notebook | Official acclaim vs precise technical notes |
| First black-box factory | Close and reopen the roof; see preserved interiors and outputs | Machine/building compositional coherence |
| First export | Cargo physically reaches terminal; dispatch is clear | Short heroic broadcast, factual allocation and obligations |
| Independent play | An unresolved material/property or industrial constraint remains | “What if I try another process?” rather than a long mandatory quest chain |

We should **playtest the real sequence**, capture where players get stuck and only then decide how much tutorial copy, attention direction, audio, and visual framing to add. Uncertainty must be engaging, not confusing.

## 6. Cross-system coherence: art, mechanics, names and data

The world's industrial identity should be a **family system**, not unrelated AI art and placeholder string leftovers.

| Concept | Desired authored presentation (proposal) | Current caveat |
| --- | --- | --- |
| State organization | Ministry/directorate names, marks, rank/title vocabulary, document series | Proper nouns and emblems unapproved |
| Machines | Industrial design families, stamped model/serial code, purpose-first silhouette and operating states | Content names use locale keys; final sprites require art authoring |
| Materials | Lab designation, public/field name, observed properties, useful classification | Unknown traits must not be revealed before actual evidence |
| Advanced physical fuel | Laboratory designation, prominent public codename and genuine phase/handling requirements | `MK-OIL/45` / `Varkov-45` are examples, **not a rename of any physical item yet** |
| Basic company allocation | Possible in-world “State Operating Allocation” with truthful budget display | It is nonphysical sim budget today |
| Posters/bulletins | Templates, illustration slots, slogans, fictional seals | Not a new narrative engine or arbitrary imported script system |
| Art/animation | Stable referenced sprite, atlas, animation and masks with family/variant metadata | Current `apps/web/game/art-assets.ts` registry is fixed; pack-level art swapping **not implemented** |

**Data-driven principle:** author identity and presentation separately from immutable internal IDs. A future artist/editor workflow can revise visible names, descriptions, stamps, poster art and machine variants without save migration *where the actual content contracts support it*. New fields, art mappings and content pack support require scoped design/implementation and validation, not undocumented assumptions.

## 7. Prototype gallery / comparison workbench (proposed process, not a new phase)

Before a large art pass, compare **the same representative content** across a small set of approaches:

1. **World composition sheet** — one deposit, one extractor, one factory exterior and interior, a short belt/pipe run, a terminal, a visible new material and a small state poster. Show actual gameplay zoom and far zoom.
2. **High-frequency task flow** — select machine → identify bottleneck → fix route → confirm recovery. Try a restrained “industrial instrument” styling vs more conventional compact inspector.
3. **Main Menu concepts A/B/C** — check whether they communicate diesel industry, propaganda contradiction and what players actually do.
4. **Notebook / Terminal concept** — compare documentary bureaucracy against data legibility; validate that scientific evidence still reads truthfully.
5. **Motion & sound strip** — working/idle/blocked/accident and first successful export, with reduced-motion equivalent.

These are **discussion outputs**, not tickets or an implementation authorization. Keep a screenshot/moodboard and notes per concept: **borrow / reject / unresolved / why**.

### Questions to resolve together

- Which single screen best establishes the player's *real* job: poster, industrial console or live site?
- Can we read the 2D factory silhouette and its ports **without UI chrome**?
- How much steel-frame/analog decoration can the inspector carry before it slows workflow?
- When should the government be funny, and when should the engineering report silence it?
- Which diagnostics truly need a new overlay, versus highlighting the selected object and its routes?
- Is our first 10–20 minutes about curiosity or trying to decipher controls?
- Which proportions of machine detail and environmental art look good **at intended play zoom**, not just in a full-resolution illustration?
- How do existing mobile/desktop scale differences affect controls, text size, focus and motion?
- Do we need different presentation families for early imported machinery vs late alien-material-based machines, or can the same family evolve through masks and parts?

## 8. Practical evaluation criteria (qualitative first)

Do not treat automated UI tests as proof of fun or beauty. Review sketches and actual in-game builds against:

- **Comprehension:** a new player can name the next useful action and diagnose the first blocked path;
- **Identity:** the game is unmistakably a state-run Dieselpunk industrial expedition, without relying on paragraphs of lore;
- **Causality:** a failed experiment produces **understandable observed evidence**, never arbitrary recipe-spoiling popups;
- **Rhythm:** discovery, building, exporting and experimentation alternate naturally; no paperwork tax;
- **Legibility:** material, equipment state and spatial routing remain readable at play scale in normal and overlay views;
- **Consistency:** the same institution appears in typography, product design, architecture, posters and voice;
- **Comfort:** readable type, sensible interaction hit targets, low fatigue, reduced motion and no flashing noise;
- **Production feasibility:** reuse blockouts/layers/parts across asset families; avoid per-machine AAA rendering or expensive novelty UI.

## 9. Revision convention

**v0-alpha** deliberately preserves **ideas and options**, not final conclusions. For future revisions keep an explicit small change log:

- **Kept** — evidence indicates a pattern supports the actual game.
- **Changed** — what and why.
- **Rejected** — preserve the discarded idea and the reason so it isn't rediscovered endlessly.
- **Still open** — the question and what experience, screenshot, mockup or playtest would settle it.

Possible next discussion iteration: **v0.1** could select 2–3 real reference screenshots *per surface*, mark layout decisions and produce initial production-feasible wireframes. That version label is **not** a GitHub milestone/phase or promise to implement. Don't create issues until we agree on the concrete design.

---

### Documents to keep aligned

- [WORLD_IDENTITY.md](WORLD_IDENTITY.md): locked fictional/visual identity; **takes precedence over this exploratory brainstorming**.
- [GAME_DESIGN.md](GAME_DESIGN.md): core gameplay pillars and narrative tone.
- [PHASE16_PRODUCTION_UX.md](PHASE16_PRODUCTION_UX.md): current world-first inspection/notebook/terminal UX contract.
- [PHASE16_ONBOARDING.md](PHASE16_ONBOARDING.md): state-derived Field Brief implementation boundary.
- [ART_PIPELINE.md](ART_PIPELINE.md): 2D asset generation and technical presentation.
- [CONTENT_MODEL.md](CONTENT_MODEL.md): supported data-driven content fields.
- [RUNTIME_CONTENT_PACKS.md](RUNTIME_CONTENT_PACKS.md): actual current content-pack capabilities and limits.
