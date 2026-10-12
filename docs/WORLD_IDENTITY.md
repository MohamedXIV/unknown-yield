# World Identity & Style Bible — Accepted Direction

**Status:** approved design direction, 2026-10-12. **Implementation status:** art, fiction copy, menus and asset naming remain to be authored/integrated. This is not a claim that existing prototype visuals or content have been replaced.

**One-line brief:** **A harsh diesel-industrial state expedition sold to its citizens through colorful mid-century space-age propaganda.**

**Exploratory companion (not adopted decisions):** [UX/UI, Game Art & Experience Brainstorm v0-alpha](UX_UI_ART_BRAINSTORM_V0_ALPHA.md) preserves reference games, candidate screen compositions, artistic approaches and open questions without overriding this approved direction.

**Cross-screen working design (not implemented):** [Shared UI Visual Grammar v0.1](SHARED_UI_VISUAL_GRAMMAR_V0_1.md) proposes a unified palette, typography, surfaces, status semantics and UI/art mockup plan while preserving this accepted world identity.

**Chosen conceptual Main Menu: [C — Propaganda Meets Reality (v0.1)](MAIN_MENU_DIRECTION_V0_1.md) and [operational HUD direction (v0.1)](HUD_DIRECTION_V0_1.md) are under design review. The companion [Company Terminal direction (v0.1)](COMPANY_TERMINAL_DIRECTION_V0_1.md) explores a more theatrical institutional console tied to real freight and obligations; [Field Notebook v0.1](FIELD_NOTEBOOK_DIRECTION_V0_1.md) explores quieter earned scientific records. They do **not** change the accepted physical Dieselpunk/propaganda split or claim finished art.

## 1. The three visual layers

| Layer | Accepted language | Avoid |
| --- | --- | --- |
| **Physical world** | **Authoritarian Dieselpunk / heavy industrial retrofuturism**: grounded machinery and serious, functional installations | Atompunk's predominantly cute, rounded, glossy domestic futurism; generic scrapheap/post-apocalyptic junk |
| **Government's self-image** | **Mid-century propaganda poster art** fused with **pulp science-fiction illustration** and selective space-age advertising motifs | Treating cheerful posters as the physical-world art style; copying a real regime's emblems or historic posters verbatim |
| **Alien environment** | Unfamiliar geology, phases, emissions and material behavior contrasted against standardized human infrastructure | Merely recoloring familiar Earth ore; noisy fantasy VFX on every object |

The reference terms describe different traditions, not synonyms. **Dieselpunk** governs machinery and architecture; **retrofuturism** is an umbrella; **pulp sci-fi** describes part of the painted illustration language; **socialist industrial/space-program propaganda** informs graphic rhetoric and composition. **Atompunk/Raygun Gothic** may inform *printed graphics only* and are **not** the game's base-world silhouette contract.

Art direction is now selected; individual colors, logos, final country names, characters, material names and exact asset designs are still authorable choices. This does not change the fixed 2D, top-down/three-quarter view or the 3D-blockout-to-2D-sprite production approach.

## 2. Physical industrial design

- **Silhouettes:** rectilinear plants, massive machinery, tanks, pistons, compressors, hard-edged housings, reinforced gantries, heavy pipework, rivets, service hatches and visible mechanical function. Round parts belong where engineering calls for them, not as an all-purpose friendly shape language.
- **Surface language:** painted steel, cast iron, enamel labels, ceramic insulation, rubber hoses, wear from operation and repair. Keep purposeful manufacturing detail; **not** wall-to-wall rust, trash, desaturation or damage for its own sake.
- **Architecture:** standardized state-built industrial families with repeated module shapes, production stamps, official serial plates, numbered doors, hazard lines, utilitarian control consoles and occasional monumental state signage.
- **Candidate palette (direction, not mandated hex codes):** coal/graphite, gunmetal, military olive, faded industrial cream, oxide brown; restrained state crimson and safety yellow/orange; measured cold electric accents for instruments; alien materials carry the most unfamiliar hues.
- **Operational readability is non-negotiable:** ports and routing must be legible at play zoom; active/idle/damaged states and conveyed material classes must distinguish by shape, motion, labels and effects, not color alone. Restrict grain, grime, bloom, film treatments and flicker if they interfere with inspection.
- **Progression in appearance:** old, standardized human machinery can progressively acquire strange locally discovered materials and new processing components. Visual evolution should reflect actual capability, not arbitrary sci-fi glow.

