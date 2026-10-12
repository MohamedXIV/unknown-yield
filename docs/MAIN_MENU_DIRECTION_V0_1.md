# Main Menu Direction v0.1 — Propaganda Meets Reality

> **Status:** CHOSEN **CONCEPT C** for further design (user choice 2026-10-12). **v0.1 is a discussion/specification draft**, not approved final layout, completed art, gameplay code, or a new phase.
>
> **Parent exploration:** [UX/UI + Art Brainstorm v0-alpha](UX_UI_ART_BRAINSTORM_V0_ALPHA.md). **Binding world identity:** [WORLD_IDENTITY.md](WORLD_IDENTITY.md). **Next companion:** [HUD Direction v0.1](HUD_DIRECTION_V0_1.md).
>
> **Core promise:** *The state advertises a shining industrial future; the player will operate its demanding physical reality.*

## 1. Decision and scope

The player selected **C — Hybrid: Propaganda Meets Reality** over *A — full Propaganda Poster* and *B — Living Industrial Site alone*. These rejected-as-primary alternatives remain useful **ingredients**: a poster can be embedded in the landscape/intro, and the living site is the background layer of C. Do not reinterpret the choice as “make the whole menu a colorful poster” or “make every UI element a mechanical prop.”

**What is selected:** Two intentionally contrasting visual layers, a real industrial place behind a legible official menu, and visually coherent state identity.

**What remains open:** final scene/camera framing, art production method (curated scene versus pre-render/loop), side of the menu panel, detailed palette, typography, country/minister names, slogans, specific logo, sound and animation intensity, and exact save-menu interaction. The main menu itself has **not** been implemented by this document.

## 2. Three compositional layers

### Reality / actual industrial work

A wide, readable diesel-industrial installation on an alien planet: angular steel structures, reinforced walls, exhaust stacks, pipes, gantries, loading machinery, terminal silhouette, working lights and a few purposeful signs. This should resemble the game's own **fixed 2D top-down/three-quarter visual language**, not a new 3D game, glossy Atompunk city or a generic rusty wasteland.

The reality layer should show the player's **occupation**: extraction, routing, industrial transformation and off-world freight. Reserve calm negative space where the menu will sit. Machinery may move or emit very restrained smoke/steam, but motion must not make the entire background visually busy.

### Propaganda / the official image

Bright, hopeful mid-century government graphic treatment over or within the scene: a seal, patriotic production line, faded propaganda mural or factory-wall billboard, publication typography, directional poster composition. Official image can be **selectively idealized** while machines remain physical and worn.

Suggested sample copy (*not established canon*):

> THE FUTURE IS FORGED BY LABOR  
> COMRADE OPERATOR — YOUR ASSIGNMENT IS A HISTORIC HONOR  
> EVERY TON A VICTORY

Use only enough propaganda to establish tone. Avoid wall-to-wall textual slogans, direct copies of historical emblems, or anything that makes the world look cuddly/rounded.

### Interaction / the usable menu

A thin **official command plaque** with visible menu labels. Think painted enamel, steel nameplate, stamped section title and restrained edge trim — **not** six kilos of decorative bolts around each button. The buttons are ordinary accessible interface controls; they do not require elaborate mechanical levers.

### Draft hierarchy, not pixel-perfect layout

```text
+-----------------------------------------------------------------------+
| [STATE SEAL] PEOPLE'S EXTRAPLANETARY INDUSTRIAL DIRECTORATE            |
|               UNKNOWN YIELD              / official short motto       |
|                                                                       |
|     [COMMAND PLAQUE]                  DIESEL INDUSTRIAL PANORAMA       |
|     Begin Assignment (New Game)       tanks, terminal, gantry,        |
|     Resume Duty (Continue)           pipework, active freight        |
|     Personnel Archives (Load)         + government mural/signage      |
|     Operational Regulations          + subdued movement / haze       |
|     Credits                                                           |
|                                                                       |
|       build/version & authorized-operator line                         |
+-----------------------------------------------------------------------+
```

**Left vs right command plaque is not settled.** Choose after actual art composition at game-sized aspect ratios. Center-lower overlay is a fallback only if it does not block the scene’s best storytelling detail.

## 3. Player-facing states and truthful affordances

