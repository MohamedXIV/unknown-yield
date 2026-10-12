# Field Notebook Direction v0.1 — The Expedition's Evidence Archive

> **Status:** EXPLORATORY DESIGN DRAFT — 2026-10-12. This is a proposed **UX/art/voice direction**, **not** a completed Notebook overhaul, new recipe-discovery mechanic, art implementation, additional roadmap phase or final screen spec. It follows the [Main Menu C](MAIN_MENU_DIRECTION_V0_1.md), [HUD](HUD_DIRECTION_V0_1.md), [Factory Inspector](FACTORY_INSPECTOR_DIRECTION_V0_1.md) and [Company Terminal](COMPANY_TERMINAL_DIRECTION_V0_1.md) v0.1 studies.
>
> **Accepted constraints:** [WORLD_IDENTITY.md](WORLD_IDENTITY.md), [PHASE16_PRODUCTION_UX.md](PHASE16_PRODUCTION_UX.md), [PHASE15_KNOWLEDGE_GRAPH.md](PHASE15_KNOWLEDGE_GRAPH.md), [PHASE11_HAZARD_EVIDENCE.md](PHASE11_HAZARD_EVIDENCE.md), [PHASE16_ONBOARDING.md](PHASE16_ONBOARDING.md).
>
> **One-line design brief:** **An industrial scientist's evolving field journal, issued by an authoritarian Directorate — a record of experiments the player actually performed, not a wiki of answers the game has authored.**

## 1. Why the Notebook matters to the game's identity

Unknown Yield's central reward is understanding an unknown physical world. When someone tries a machine setup with Ore A, changes conditions, witnesses an unexpected product or a disastrous accident, the Notebook should convert that **earned observation** into useful memory.

The Notebook should make the player feel:

- **curious:** there may be more to investigate, even after a result;
- **competent:** proven discoveries can be recognized and reused;
- **cautious:** physical incidents teach real constraints;
- **embedded in a fictional state:** evidence is recorded under proud, administrative Directorate classifications, with occasional hand-marked technician notes;
- **unspoiled:** unseen materials, hidden recipe outputs, solution IDs and fully authored process chains never materialize as readable spoilers.

**Primary player question:** *“What have we actually learned, what remains unresolved, and what is a sensible next experiment?”*

### The visual/narrative contrast

- The **state cover** calls it the *Directorate Registry of Applied Materials*, gives it a government seal and optimistic industrial language.
- The **inner log** is precise, restrained, experimental, and occasionally stained, annotated or stamped with a hazard warning.
- The **player's real knowledge** remains the only source of technical claims. Official commentary can be boastful but never more omniscient than the player snapshot.

Candidate line (*not canon*): **“KNOWLEDGE THROUGH LABOR. COMRADE, FILE YOUR OBSERVATIONS.”** This gives the setting a voice without forcing document-processing gameplay.

## 2. Current implementation: audited boundaries before ideation

| Current element | Actual data / implementation | What v0.1 may do — and may **not** assume |
| --- | --- | --- |
| Knowledge filter strip | `All / Open / Hazards / Confirmed`; `knowledgeVisible` from `apps/web/game/production-ux.ts` | Preserve the familiar four filters; changes in grouping/search/sorting are **future UX proposals** |
| Summary | `knowledgeOverview(snapshot)` counts hinted entries + visible branch insights as Open, confirmed entries, hazard evidence and findings | Never fabricate research progression, a “percent complete” score or a number of remaining secret reactions |
| Confirmed experiment | `KnowledgeEntry` can expose actual known `outputId`, `textKey`, operation, input, setup, `initial`, optional `observedAt` world point | The real result is known, with initial methods distinct from learned experiments; do not infer processing recipes for all other setups |
| Hinted / unresolved experiment | Same entry has `state: hinted` but **does not expose the output ID** | Show attempted known input / operation / setup and `Outcome unconfirmed`, **not a silhouette or hidden product name/quantity** |
| Knowledge insights | Phase 15 public `knowledgeInsights` gives known target material, kind `property / branch / opportunity`, localized text; authored `requires` trigger is removed from `PlayerSnapshot` | A branching clue can indicate uncertainty **without** exposing reaction IDs, trigger rules or undiscovered materials |
| Hazard evidence | Learned only after an authored incident physically occurs; `hazardEvidence` exposes observed class, effect/evidence, real experiment context and bounded safer-next-test hint | Technical accident record persists even if the physical machine is repaired. **Never show unobserved hazard catalog** |
| Saved/public state | Save has knowledge and evidence; projections derive public cards; observation `observedAt` is an optional **world point**, not a timestamp | Do not invent trial date, exact machine linkage, full chronological session history, provenance or replay if not actually available |
| Existing panel | `apps/web/components/GameClient.tsx` already renders insight, hazard and experiment cards with localized fields; Phase 16 added a narrow status and filter strip | Reorganize presentation first. No second authoritative research database, offline search index, lab notebook editing or story system |

