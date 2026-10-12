# Visual Mockups v0.2 — First Comparative Review

> **Status: VISUAL EXPLORATION / PENDING HUMAN REVIEW — 2026-10-12.** Two concept-art contact sheets have been generated and inspected at a high level. They are **not** implemented screens, screenshots of Unknown Yield, production-ready art, authoritative gameplay data, approved layouts or a new feature phase.
>
> **Working premise:** view [Shared UI Visual Grammar v0.1](SHARED_UI_VISUAL_GRAMMAR_V0_1.md), [World Identity](WORLD_IDENTITY.md) and the five v0.1 UI studies together. **Confirmed choice:** Main Menu **C / Propaganda Meets Reality**. All remaining composition choices require further review.

## 1. Visual material in this iteration

Two experimental 1536 × 1024 contact sheets were created **in the design conversation**, with exported image names:

| Iteration | Local export filename in conversation's visual-review packet | Role |
| --- | --- | --- |
| **01 — Industrial/ceremonial** | `01-industrial-ui-contact-sheet.png` | Heavy industrial planet, patriotic title composition, compact/diagnostic/detailed factory inspector states and illustrated documents |
| **02 — Operational/quiet** | `02-operational-ui-contact-sheet.png` | Another layout comparison of the same five screen families with a relatively lighter, functional HUD and larger framed Terminal/Notebook |

An accompanying conversation-only review ZIP `unknown-yield-visual-review-v0.2.zip` includes both contact sheets, five convenient crops and a small disclaimer README. **The PNGs are not in the Git repository** and are **not bundled runtime assets**. Do not add nonexistent relative image embeds or cite conversation-only files as a stable build artifact. If a visual candidate is later approved, select or re-author suitable source art and commit it through the project's normal art pipeline with provenance.

**Generation artifacts and their legibility limitations:** these are AI concept collages; some tiny labels are malformed, inconsistent or invented. The panels are **not** faithful captured UI screens or evidence of exact on-device interaction size. The shared Dieselpunk atmosphere is promising; the fixed 2D, three-quarter production look remains unproven.

## 2. Common identity emerging across both

**Keep exploring:**

- Rectilinear, heavy mechanical buildings with visibly functional pipes, freight belts, smokestacks and loading infrastructure on a foreign planet.
- A distinct **state graphic layer** in oxide-crimson / aged-cream posters, with seals and optimistic heroic industrial messages contrasted with the physical working site.
- One design family shared between official menu plate, factory serial stamp, terminal document and field notes; not five unrelated app designs.
- Functional edge panels with occasional theatrical documents; high-frequency actions need much less decoration than one-off ceremonial moments.
- A consistent industrial type hierarchy: state display title, normal reading text, numeric technical values, rare stamp details.

**Do not lock in:** literal generated logos, fictional agency names, base-game resource values, invented images of material specimens, lighting/time of day, background map or individual factory model silhouettes. They are reference exploration until chosen in play-scale art tests.

## 3. Screen-by-screen comparison (working critique, not final vote)

| Surface | Strong direction in the generated studies | Keep | Revise / still open |
| --- | --- | --- | --- |
| **Main Menu C** | Heavy installation set behind oversized state slogan and modest command plaque | Propaganda/reality contrast; legible start/continue actions; a scene that describes industrial work | Panel left/right positioning; font at actual viewport; avoid large decorative title obstructing factory |
| **Normal HUD** | Thin site pulse, compact actions, world-visible tools | Edge placement, visible simulation world, selective notification surfaces | Generated pseudo-energy/crew/morale indicators and excessive top resource counters are **not game systems**; test left rail vs bottom dock |
| **Factory Inspector** | Compact unit dossier with darker enamel frames; separate diagnostic highlight and detailed work sheet | Selected world building remains visually relevant; cause → action → details; route highlighting only when troubleshooting | “Closed” roof must not be interpreted as powered off; do not present invented nominal rates, fake maintenance percentage, global electricity or full factory inventory |
| **Company Terminal** | State-printed work and shipment forms with a physical cargo facility behind them | Strongest official voice; freight/manifest/physical dock theme; Work / Handling / Shipment / Company access | Prevent half-screen everyday paperwork; differentiate real holding from pending selection; no imaginary commodity values/rewards |
| **Field Notebook** | Technical binder and specimen cards, more sober than posters | Clean evidence hierarchy, clear observed/hazard notes, partial material dossier concept | The image's large always-open book may be too invasive; no unknown materials/hidden result previews, invented time history, global research map or completely authored encyclopedia |

### Image-generated inaccuracies that cannot enter a final UI spec

