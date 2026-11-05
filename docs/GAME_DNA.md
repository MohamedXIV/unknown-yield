# Unknown Yield — Game DNA: The First Assignment & Planetary Atmosphere

**Status:** player-approved *experience direction* (5 November 2026); implementation planned, not completed. This document records the agreed next gameplay/identity track, without changing the accepted simulation, economy, materials, industrial behavior, or current UI reskin approval.

**Why this exists:** a newcomer should enter a living industrial assignment, learn one meaningful operation at a time, recognize the fictional Directorate's absurd personality, and see a planet whose dim atmosphere makes their factories visibly come alive. This track is not permission to turn Unknown Yield into a narrative campaign or a web dashboard.

## 1. Player experience: first contact with the Directorate

The player is an appointed **Comrade Director / Site Operator** in a state-run extraplanetary industrial expedition. The government is a fictional authoritarian, state-socialist industrial apparatus—not a modern private startup. Its ceremonial pronouncements glorify national production, labor and the leader, often claiming even familiar machines to be extraordinary achievements. The actual engineering world is serious, industrial, and sometimes dangerous.

The state can declare an ordinary Crusher "the apex of national scientific genius" as satirical **presentation**; the game must never claim it was scientifically invented just then or that a known recipe was discovered unless the simulation proves it.

Two voices stay distinct:
- **Official dispatch:** heroic, pompous, self-congratulatory, euphemistic, sometimes hilariously wrong about its own importance.
- **Engineering evidence:** concise and truthful about conditions, material quantities, hazards, blockage, failure, fuel and remedies.

Official rhetoric must never invent live numbers, spoil hidden outputs, erase material losses, or obscure a required action. Satire can have darker implications, but normal play stays focused on discovery and industry.

## 2. First-run experience: a playable appointment, not a tutorial corridor

Use the *existing* state-derived six-beat Field Brief in [PHASE16_ONBOARDING.md](PHASE16_ONBOARDING.md) as the gameplay basis. Expand its narrative framing into **The First Assignment**, with a short optional official appointment and a sequence of contextual, dismissible objectives.

- **One actionable instruction at a time.** Guidance should respond to real world evidence, not a "Next" button, elapsed time or fabricated scripted achievements.
- **The player can close/reopen guidance.** Closing help never grants a capability or skips a simulation milestone.
- **No recipe spoilers.** Teach how to choose an operation and read observed evidence, not which hidden input/condition will produce what.
- **Incidents interrupt only when real.** Existing recovery guidance takes precedence and resumes the normal brief afterward.
- **The completion goal is real first export.** Afterward, the normal open-ended game continues and the brief can become a short reminder of Discover → Experiment → Industrialize → Export.
- **No playable character, crew simulation, combat, cinematic lockout or time-gated training island.**

### Illustrative opening sequence (not a fixed script or final wording)

| Beat | Real player act / world-derived condition | Directorate framing | Equipment visibility |
| --- | --- | --- | --- |
| Appointment | Initial expedition, terminal and visible surface deposits | "You have been granted the honor of making our industrial destiny inevitable." | Show a basic Extractor and indispensable camera/inspection/safety tools. |
| First extraction | Actual Extractor placed on compatible deposit | "The nation's unrivaled ground-opening instrument has been authorized!" | Introduce Factory Shell construction. |
| First premises | Real shell placed; its interior can be opened | "By order of the Directorate: walls are now an approved scientific instrument." | Introduce the Crusher and necessary ports/ground belts as a coherent construction kit, not in a soft-locking order. |
| First functional route | Player connects machinery/ports and actual physical input flow begins | Celebrate the *transport* accomplishment, not a made-up product or recipe | Show relevant operation/setup controls and the notebook when they become useful. |
| First experimentation | A real experiment produces observation/evidence | "Your initiative has astonished the Scientific Commission, pending formal approval." | Notebook/evidence access promoted; do not reveal unreached knowledge. |
| First viable export | Actual product physically reaches/stages at terminal and ships | Excessive, cheerful state celebration of a tiny shipment | Full sandbox access continues, with later technology still governed by proven scientific/economic prerequisites. |

The precise unlock order can adapt to live build prerequisites: players must never receive a machine but be denied the ports/transport/fuel/recovery tools required to use it. Tutorials should be resilient to alternate valid solutions and returning expeditions; avoid requiring one exact fixed tool path. A suggested 30–45 minute opening is only a playtest hypothesis, not a timer or a mandatory target.

## 3. Two independent reasons equipment becomes available

**A. Operational authorization:** the government already possesses a mundane device or procedure but only permits the new site to operate it after a proven introductory task. This is a **new presentation-and-progression layer**, not a claim that science has been invented. It stages the build palette and reduces early visual/cognitive load.