**Additional nuance:** `SensingObservation` exists in the public snapshot as a separate scan/probe signal/depth observation type. Integrating survey maps into the Notebook is a **possible future UX question**, not evidence that all scanned data already appears here or that sensing reveals hidden material IDs.

**Baseline for this review:** live `main` at `af88c1a0`. The code and documentation were inspected for design; no browser visual test or new sim verification was run.

## 3. The proposed visual identity: a field dossier, not a fake e-book

### Physical design vocabulary

- State-issued cover/heading: enamel-clad laboratory binder, archive number, muted seal and severe type. Could be a fixed pane overlay rather than literally a book model or page-turn animation.
- Scientific record area: light, clean technical stock or dark instrument inset; tab separators, equipment-line schematics, grid/ruled note motifs and small stamped classification tags.
- Optional graphic touches: an experiment marker, restrained material specimen illustration, official filing stamp, tiny safety pictogram, pencil annotations for *visible in-fiction tone*.
- Contrast **institutional print** with **operational readability**: muted slate/olive/cream, limited oxide red and amber for hazards, reserved alien-color accents for *known* material families.

### What not to borrow

- **Papers, Please**: take its bureaucracy and strong document taxonomy; do **not** recreate tedious document sorting, rubber-stamping every result or tiny unreadable text.
- **HighFleet**: take rigorous technical markings and purposeful instrumentation; avoid overloaded military control panels.
- **Against the Storm**: take content scanning/clear hierarchy; never expose its kind of complete recipe lookup when the player's data does not permit that.
- **Myst-style journals / investigative research notebooks** (optional mood reference): take emotional satisfaction from revisiting observations; avoid turning this into a separate puzzle adventure.

**Avoid:** polished Atompunk cheerful UI as the standard lab surface, endless parchment texture, bloated full-screen Wiki, a sprawling knowledge graph of all authored nodes, or paragraphs of flavor replacing measured facts.

## 4. Information hierarchy — four filters remain intact

These **filters are currently implemented**. Grouping/ordering within them is part of this proposed v0.1 concept and is not a claim of existing UI behavior.

| Filter | What it should communicate | Source boundary |
| --- | --- | --- |
| **All** | Known material findings, confirmed/unresolved experiments and observed hazards together | Public evidence and known material IDs only |
| **Open** | Hinted experiments + visible `branch` insights; opportunities for curiosity | Do not add speculative hidden reaction nodes, unknown product previews or unseen hint catalog |
| **Hazards** | Actually encountered danger, evidence of its physical cause and safer-next-test hint | Only persisted `hazardEvidence` shown in snapshot |
| **Confirmed** | Earned confirmed experiments/known initial methods + non-branch public material findings | Distinguish “initially known method” vs “experimentally proven” via `initial` |

Phase 16's `knowledgeOverview` summary is useful, but **“Open” is not a queue of mandatory quests**. A hinted experiment may require more interpretation; a branch clue may not indicate a single promised recipe. Do not use `0/100` discovery-completion bars.

### Entry taxonomy / visual badges

- **Known Method** — authored to be initially available; neutral stamped label, **not** counted as a new discovery.
- **Confirmed Observation** — process and output actually confirmed by playable evidence; technical green/steel accent, exact available experiment context.
- **Unresolved Trial** — `hinted` experiment with input / operation / setup but unknown outcome; dotted or open icon; **not** a “locked mystery item” with a revealed outline.
- **Material Finding** — `property`, `branch` or `opportunity` insight tied to a **known** material; avoid treating the word “opportunity” as a guaranteed live Corporate Order.
- **Hazard Report** — real occurred incident, correct known physical evidence and available safer hint; strong but non-flashing safety accent.