Do **not** require photoreal 3D lighting, a runtime engine switch, rotating camera assets, or unique AI-generated animation frames for every state. Refer to [ART_PIPELINE.md](ART_PIPELINE.md) for pipeline, masking and validation.

## 3. The fictional state, its industry and its contradictions

The expedition is provisionally run by an **authoritarian, state-socialist industrial apparatus** whose nominally civilian production directorate may be led by generals or commissars. The player's title is an appointed **site operator/director**, not an independent startup founder. Names of the country, ministry, leader and officers are **not canon yet**.

This is **satire with an underlying serious world**:

- Official copy treats work, quotas, sacrifice, unity, the flag and industrial science as historic patriotic victories. Address the player as a *Comrade Operator*, *Comrade Director*, or another context-appropriate labor title.
- The government insists everything is for the People while its procurement bureaucracy bargains on export compensation, imposes obligations, takes credit for discoveries and hides failures behind self-congratulatory terminology.
- Management may have military ranks; a recurring dispatcher/commercial officer can provide a recognizable bureaucratic voice without demanding cast simulation, cinematics, portraits or a dialogue-tree campaign.
- Corruption, coercion and censorship can emerge in later dispatches, incident classifications and requisition notices. Keep room for genuine darker implications; **do not make the entire game a gag machine**.
- Favor fictional insignia, dates, organizations, designations and typography over reproducing real totalitarian symbols or specific historical propaganda artwork.

**Two simultaneous voices:**

1. **State broadcasting voice:** bombastic, ceremonious, triumphalist, euphemistic, occasionally absurd. *“The Directorate applauds your unplanned advancement in rapid disassembly science.”*
2. **Engineering/knowledge voice:** precise, causal, unambiguous and genuinely useful. *“Pressure exceeded containment. Reactor destroyed. 420 units of gas entered the isolation vessel.”*

**A joke must never disguise a required action, invent a game-state fact, erase losses or leak an undiscovered recipe.** The sim and public evidence are authoritative; fictional spin is presentation. Humor can also come from real, explainable industrial mishaps.

## 4. Graphic design: the state's poster versus its actual factory

The *promised future* appears on posters, broadcast title cards, loading art, state seals, instructional placards, shipment celebrations and occasional large billboards:

- bold diagonals, constructivist-inspired layout, heroic low-angle workers/engineers, hard shadows, strong limited poster inks, simplified planetary/rocket silhouettes;
- optimistic, heroic, almost impossibly spotless official illustrations, compared with the working game's practical, worn machinery;
- display typography with disciplined hierarchy, technical stencil/serial type, stamped approvals and large slogans;
- persuasive slogans such as **“TO THE STARS THROUGH LABOR”**, **“EVERY TON A VICTORY”** and **“PRODUCTION IS PATRIOTISM”** are *examples*, not fixed canon or a requirement for constant on-screen text.

1950s–1960s consumer-space graphics and Raygun Gothic can inform **propaganda illustrations**, but should **not** turn factories, instruments or architecture into shiny toy rockets. Pulp illustration and state propaganda overlap in the moodboard but are **not one historical style**; reference them intentionally.

## 5. World-first menus and onboarding

### Main menu (target, not yet implemented)

- A strong 2D illustrated industrial site/orbital installation, official state insignia, restrained animated equipment/smoke, and a propaganda headline.
- Clear and conventional interaction labels even when phrased in-universe: **Begin Assignment (New Game)**, **Resume Duty (Continue)**, **Personnel Archives (Load)**, **Operational Regulations (Settings/Help)**, **Relinquish Post (Quit)** where the platform permits.
- No fake management SaaS shell, card-grid homepage, or obligatory full-screen document browser. The world remains the primary play surface; React is an in-game interface layer.
- Legible typography, clear focus/hover/disabled states, keyboard usability, reduced-motion support and minimal eye-straining noise matter more than period-authentic clutter.

### First assignment (target framing for existing onboarding)

Reframe the existing **Phase 16 state-derived Field Brief** as a progressive appointment from the Directorate, **not** a lengthy mandatory tutorial level:

