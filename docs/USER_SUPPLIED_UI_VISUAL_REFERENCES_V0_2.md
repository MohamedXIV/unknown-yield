# Unknown Yield — Original User-Supplied UI Visual References (2026-10-22)

> **Status: historical visual reference, not implementation screenshots or approved pixel-perfect UI.**
> **Read this alongside** [WORLD_IDENTITY.md](WORLD_IDENTITY.md), [SHARED_UI_VISUAL_GRAMMAR_V0_1.md](SHARED_UI_VISUAL_GRAMMAR_V0_1.md), and [VISUAL_MOCKUPS_V0_2_REVIEW.md](VISUAL_MOCKUPS_V0_2_REVIEW.md).
>
> The user re-supplied the visual concepts on **2026-10-22** after reviewing a CSS-only UI reskin in [PR #339](https://github.com/MohamedXIV/unknown-yield/pull/339). **Important feedback:** changing colors to brass/dark steel was *not the same as reproducing the intended artistic personality and graphical design language*. Preserve and consult the actual references before calling a later version visually aligned.

## Reference originals and storage

The five uploaded PNGs contain **four unique images**: image(5).png and image(6).png are **byte-for-byte identical**. The originals are preserved without crop or recompression in the user's ChatGPT personal **Library** at:

`/Unknown Yield/Visual References/v0.2/`

Those Library files are an additional permanent visual reference for future ChatGPT chats with authorized Library access. **As of this record, their binary PNG bytes are *not* committed in this Git repository**; the connected GitHub write tools need inline base64 binary input, which cannot be read directly from the mounted chat image paths by that connector. Do not write Markdown image embeds pointing to nonexistent files or pretend the images are available in GitHub's raw file tree. A portable original-quality ZIP is also attached in the originating ChatGPT conversation for manual GitHub ingestion later.

| Library name / intended future repository filename | Original uploaded file | Pixels | SHA-256 |
| --- | --- | --- | --- |
| `01-industrial-ui-contact-sheet.png` | `image(5).png`, duplicate `image(6).png` | 1536×1024 | `b42e4a734613785b2490ee87f0919276b7f84fcf2daffa191cb4f390274724d1` |
| `02-operational-ui-contact-sheet.png` | `image(8).png` | 1536×1024 | `012d6d9a5499da4edd4d9e98a7de44b0350500dda2dc54706d7b33f8681a6909` |
| `03-factory-inspector-standalone-concept.png` | `image(7).png` | 1672×941 | `fe7188e5b147fef43e42d875981493e3a265a12752c592929cd470180cbadc72` |
| `04-detailed-work-order-concept.png` | `image(9).png` | 1672×941 | `756d4c5630da42b00db6e3a26bf3f9b07606eefd6aa82fe05f32522ecddae119` |

When/if these originals are uploaded to the repository, prefer `docs/visual-references/v0.2/` and update this index with checked, real relative image links. Keep the source hashes above as provenance, not as UI layout acceptance.

## Four references: what each contributes

### 01 — Industrial/ceremonial contact sheet

- **Main Menu:** industrial panorama with extraordinary *depth, machinery, mass, smoke and conveyors*; bold distressed cream display title; dramatic oxide-red state banners/seal; compact black/red list of actions. The propaganda and genuine heavy machinery coexist without making the underlying industrial world glossy/cute.
- **Normal play:** production scene **owns the viewport**. A slim *vertical tool rail* on the left and *small status/incident transmissions* in an upper corner; UI appears manufactured and belonging to the world, not a SaaS page.
- **Inspector triptych:** compact dark metal dossier for daily use; world-anchored colored line/port diagnostics when analyzing; cream/steel specialized **work order** for uncommon heavy actions.
- **Terminal:** printed bureaucratic header and document sections over a dark functional console, selective propaganda panel.
- **Notebook:** archival paper and material dossier, clear known evidence instead of cookbook spoilers.

### 02 — Operational UI contact sheet

- **Normal HUD:** even more visually subordinate edge controls and selected-machine inspector with legible *blockage reason and actionable next step*. Compared with 01, useful for keeping day-to-day UI compact.
- **Company Terminal:** blend of cream manifest document and darker operational shell, not an all-dark generalized card UI.
- **Notebook:** scientific binder, ink/sketches, research evidence; potential **deliberate expanded** view, not a permanently huge overlay.
- **Menu:** institutional plaque balances impressive industrial skyline.

### 03 — Standalone Factory Inspector

- Shows the large **real-world Phaser view alongside a single materially distinct light technical dossier**. Useful for thinking about selective cream panels and material contrast, not a mandate that every machine click opens a giant side sheet.
- The scene includes a very large factory, freight bridges, and operational selection. **Do not copy fake status/metrics:** the image says `CLOSED`, `220 MW`, `87%`, staff counters and “No power input” without our simulation backing. A closed **roof** is not a disabled factory, and the basic site fuel allocation is not grid electricity.

### 04 — Detailed Work Order

- Very detailed cream/enamel engineering sheet with an inset drawing, tabs, operational sections, maintenance/history and a safety-colored destructive action. This is the inspiration for a **rare deliberate detailed work order**, not a default inspector.
- The concept's `32%` condition, `0/min` nominal ranges, power failure and reclamation quantities **are invented in the mockup**; implement only when supported by the player's real public state.

## Visual contract for a reskin (without breaking functional UI)

The user specifically wants **top-to-bottom review of the existing, functionally good interface**; begin with a **fast reskin**, keep working interactions/locations, and compare in-game before replacing any controls. In particular:

1. **Top HUD / site badge:** enhance institutional typography and distinct physical edging; do not add fake global counters for power, morale, workers, or generic stock.
2. **Build palette:** preserve current functional grouping, keyboard shortcuts and mobile interactions. A vertical rail appears in the concepts, but relocating the existing bottom palette is **not** authorized by this reskin preference. Explore visually first, review before any structural move.
3. **Inspector:** compact diagnosis-first industrial dossier on daily selection; distinguish it from optional full technical report; only label real machine states, rates and evidence.
4. **Terminal/Notebook:** not identical dark panels. Terminal has selective official agency printed style; Notebook can have archival cream/field-journal treatment without sacrificing readable frequent interactions or hidden knowledge.
5. **Main Menu C:** the chosen **Propaganda Meets Reality** concept is an actual thematic screen, not simply a reskinned in-game Expedition Menu; no final composition, named agency or hero artwork approved.
6. **Finish quality:** charcoal-painted metal, enamel borders, distressed industrial printed *display* type where appropriate, plausible stamped insignia, restrained crimson, beige documents and operational cream; no same gradient applied to every component. Fonts, text size, whitespace and legibility need game-scale screenshots.
7. **World vs UI:** visual identity needs more than CSS; Phaser 2D industrial sprites/art remain separate and under explicit human art review. Do not claim parity merely because the CSS palette resembles a concept image.

### Rejected mockup truth

These are **AI-generated visual drafts** with invented labels. Never introduce fictional manpower, `MW` supply, morale, fabricated commodity counts, nominal production rates, observed material names, hazard outcomes or research unlocks in the player-facing implementation without authoritative `PlayerSnapshot` evidence. `Save.fuel` is an abstract company operating allocation. Hazard and recipe secrecy remain authoritative.

### Status and next handoff

- **Accepted world visual DNA:** Dieselpunk heavy machines, pulp/state-propaganda graphic layer, fixed 2D three-quarter world-first interaction.
- **Chosen conceptual Main Menu:** C / Propaganda Meets Reality.
- **Supplied PNGs:** four distinct references saved in personal Library, original hashes tracked above. **Binary GitHub commit still pending**.
- **CSS reskin:** [PR #339](https://github.com/MohamedXIV/unknown-yield/pull/339) is a first color/instrument-material *technical* experiment, **not approved or sufficient visual alignment**; no need to destroy its working UI.
- **Review checkpoint:** actual game images of current HUD, machine inspector, terminal and notebook side by side with these references, at desktop and mobile viewports. Preserve useful functionality first; author distinctive skins screen by screen.

Do not promote exploratory layout, lore labels, experimental color hexes or fictitious stats into a shipped contract without a further explicit user design decision.