Never treat these classifications as new simulation statuses or new persisted records unless a later implementation specifically earns them.

## 5. Proposed default composition — Compact Field Journal (candidate A)

An efficient **edge/overlay dossier** subordinate to the living Phaser world:

```text
  +------------------------------------------------------------+
  | [DIRECTORATE EMBLEM] FIELD NOTEBOOK / EXPEDITION F-01       |
  | Verified observations from your own operations             |
  |                                                            |
  | OPEN 3  ·  CONFIRMED 2  ·  HAZARDS 1  [examples only]       |
  |                                                            |
  | [ All ]  [ Open ]  [ Hazards ]  [ Confirmed ]                |
  |                                                            |
  | RECENT / RELEVANT EVIDENCE                                  |
  |  [!] SAFETY RECORD                                          |
  |      Pressure event observed in actual experiment          |
  |      Known setup ...  [Read Evidence]                      |
  |                                                            |
  |  [?] OPEN BRANCH                                            |
  |      Known Ore A has unresolved thermal behavior           |
  |      [Review Known Trials]                                  |
  |                                                            |
  |  [✓] CONFIRMED EXPERIMENT                                   |
  |      Known Input + Operation + Setup → Known Result         |
  |      [View Record]                                          |
  |                                                            |
  | [Close / Return to Factory World]                           |
  +------------------------------------------------------------+
```

**Wireframe content is illustrative**, not a snapshot quote or proof that actions such as `Read Evidence` and `Review Known Trials` are currently implemented. A visible action requires a real UI behavior or must be omitted when this advances to implementation.

**Leading default:** concise file header, exact filter strip, compact card list, **one expansion at a time** to inspect process details. Don't waste most of the screen on a thick steel book spine or mandatory animated page flip.

### Suggested short summary, not a theatrical notification

An **evidence summary** from `knowledgeOverview` (real counts) is the first UI hierarchy. An observed accident can rise to top *while relevant*, but do not invent a generalized hazard severity index without factual backing.

The Field Brief's onboarding step should lead directly to the same actual evidence panel and then let the player return to the world. The Notebook **must not automatically close a research branch** because a government congratulations banner appears.

## 6. Secondary exploration — Material Dossier (candidate B)

**Material-index view** groups only the **known evidence** related to an already-known material, instead of simply providing an authored “all properties” encyclopedia.

```text
  MATERIAL FILE: [Known Material Name] / LAB CODE (if authored)
  STATUS: IDENTIFIED (only if public known)
  OBSERVED PROPERTIES: [visible `property` findings only]
  ASSOCIATED TRIALS:  [public confirmed/hinted entries, accurately linked]
  OPEN BRANCHES:      [visible material-targeted `branch` insights]
  HAZARD EVIDENCE:    [encountered incidents, when related and public]
  STATE MEMORANDUM:   “Excellent scientific progress, Comrade.” [optional]
```

A material can have technical designation + authorized codename + rare shop-floor nickname once those **presentation fields are authored**, but display names are independent of stable IDs. The example `MK-OIL/45`/`Varkov-45` is **not a canonical material** or an automatically discovered attribute.

**Critical technical nuance:** public insight `materialId` is a known **target material**; hinted experiment `inputId` is a known **input material**. Do **not** link a guessed output material to a hinted trial. Grouping by input and explicitly known outputs is safe; any “related results” network needs proven relationships and must not imply missing undiscovered products.

**Material file can be useful later**, but making it the initial default might imply complete classifications where the sim only knows fragments. Best explored as an optional drill-down.

## 7. Exploratory option — Partial Research Map (candidate C)

A spatial relationship diagram could be satisfying **only if it is generated from the player's actual known observations**, never from an authored total tech tree.

Candidate bounded nodes:

- company-known material identities and observed characteristics;
- confirmed input → operation/setup → known output connections;
- hinted experiments that terminate at a **question mark**, *not* a silhouette of hidden output;
- genuinely visible branch/opportunity hints, without a promise of exact solution;
- observed hazards that lead to the correct **known input/setup** and safer test hint.