- Numeric mockups may mention **220 MW**, manpower, morale, nominal production, recovery percentages, market values, operating hours, debt figures or research stages without any `PlayerSnapshot` source.
- A factory **roof closed** is a visual context change, *not* the same as **machine disabled**.
- **`measuring`** throughput does not mean failure and does not authorize a guessed `nominal X/min`.
- Basic `Save.fuel` is **abstract operating allocation**, unlike imported physical advanced fuels.
- Shipment manifest quantity is **persisted intent**, not extra reserved/moved cargo; dispatch uses real physical holdings.
- Experiments with `hinted` evidence conceal output; the Notebook cannot display complete hidden recipes or an unseen material specimen.
- A glossy, dramatic 3D-looking concept image does not authorize a runtime 3D engine switch. The real asset pipeline remains **fixed 2D three-quarter**, with 3D blockouts merely as sprite/reference tools.

## 4. Candidate composite direction for the next pass

**Exploration preference only — not a new approved style:**

- **World/art:** industrial mass, genuine route networks and material weight from both sheets, *rendered as coherent 2D sprites at actual camera scale*.
- **Menu:** strong official proclamation over the physical installation, but navigation plate modest and readable.
- **HUD:** the second sheet's restrained grouping, further reduced to truthful public site/operating-allocation state and contextual events.
- **Inspector:** compact dark engineering dossier by default; activate spatial highlighting for diagnosis; show a separate large technical work-order sheet only when needed.
- **Terminal:** operational freight console by default; paperwork/propaganda in Company/Work and as deliberate dispatch or bulletin states.
- **Notebook:** compact earned-evidence journal by default; optionally expand a known-material dossier, not an always-fullscreen book or universal recipe tree.

**Avoid combining** the two sheet's information density. A convincing single-frame concept can be far busier than a usable game.

## 5. What a more faithful next visual pass must change

Before claiming a production-faithful visual direction, use **one named test `PlayerSnapshot`** and physically accurate route state as source, *not* text invented by an image model. The next mockup may simplify state by omission, but must not invent inventory, power, workers, standing, technology, rates, unlocked knowledge or material traits.

**Recommended focused proof (suggested order, not a new phase):**

1. **One full-resolution 16:9 normal-play scene**, using the fixed 2D three-quarter camera and a restrained HUD.
2. **Same scene, same crop, factory selected**: right/edge dossier and verified `measuring` vs `stable` contract state, never guessed rate.
3. **Same scene, same facts, actual output blocked**: show physical selected output path and targeted analysis overlay.
4. **Terminal selection** grounded in real staging/module/manifest data; official design only on top.
5. **Notebook** with one *known* experiment and one genuine *unresolved* entry, visibly distinct and not spoiler-bearing.

Visual review should compare 16:9 desktop and narrower viewports and include reduced-motion/static options. Use fewer, larger screens over tiny unreadable contact-sheet subframes when checking typography.

## 6. Review checklist and explicit open decisions

| Question | Current state |
| --- | --- |
| Main Menu C / propaganda vs reality | **Already chosen** conceptually, scene composition still open |
| Main Menu panel alignment and typography | **Open**: evaluate side plaque left vs right, title size |
| HUD build controls | **Open**: left rail vs bottom dock/hybrid at normal game viewport |
| HUD density | **Working hypothesis**: compact site/allocation pulse and on-demand resources |
| Factory Inspector | **Working hypothesis**: compact dossier + on-demand spatial diagnostics + rare detailed work orders |
| Terminal | **Working hypothesis**: daily operational console + optional manifest sheet + rare broadcast |
| Notebook | **Working hypothesis**: compact journal + known-material dossier; defer broad graph |
| Color / brass / cream / crimson swatches | **Unapproved sample palette** until text contrast and in-game world readability reviewed |
| UI art production | **Not begun**; later commit real approved sprites, textures, symbols and legal typography/assets |
| Source for data in screenshots | **Pending**: specific actual saved state/snapshot and gameplay viewport |
| Interactive/browser usability | **Unverified** by these images; demands real-play acceptance later |

**Decision posture:** preserve both explorations and let the user choose **what to keep/change** before calling anything final. The images have value as mood and comparative composition, not as a substitute for functional wireframes or Phaser/React usability proof.

## 7. Next design conversation and provenance

A good next discussion is to study the two comparative sheets and identify:
- which treatment feels **too decorative or too dark**;
- which screen actually *communicates game operations* best;
- what visual shapes/text legibility should be preserved across world & panels.

**No new issues or implementation work are authorized by this review**; it only preserves the current visual iteration and factual caveats.

**Related:** [SHARED_UI_VISUAL_GRAMMAR_V0_1.md](SHARED_UI_VISUAL_GRAMMAR_V0_1.md), [MAIN_MENU_DIRECTION_V0_1.md](MAIN_MENU_DIRECTION_V0_1.md), [HUD_DIRECTION_V0_1.md](HUD_DIRECTION_V0_1.md), [FACTORY_INSPECTOR_DIRECTION_V0_1.md](FACTORY_INSPECTOR_DIRECTION_V0_1.md), [COMPANY_TERMINAL_DIRECTION_V0_1.md](COMPANY_TERMINAL_DIRECTION_V0_1.md), [FIELD_NOTEBOOK_DIRECTION_V0_1.md](FIELD_NOTEBOOK_DIRECTION_V0_1.md).
