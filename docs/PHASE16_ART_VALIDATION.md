# Phase 16 — Representative final-direction art validation (#153)

Issue #153 applies the existing Phase 8 pipeline to one deliberately small runtime set before broad production art begins.

## Camera / projection contract

The representative set fixes the runtime assumptions that generated or hand-cleaned assets must preserve:

- fixed top-down / shallow three-quarter presentation;
- world cell: **32 × 24 px**;
- default object anchor: **bottom center**;
- canonical painted shadow offset: **+7 px x / +7 px y**;
- camera does not rotate;
- runtime hitboxes, logistics topology and simulation geometry remain independent from sprite silhouettes.

These values live in `apps/web/game/art-assets.ts`, not in individual draw calls.

## Validation set

The first production-direction set contains exactly the categories required by `ART_PIPELINE.md`:

1. terrain tile — `terrain-basalt`;
2. deposit — `deposit-ferrite`;
3. extractor — `machine-extractor`;
4. belt — `logistics-belt`;
5. pipe — `logistics-pipe`;
6. factory shell — `factory-shell`;
7. interior machine — `machine-crusher`;
8. terminal component — `terminal-core`;
9. elevated route — `logistics-elevated`;
10. underground portal — `logistics-underground`;
11. accident/damage overlay — `effect-scorch`.

The files are SVG validation masters under `apps/web/public/art/phase16/`. They establish silhouette, lighting, palette, port/readability and layer language; they are not permission to generate the rest of the game blindly.

## Metadata contract

Every representative asset has stable metadata:

- asset ID;
- Phaser texture key;
- source path;
- source pixel dimensions;
- anchor;
- intended world footprint;
- render layer;
- content/pipeline tags.

Scene logic resolves by asset ID/metadata. It does not hard-code SVG file names.

Machine overrides are intentionally narrow:

- Extractor and Deep extractor share the extractor visual family;
- Crusher uses the representative interior-machine asset;
- every other machine keeps the proven procedural fallback until its production asset is accepted.

## Runtime integration

The SVG set is preloaded once by the Phaser scene.

Representative sprites are layered over the existing procedural world truth:

- terrain texture overlays the canonical ground;
- Ferrite deposits get the deposit master;
- simple belts and liquid pipes get directional sprite overlays;
- Extractor/Deep extractor and Crusher get machine overlays;
- closed factories get the factory-shell overlay;
- terminal gets the terminal-core overlay;
- elevated routes and underground portals get explicit topology sprites;
- incident machines get a reusable scorch overlay.

The procedural forms remain underneath as a fallback and continue to carry routing arrows, status labels, selection/hit geometry and other gameplay-readable state.

## Regeneration workflow

Replacing a validation master must preserve the metadata contract:

`blockout / structural guide -> fixed 32×24 camera render -> style/detail pass -> cleanup -> SVG/PNG master -> same asset ID + anchor + footprint -> Phaser regression`

A replacement may change pixels, but it must not silently move ports, change footprint truth, alter camera perspective or require scene-specific filename logic.

For repeated machinery, the recommended future production path remains:

`base sprite + moving subpart + emissive/warning + material tint + damage overlay + shadow`

#153 only proves the static/layered contract and one damage overlay. Animation breadth belongs to later production work after the visual set is accepted.

## Acceptance evidence

The merge gate requires:

- metadata uniqueness and camera invariants;
- all registered sources physically present;
- SVG viewBox dimensions equal metadata source dimensions;
- preloader coverage for the complete validation set;
- representative machine mapping/fallback behavior;
- repository tests, typecheck, lint and production build on the exact PR head.

No gameplay/simulation/save schema changes are part of #153.