**Do not** draw undiscovered materials, all combinations, unearned recipes, inferred transmutations, or “complete 80% of science” goals. Large graph rendering, layout storage, edge semantics and authoring would add actual scope. **C is deliberately deferred** unless playtests demonstrate text/card navigation cannot communicate enough.

This is **not** a request to implement a research tree, RPG skill nodes or a second technology progression subsystem.

## 8. The Notebook ↔ World ↔ Terminal loop

The three contexts should support *one industrial thinking process* without inventing mechanics.

### After an experiment

`Run a real machine with selected input/operation/setup → sim updates authoritative evidence/knowledge → Notebook shows only that new public evidence → optional player returns to same world location if the public location exists.`

A `KnowledgeEntry.observedAt` is a **point**, not a timestamp. “Jump to observed coordinates” is a **proposed navigational affordance**, subject to checking camera and map/selection safety. Do not invent a trial replay or timeline.

### After an incident

`Hazard actually occurs → technical machine recovery remains in the Factory/Machine Inspector → its learned evidence persists in Notebook → user may compare known safer setup → resume testing physically.`

Notebook is **memory**, not the command interface for repairing machines. Hazard evidence is permanent in save even if active lockout is cleared.

### After a new opportunity

`New known material/property evidence → possible Market listing/milestone/Directive becomes eligible on its own authoritative rules → Terminal reports that genuine offer → player may consult Notebook to plan the next real experiment or production route.`

The Notebook cannot issue an order to market, grant fuel/allocations, or make a company-known unknown material appear. **Insight kind `opportunity` is a research insight, not itself an active market offer**.

### Onboarding intersection

The existing Phase 16 Field Brief calls for Notebook review once non-initial knowledge is earned, before factory closure and first physical export. The research surface should teach the *epistemic rule* (“only observed outcomes are facts”), not prescribe an authored recipe. The help beat is interruptible and can be dismissed/reopened.

## 9. Satire and scientific integrity — how much politics belongs here?

The **Company Terminal** is where bureaucratic comedy can be loud. The **Notebook** should be a quieter scientific refuge, with only occasional state artifacts:

- Archive cover: “CENTRAL DIRECTORATE — INDUSTRIAL OBSERVATIONS.”
- Confirmed experimental report: **“FILED FOR NATIONAL SCIENCE.”** Actual output/result follows in plain terms.
- An accident: official rubber stamp **“UNSCHEDULED STRUCTURAL REORGANIZATION.”** Beneath it: *true physical incident, containment evidence, safer next test*.
- A censored-looking border or black bar may be decorative **only**. It must not conceal public technical information or imply a revealed-but-redacted secret outcome.
- Personal “technician marginalia” should use **authored flavor** if used; it must not claim the player manually wrote a note or learned a fact not in the sim.

The institution claims ownership of knowledge. The player actually earns knowledge by testing the world. That tension can grow over time without needing a narrative campaign, censorship mechanic or interactive bureaucracy simulation.

## 10. Visual art, media and micro-feedback

**Dossier art** should echo our industrial environment at the same quality level, without committing to an expensive artwork-per-record pipeline:

| Art element | Direction | Production / truth guardrail |
| --- | --- | --- |
| Record frame | fine lines, enamel header, muted paper/technical panel insets | lightweight DOM/CSS, readable on dark/bright displays |
| Icon family | stamp, test tube, material phase, hazard, factory port | icons must have text equivalents; no “unknown chemistry” decorative spoilers |
| Material specimen | small 2D approved sprite/crop/render for **known** material | existing art registry limits runtime pack substitution; not implemented |
| Hazard illustration | local real machinery/containment silhouette or stamped schematic | depict correct known hazard class; avoid arbitrary fake explosions |
| Knowledge relation | short input → operation → known output graphic with clear arrow | hinted trial has **unknown result**, and unknown IDs absent |
| Government graphics | small archive seal/official registration number when available | no invented persistent registry serial meaning; abstract design can be decorative |
| Motion | brief new-record highlight, transition from summary to expanded card | no flashing text, CRT noise, fake “scanning to reveal” chemistry, or long page flips |

Avoid UI art that is dramatically more polished than the actual world assets; the references and 2D blockout pipeline should inform both consistently.