| State | Menu behavior to explore | Must not do |
| --- | --- | --- |
| Initial launch | Focus on **Begin Assignment (New Game)**; perhaps official short briefing | Force a long cinematic or block immediate play |
| Compatible local save exists | **Resume Duty (Continue)** becomes obvious; a small factual site summary *if actually available* | Invent save metadata, overpromise compatibility, or read the wrong content pack |
| No compatible save | Continue clearly unavailable or omitted with accessible explanation | Present a dead button |
| Start new expedition | Compact **Assignment Brief** introducing site/operator mission, then enter the world | Require multi-page bureaucratic setup or reveal hidden recipes |
| Load/archive | Clearly browsable **Load** function aligned with actual local save/content-pack behavior | Claim cross-device/cloud saves without implementation |
| Settings/help | Readable display/audio/input and reduced-motion controls consistent with current capabilities | Invent a future settings surface as though already shipped |
| Credits | Calm documentary/official acknowledgement visual language | Make attribution unreadable for immersion |
| Exit | Show **Quit** only on shells where exiting an application is meaningful; on web, use return/menu navigation | Pretend browser tabs can be closed reliably by a game control |

The current runtime already has browser-local, versioned saves and offline content-pack selection; this document **does not create** new persistence semantics or guarantee old saves remain compatible.

Possible menu wording:

- **Begin Assignment** — *New Game*
- **Resume Duty** — *Continue*
- **Personnel Archives** — *Load*
- **Operational Regulations** — *Settings / Help*
- **Credits**
- **Relinquish Post** — *Quit* (**desktop shell only**, if supported)

Make the function visible as well as the fiction label. No “guess which ideological euphemism means Load” puzzle.

## 4. Movement, audio and comfort

**Ambient world:** slow smoke/steam drift, small indicator lights, distant conveyor/crane operation or pressure release; no constant flashing, CRT scanlines, dramatic screen shake or per-item heavy motion.

**The menu:** title, selections and focus should stay visually stable. Opening an assignment brief can be a short deliberate reveal, always skippable/reduced-motion compliant. Keyboard focus/selection and high-contrast text matter more than period-authentic decoration.

**Sound exploration:** restrained industrial low rumble, mechanical creak, pneumatic release, distant official radio chime and possible propaganda/orchestral hint; avoid full-volume announcements on every pointer move. Silence/mute support and audio opt-in behavior follow actual platform capability.

**No false diegesis:** the menu can resemble a physical state instrument but must remain practical under mouse/keyboard, lower resolution and zoom/text scaling.

## 5. Visual continuity into play

Carry these **families**, not identical full-screen chrome, from Menu to HUD:

| Shared cue | Main Menu | HUD |
| --- | --- | --- |
| State identity | Seal, large formal type, motto, propaganda | Small site designation, concise dispatch headers |
| Material & accent | Industrial enamel/steel, state red/cream/yellow accents | Lightweight readable panel surfaces with very selective accents |
| Typography | Heroic display headline + legible options | Compact technical labels + strong numeric hierarchy |
| Fiction voice | Ceremonial patriotic welcome | Short official messages; **engineering truth is plain and accurate** |
| Motion | Scenic industrial ambience | Functional state/selection/production feedback only |

**The menu is ceremonial; the HUD is operational.** Do not let a menu art treatment consume half the gameplay screen.

## 6. Candidate art/UX references and what to extract

- **Frostpunk:** monumental industrial atmosphere and first-screen composition; not necessarily radial menu mechanics.
- **HighFleet:** serious hardware/command palette, physical instrument plausibility and audio cues; not its control complexity.
- **Mid-century industrial/space propaganda and pulp sci-fi:** illustrated heroic state messaging; **graphic layer only**, not base-machine silhouette.
- **Tropico / Helldivers:** official euphemisms and proud state voice; borrow the *rhetorical contrast*, not combat/campaign structures.
- **Papers, Please:** optional permit/stamp texture for secondary archives/brief screens, not endless document navigation.

These references are study prompts, not an art-license source or factual UI inventory. Use our own fictional symbols, shapes and assets.

## 7. Small design proof before production art

Compare at least a **16:9 desktop and a narrower aspect ratio** in static mockups **before** committing to a large illustrative menu scene:

1. Can someone tell this is a **factory/industrial discovery game** without reading the tagline?
2. Is the menu legible and keyboard navigable above a complex industrial panorama?
3. Is the propaganda/reality contradiction visible without becoming a visual joke wall?
4. Does the command plaque sit on the left or right more naturally for the final composition?
5. Can the same art direction carry across into actual gameplay sprites, not just title art?
6. Are motion-reduced and high-text-scale variants reasonable?

**Next design discussion:** 2–3 actual compositions exploring how C is framed, and a comparison against the HUD. **Not** permission to open tasks or begin implementation.

## 8. Status log

- **2026-10-12 — Chosen:** Concept **C / Hybrid: Propaganda Meets Reality**.
- **v0.1 — Proposed:** wide diesel-industrial scene; official propaganda overlay; compact command plaque; clear functional wording; restrained motion and sound.
- **Still open:** position of plaque, exact composition, live/curated/rendered background, graphic system, usability validation and final art execution.