**B. Scientific capability:** genuinely new machine/scan/terminal capability follows existing discovery, demonstrated operation, material properties, milestones, company R&D and physical imports. Keep these established evidence gates authoritative.

Important rules:
- New players see **a small useful palette**, not a wall of 30 padlock icons. Unlock groups/children organically using existing hierarchical tools; selected previews should explain authorization versus scientific requirements.
- **Do not** hide the full glossary by leaking secret names or outputs. Unseen advanced technologies may remain completely omitted until legitimately known.
- **Do not** remove maintenance, undo, cancel, existing-world inspection, necessary logistics, or recovery actions to manufacture difficulty.
- Authority to build must follow reliable **real gameplay state** (and authored prerequisites), not transient onboarding visibility. Derive from the authoritative snapshot where possible; persist only genuinely new independent progression state with explicit save migration.
- Revisiting an old save should restore permissions correctly; imported saves should not be forced to replay the opening.
- After initial onboarding, the existing evidence-driven progression remains the fundamental technology path. No new XP or unlock currency.

**Definition of success:** a new player can accomplish a first real extraction → factory shell → internal processing → transport → experiment → exported shipment without seeing the entire late-game catalog, while an existing progressed expedition retains its actual capabilities.

## 4. Main Menu: "Propaganda Meets Reality"

Use **Concept C**, already selected in [MAIN_MENU_DIRECTION_V0_1.md](MAIN_MENU_DIRECTION_V0_1.md). Do not reinvent menu identity.

- **Industrial reality:** a readable, grounded, three-quarter 2D installation on a dim alien world, with heavy machinery, terminal, gantries and a little restrained functional motion.
- **Official ideal:** selective mid-century space-program / industrial propaganda graphics, perhaps a seal, mural or poster, proudly selling a bright future.
- **Usable interface:** concise enamel/metal command plaque and conventional, legible controls. The menu is ceremonial; the HUD stays lightweight and world-first.

Recommended functional destinations:
- **Begin Assignment (New Game)**; with explicit slot creation and no accidental overwrite.
- **Resume Duty (Continue)**; load the designated most recently valid compatible expedition.
- **Personnel Archives (Load / Manage Saves)**; inspect real save metadata and choose a slot.
- **Operational Regulations (Settings / Help)**; the existing control and accessibility settings remain usable.
- **Credits**, as appropriate.
- **Quit** only in a native shell that can actually quit; never pretend a browser button can close an arbitrary tab.

The first-run introduction is brief, skippable and optional. Use truthful disabled states when no compatible save exists; do not invent cloud saves, artful but dead menu buttons, or invented site stats. Keyboard and mobile access, readable focus and reduced-motion behaviors matter more than ornament.

## 5. Multiple independent expedition saves

Current source reality: [apps/web/game/session.ts](../apps/web/game/session.ts) has one current browser-local SAVE_KEY per content pack, with historical single-save fallbacks. This track must provide **multiple independent slots**, without overwriting the legacy slot.

Requirements:
- Every expedition has a stable slot identity, editable human-facing name, content-pack fingerprint/version where relevant, save compatibility status and derivable last-played/last-saved metadata.
- Create, choose/continue, save, load, rename and delete slots safely; confirm destructive operations.
- Each slot carries its **own complete authoritative world**: machinery, physical cargo, discoveries, market, debt, imports, maintenance, terminal state and all other existing save truth. Game Configuration/preferences stay separate.
- Loading incompatible or corrupt saves is non-destructive and explained clearly; failed writes or migrations never overwrite the only good copy. Legacy one-slot data is detected and made importable/accessible without silent deletion or duplicate replay.
- Protect content-pack identity: switching runtime packs cannot silently load a mismatched world or merge incompatible saves. Do not claim cloud sync.
- Decide the actual slot count, autosave interval and backup method from storage limits and tests rather than hard-coding an unreviewed sacred number.
- Browser-local persistence is the baseline; inspect quota failures and errors honestly. Manual saves should remain available, with autosave only if reliable and compatible.

## 6. Planetary environmental identity: fixed, dim atmosphere first

The physical location should feel like an **alien industrial assignment**, not a generic green/gray grid. Many planets may have weak daylight, dark skies or unusually colored illumination. Start with **one** deliberate, playable planet environment. Multiple planets, procedural planetary generation and a day–night cycle are explicitly **deferred**.

Define a small **environment profile** that can eventually support:
- Terrain palette and geological variation (gray ash, muted rust-red or other original material schemes).
- Ambient light color and intensity (cold dusk, gray haze, subdued warm scatter).
- Minimal atmospheric haze and distant color grading.
- Industrial fixture light colors and intensity bands (terminal floodlights, machine operation lamps, furnace glow, emergency warnings).
- Readability and quality settings/fallbacks.