## 11. Data and content authoring boundaries

- **Simulation truth:** stable reaction/material IDs, actual `Save.knowledge`, `Save.evidence`, learned `hazardEvidence` and real public projections.
- **Player-facing data:** localized name/text keys, known material identities, visible `knowledgeInsights` and the evidence cards that exist.
- **Presentation:** fiction heading, stamps, journal composition, optional authorable report flavor and asset references — only where supported by current or explicitly scoped future content schemas.
- **Unknown truth:** hidden authored alternatives, reaction IDs, acceptable property-directive solutions, undiscovered outputs and unobserved hazards **must not** enter a UI component, search index or static graphic.
- **No new persistence promise:** notebook personal annotations, bookmarks, pinned trials, written hypothesis text, timeline or a permanent graph view **are not present features**. If later wanted, define local vs saved semantics rather than quietly adding a second knowledge state.

A data-driven laboratory designation or nickname is **display metadata**, not a safe reason to rewrite IDs or save schema. Stage rich fiction as authored nonauthoritative text; never let a content pack give away experimental truth before public evidence.

## 12. Three candidate layouts and proposed blend

| Candidate | What the player sees | Advantages | Risks |
| --- | --- | --- | --- |
| **A — Compact Field Journal** (leading everyday default) | Small panel, four filters, actionable evidence cards, expansion on selection | World-first, easy to scan, matches existing UI architecture | Flat card list may become slow after many discoveries |
| **B — Material Dossiers** (optional depth) | A known material page with only its known related observations, branch hints and hazards | Scientific identity, lore, equipment/material families | Could imply complete truth; relation-building must be rigorous |
| **C — Partial Research Map** (defer) | Connections formed only from confirmed/known records with open-question nodes | Visual satisfaction of discovering connections | Rendering and knowledge safety complexity; risks imitating full recipe graph |

**Working preference, not user approval:** **A default + B when inspecting a known material; keep C in the idea library** until there is evidence for it. This pairs with the Company Terminal's louder work-order identity and Inspector's mechanical cause-and-action focus.

## 13. Playtest questions and anti-spoiler proof

1. A new player can explain what **Confirmed**, **Unresolved**, **Known Method** and **Open Branch** mean without being told the secret result.
2. The first experiment produces a satisfying *new evidence* moment, not an abstract achievements pop-up.
3. A hazardous trial leads to an actually learned safer-next-test hint **only after** the incident; the correct machine recovery still happens in-world.
4. No hidden reaction ID, unobserved product, authored trigger or property-directive solution can be inferred from record title, icon, silhouette, empty slot or link URL.
5. A known material may have many incomplete investigations, yet the Notebook doesn't pretend that everything useful is already listed.
6. State flavor does not make the technical record ambiguous; the player's evidence isn't overwritten by propaganda.
7. Switching Notebook → selected factory/route → Terminal can be understood without moving cargo/knowledge through a UI fiction.
8. Text scaling, keyboard focus, no forced page flips, reduced motion and narrow windows remain practical.
9. Material images are consistent with the game's **actual future 2D sprites**, not one-off AI illustrations with unrelated designs.
10. Screenshot/mockup A/B comparison at game viewport zoom decides the final split; don't choose based only on a hero promotional image.

No pass/fail metrics are claimed without real players/visual review and actual browser or simulator evidence.

## 14. Design status and next round

**Accepted pre-existing:** authoritative public evidence, exact four filters and their present semantics, earned learned hazards, known-only partial insights, no recipe spoilers, world-first UI, state Diesel/propaganda identity.

**Proposed v0.1:** field-journal visual identity, short evidence-first summary, official cover and limited technician annotations, possible known-material dossiers, optional future partial relationship visualization.

**Not approved/implemented:** A/B/C selection, final panel size, knowledge-search/index, authored material dossier art pack, in-world jump shortcuts, visual graph, history/replay or new mechanics.

**Next discussion:** compare the **three technical workspaces as one UI system** — Inspector (machine truth), Terminal (state bureaucracy and cargo), Notebook (earned science) — and draft a **Shared UI Visual Grammar / Screen Architecture v0.1** only after review. No automatic implementation or new phases.

**Document history:** v0.1 initial concept recorded 2026-10-12, documentation-only.