1. official arrival/assignment, camera and extractor;
2. physical materials and connecting a small factory;
3. first uncertain experiment and the player's actual observations;
4. notebook/evidence, factory interior/exterior and preserved buffers;
5. first physical export and a disproportionately triumphant state bulletin;
6. open-ended directive inviting further discovery, **not** a revealed recipe.

Use one actionable instruction at a time; let players dismiss/reopen it. Incidents interrupt with truthful recovery instructions. **Never grant or fake sim progression through narrative scripting**, and do not force a cinematic or character/crew system.

## 6. World naming and content identity

Everything the player sees should feel like a product of a coherent bureaucracy and industrial history, not surviving placeholder strings. Distinguish:

| Layer | Purpose | Example (*fictional placeholder*) |
| --- | --- | --- |
| **Stable internal ID** | Sim, save and references; must survive display renames | `orbital-propellant` |
| **Laboratory designation** | Technical classification on dossiers/labels | `MK-OIL/45` |
| **Authorized common name** | Readable equipment/product name used in UI | `Varkov-45 Heavy Propellant` |
| **Unofficial shop-floor name** | Rare field slang with personality | `Varkov's Blood` |
| **State slogan** | Poster/news copy, not gameplay truth | `The fire that carries the Union to the stars` |

All example names above are **proposals, not approved canonical new material identities**. Do not replace IDs, secret recipes or balancing data merely to rename a product.

Design families with shared prefixes, model numbers, typeplates, inventors or institutes, dates/series and equipment-manufacturer marks where useful. Different names should imply plausible provenance and relations (e.g. experimental chemical series -> certified industrial variant -> field nickname). **Not every belt or screw needs lore.** Reserve detailed dossier history for discoveries, signature machines, important advanced supplies and institutional landmarks. Facts about previously unknown alien materials must emerge only after evidence.

**Important current fuel distinction:** ordinary `Save.fuel` is an abstract **company operating allocation**, **not a transported physical oil**; advanced propellant and research coolant *are* physically imported materials held in terminal modules. A future presentation name such as **State Operating Allocation** can clarify the first without changing semantics. Use laboratory/public names for physical fuels; never claim that renaming the allocation has implemented a local fluid/power distribution network. See [PHASE15_FUEL_PROGRESSION.md](PHASE15_FUEL_PROGRESSION.md).

### Data-driven boundary and current gaps

- Implemented today: stable IDs, localization-key-based material/machine labels, validated content models, development Content Studio and importable content/locale packs.
- Current limitation: runtime art selection still involves a fixed asset registry in `apps/web/game/art-assets.ts`; **data-driven swapping of arbitrary artwork and animations is a future direction, not an implemented Content Pack feature**.
- Target: authorable display names, classification, authored flavor, poster/logo references, machine families and art/animation assets as **presentation references** where justified. Prefer scoped manifest metadata over a generic new modding framework.
- Source separation remains strict: **authored hidden truth ≠ discovered player knowledge ≠ propaganda fiction**. Fictional state copy cannot pre-expose real hidden outputs.
- Palette, names, illustration and UI text may evolve through content; gameplay numbers must remain validated simulation/content data, not copy or renderer behavior.

## 7. Scope and proof

**Locked:** Dieselpunk physical-world baseline; colorful mid-century propaganda/pulp layer; authoritarian state-industrial satire; truthful engineering diagnosis; world-first UI; stable IDs separated from names. All remain compatible with current simulation architecture and 2D pipeline.

**Not locked:** proper nouns, concrete poster art, country insignia, precise palette/typography, any example `Varkov` fuel, final material catalog, art asset files, a story campaign or new performance targets.

This document **does not authorize** a new epic, lore system, dialogue engine, campaign, 3D runtime or mass content rename. Next implementation choices should be driven by human comprehension/playtesting and a small *representative* visual scene (factory shell, machine, terminal, material, UI, propaganda surface), not by accumulating features or AI art without checks.

Related: [GAME_DESIGN.md](GAME_DESIGN.md), [ART_PIPELINE.md](ART_PIPELINE.md), [CONTENT_MODEL.md](CONTENT_MODEL.md), [PHASE16_ONBOARDING.md](PHASE16_ONBOARDING.md), [DECISIONS.md](DECISIONS.md).
