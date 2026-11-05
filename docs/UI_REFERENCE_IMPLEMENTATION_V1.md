# Unknown Yield — executable industrial-panel reference

> **Current implementation:** [PR #355](https://github.com/MohamedXIV/unknown-yield/pull/355). This document supersedes the loose interpretation of the older v0.7 skin, but does not itself declare final pixel-perfect aesthetic acceptance.

## The user-provided source is canonical for panel construction

On 2026-11-05 the user provided the runnable HTML/CSS/JS/React panel reference, preserved **verbatim** here:

[industrial-panel-frame-source.html](visual-references/industrial-panel-frame-source.html)

Original uploaded name: `unknown_yield_ui_panel_frame_language_html_css_js_react_reference(1).html`. Original bytes SHA-256: `240a938500609e942e38c36995c0057a16751057829bffb2bb9dd023fe9a567d`.

This is materially stronger than previous AI-generated image mockups: it defines explicit style tokens, CSS rules, layer structure, typography and an illustrative React component. **Treat its actual four-layer DOM and material treatment as the accepted technical target** for the real game's menus and panels. The sample's interactive JS changes pretend factory machine counts, export numbers and milestone flags; those are **demo behavior, NOT game logic**. Never copy them.

### The four layers (actual nested DOM, not CSS-only borders)

1. `uy-outer-shell`: heavy chamfered, worn gunmetal board with six slotted bolts and optional top clamp, independent shadow.
2. `uy-inset-rim` / `uy-inset-rim-inner`: recessed brass edge plus inner black mounting tray.
3. `uy-contained-surface`: a dark blueprint/grid instrument for the Inspector and operational dialogs, or **paper with distinct archival print** for Terminal and Notebook.
4. `uy-layer-4-content`: scrollable real React content, paper ruled edge, buttons/tabs, true inventory, discoveries and company dispatches.

Keep physical surfaces independent, with the paper fully surrounded by rim on every edge and real controls **not clipped** by fake chamfers. Ref demo has `clip-path` on the outer containing element; production uses pointer-inert clipped pseudo-plates to avoid cutting actual scrollbars and focus rings.

## Implementation map

- `apps/web/components/IndustrialPanelFrame.tsx`: shared real four-layer DOM, header, variants, bolts, top clamp, meaningful (+/−/Home) **reading-only** controls.
- `apps/web/app/game-ui-reference-frame.css`: translated source construction, paper/instrument variants, overlaid tabs, typography, disabled/focus/mobile controls.
- `apps/web/components/GameClient.tsx`: every live selection Inspector, Terminal, Notebook, Expedition and Configuration panel, plus unsaved-return and destructive-review confirmations; preserve authoritative event handlers unchanged.
- `apps/web/components/MainMenu.tsx`: Begin/Continue/Archives/Content Packs/Settings/Credits inside same manufactured shell. The panoramic game illustration is a separate art-quality question and is not solved by CSS.
- `apps/web/test/phase10-browser-acceptance.test.ts`: must verify nested physical layers, correct right-edge orientation on desktop, paper texture native tiling, visible/functional reading controls, actual browser navigation and no leaked fictional values.

## Gameplay truth and design constraints

Never port the sample's pretend `machines++`, `exported++`, auto-certified milestones or simulated hidden findings into game state. Existing real simulator commands, factual DOM data, company markets, save slots/content-pack validation and touch/pointer controls remain authoritative.

Typography follows the supplied family (Oswald / Barlow Condensed / IBM Plex Mono / Lora / Inter) with offline system fallbacks. Reference code loads Tailwind CDN for its *standalone showpiece only*; production does NOT add a Tailwind CDN, separate React app or dashboard shell.

**Do not duplicate new skin layers forever.** The current PR initially overlays old physical CSS for safe behavior migration; after browser acceptance, remove or restrict obsolete geometry when it can be done without breaking mobile input and legacy functional UX.

## Art acceptance

Passing tests proves an operational interface, not exact visual parity. Compare full-size actual desktop and mobile browser evidence against the original HTML render and user-provided concept sheets, inspecting real position, four-layer depth, occupied viewport, header, text, paper texture and visible control rail. Record deviations before any final player sign-off.

Existing [v0.7 integration checkpoint](UI_INDUSTRIAL_V07_INTEGRATION.md) explains the history; this executable reference is **newer and more authoritative for the actual panel frame**.