**Initial target:** permanently dim daylight / cold twilight, with mostly industrial lights giving the installation its warmth and character. The player should notice that *building industry makes the site glow* without an artificial time cycle. Keep it visually distinct from resource deposits and do not hide ports, cargo, placement previews or the true status of equipment.

Profile data is a presentation source, not a new simulated planet mechanic; no planetary gameplay modifiers, different physics, world generation or new save truth unless independently justified later.

## 7. Phaser 4 lighting: small, measured, real

Phaser 4 exposes dynamic 2D lights and setLighting() for game objects in **WebGL**, with optional normal maps and self-shadows; see [official Phaser rendering concepts](https://phaser.io/tutorials/phaser-4-rendering-concepts) and [Phaser 4 light API](https://www.phaser.io/oss/docs/api-documentation/class/gameobjects-light).

Current game source [apps/web/game/world.ts](../apps/web/game/world.ts) draws much of its scenery through Phaser Graphics. Do not assume that enabling scene lights magically provides production-quality metal, depth or shadows.

Begin with a representative **limited-light scene**:
1. One deliberately dim ambient profile.
2. A small number of anchored world-space lights tied to actual fixtures or observable machine states (terminal, working furnace, warning lamp), without leaking secret processes.
3. Test the correct rendering path and assets. Add normal maps / self-shadow only where they improve real visible detail.
4. Ensure world lights are not mistakenly parented into unsupported Containers and the game remains readable under WebGL and an honest Canvas/unlit fallback.
5. Measure frame pacing, draw calls/batching, memory and mobile/browser behavior against the unlit baseline. Lighting can break rendering batches; do not blanket-enable it across thousands of objects without profiling.
6. Offer practical brightness/quality controls if the actual prototype demonstrates a need. Respect reduced-motion preferences and avoid flashing hazards that impair legibility.

A successful pass adds atmosphere and makes functioning machines feel alive **without** a day–night simulation, mass asset replacement, or unmeasured performance regressions.

## 8. Personality through real feedback, not fake progression

The Directorate can issue a ceremonial dispatch when a real fact occurs:
- First built extractor; first constructed factory shell.
- First physical flow through a factory.
- First confirmed observation.
- First legitimate exported shipment.
- First recovery from an actual incident.

No universal automatic popups: use restrained radio bulletins, brief official notices and optional archive history so they never obscure a production decision. Dispatch copy should draw on authoritative event IDs or public snapshot facts, remain replay-safe after save/load, and be localized/display-only. Engineering diagnostics remain accurate; a fake prize, material grant, blocked recovery action or hidden recipe hint is forbidden.

Illustrative line: "The Leader's vision has provided your site with the Revolutionary Crushing Apparatus. Maintenance manual available upon request." The machine's real authorization may be new to this expedition, while the equipment itself is mundane to the world.

## 9. Source-of-truth contracts and non-goals

Binding existing documents remain: [GAME_DESIGN.md](GAME_DESIGN.md), [WORLD_IDENTITY.md](WORLD_IDENTITY.md), [ECONOMY.md](ECONOMY.md), [DECISIONS.md](DECISIONS.md), [SIMULATION.md](SIMULATION.md), [PHASE16_ONBOARDING.md](PHASE16_ONBOARDING.md), [MAIN_MENU_DIRECTION_V0_1.md](MAIN_MENU_DIRECTION_V0_1.md) and [DATA_DRIVEN_INDUSTRIAL_BEHAVIOR_V1.md](DATA_DRIVEN_INDUSTRIAL_BEHAVIOR_V1.md).

**Not in this effort:** new factory recipes, additional planets, day–night calendar, generic tech tree or XP, retcon of advanced research/physical fuel rules, UI reskin, new combat/survival systems, rewrite of sim-core execution, forced scripted quest economy, or a second authoritative source of inventory/knowledge.

The active UI-art PR #339 and machine-art PR #291 are separate review/approval gates. This gameplay track should branch from main; it neither absorbs nor silently merges either PR.

## 10. Human acceptance questions

Review a real fresh expedition with the player:
1. Do the first five minutes immediately communicate the state-industrial setting and the next practical action?
2. Can the player build and export using only real sim commands, without learning a secret recipe from guidance or hitting a missing-tool dead end?
3. Are the menu and save slots fully usable on desktop and touch, with old saves protected?
4. Does ordinary authorization feel like a hilarious bureaucratic ceremony, while research still feels like a genuine discovery?
5. Does the dark planet make machinery more expressive without compromising building, routing and cargo readability or frame pacing?

Machine-reaction correctness, conservation, hidden knowledge and cross-version saves remain mandatory test boundaries. Human taste and physical device performance must not be marked PASS by automated assertions alone.

**Execution:** see [FIRST_ASSIGNMENT_ROADMAP.md](FIRST_ASSIGNMENT_ROADMAP.md).