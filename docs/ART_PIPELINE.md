# Art Pipeline

## 1. Runtime visual decision

Unknown Yield is a **2D game**.

The current target is a fixed top-down / three-quarter industrial view with strong readability, broadly comparable in functional camera language to games such as Factorio, without requiring the final art style to imitate Factorio.

The runtime is not planned as 3D.

This is a scope decision as much as an aesthetic decision.

## 2. Why 2D

The project favors 2D because it:

- avoids the polish burden of a full 3D industrial world;
- gives stronger control over final composition;
- makes AI-assisted asset production more practical;
- keeps the camera fixed and asset requirements predictable;
- reduces runtime rendering complexity;
- lets us spend effort on distinctive materials, machines, effects, UI, and simulation.

A 3D runtime should not be reintroduced merely because one mechanic can be expressed naturally in 3D. Roof removal, interior cutaways, vertical logistics, damage states, and factory editing all have viable 2D presentation techniques.

## 3. 3D is a production tool

Simple 3D models/blockouts are encouraged as **structural guides** for generating consistent 2D assets.

Conceptual pipeline:

```text
design sketch / requirement
        |
simple 3D blockout
        |
fixed game camera render
        |
optional passes:
  base color
  shadow
  AO
  depth
  normals
  object/material masks
        |
AI-assisted style generation
        |
cleanup / consistency pass
        |
sprite / animation / masks
        |
Phaser runtime
```

The blockout controls:

- perspective;
- dimensions;
- part placement;
- silhouette;
- animation;
- repeated machine identity.

The AI pass provides style/detail rather than reinventing geometry from frame to frame.

## 4. Camera contract

The camera/projection should be fixed early.

The goal is to avoid asset multiplication.

If practical, machines should not require four or eight manually authored directional variants just because the camera can rotate.

Questions to settle in an early art test:

- orthographic vs shallow perspective look;
- exact visible top/side proportion;
- tile/world scale;
- sprite anchor convention;
- shadow direction;
- maximum machine height before occlusion becomes confusing;
- roof/wall readability.

Do not build a large asset library before this contract is fixed.

## 5. Visual style — locked direction

The approved style is **Dieselpunk industrial retrofuturism for the physical world, contrasted with colorful mid-century industrial/space propaganda and pulp sci-fi illustration for the fictional state's official messaging.** See [WORLD_IDENTITY.md](WORLD_IDENTITY.md) for the full art/narrative/naming contract.

- Real machinery: heavy, angular, reinforced and comprehensible at gameplay zoom; painted steel, service detail, serial plates, pipework and consistent state/port silhouettes.
- Official imagery: bold heroic workers, rockets, production slogans, graphic optimism and confident limited-color print treatments. Propaganda should **not** determine factory geometry.
- Planet: unusual, discoverable material cues that contrast with institutional standardization.
- Avoid rounded glossy/cute Atompunk as the base game world, generic rust-only junkyards, flat vector prototypes, noisy cinematic filters and photorealistic 3D production obligations.
- State, hazard and material distinctions must remain readable independently of color, with strong silhouette and lighting consistency.

This locks **direction**, not specific sprites, final palette, fictional names or an expensive new rendering technique. The existing 3D-blockout-to-2D pipeline, fixed projection and performance/accessibility constraints remain.

## 6. Machine asset structure

Prefer decomposable assets where useful:

```text
base machine sprite
+ moving subpart layer
+ emissive/warning layer
+ material/product tint layer
+ damage/wear overlay
+ shadow
```

This can produce variation and state changes without generating a totally new full sprite for every condition.

Possible reusable masks:

- company/faction tint;
- rust/wear;
- paint;
- emissive;
- heat;
- contamination;
- damage.

## 7. Animation

For machinery, 3D guide animation is preferred when it improves consistency.

Example:

1. animate press/crusher/piston in blockout;
2. render canonical frames from the fixed camera;
3. use frames as the structure for AI-assisted stylization;
4. post-process as one coherent sequence;
5. export spritesheet/atlas.

Do not independently prompt each frame unless the asset is simple enough that temporal consistency is irrelevant.

## 8. Factory exterior and interior

Factories need at least two presentation contexts.

### Exterior

Shows:

- walls/roof;
- ports;
- status lights;
- labels/throughput overlays where useful;
- external logistics.

### Edit/interior view

Possible techniques:

- hide roof;
- fade roof;
- swap to cutaway exterior;
- use masks/stencils;
- show walls at reduced height/opacity;
- display interior machinery on a dedicated layer.

The specific technique is a presentation decision, not a reason to change engine/rendering paradigm.

## 9. Elevated and underground logistics

2D representation should emphasize readability over pretending to be physical 3D.

Possible language:

### Underground
- clear entrance/exit heads;
- dotted/ghost route on selected/inspection view;
- no need to permanently draw the buried segment.

### Elevated
- dedicated elevated sprite layer;
- pylons/gantries;
- consistent shadow/occlusion cues;
- intersections visually separated from ground routes.

The gameplay topology lives in simulation data; the sprite stack explains it to the player.

## 10. Damage and accidents

Prefer layered/reusable damage presentation:

- scorch overlay;
- smoke;
- sparks;
- cracked panel variant;
- leaking fluid/gas;
- detached roof/panel debris;
- warning light state.

Major destruction may use dedicated variants where necessary, but the game should not require a unique hand-authored destruction animation for every machine.

## 11. Materials must read differently

Because material discovery is central, material identity deserves stronger art support than ordinary factory games where resources are mostly icon colors.

Potential channels:

- color;
- roughness-like painted cue;
- translucency;
- glow/emissive;
- particle behavior;
- container type;
- flow animation;
- contamination effect;
- temperature effect;
- UI icon shape.

Do not rely on hue alone.

## 12. Asset metadata

Every runtime asset should be addressable through content IDs/metadata rather than hard-coded file names in scene logic.

Possible metadata:

- asset ID;
- sprite/atlas key;
- anchor;
- world footprint;
- layer category;
- animation clips;
- optional masks;
- shadow asset;
- damage overlay set;
- content tags.

## 13. AI-generation rules

AI generation should be constrained by project truth.

Preferred inputs include:

- blockout render;
- reference sheet;
- material/color target;
- machine function;
- fixed camera;
- explicit silhouette constraints.

Avoid using unconstrained text prompts as the only source for production-critical repeated machinery.

Generated output must be checked for:

- perspective drift;
- inconsistent port location;
- impossible geometry;
- frame mutation;
- unreadable scale;
- broken transparency;
- inconsistent lighting.

## 14. First art validation set

Before building a large library, create a small scene containing:

- terrain tile set;
- one deposit;
- one extractor;
- one belt line;
- one pipe;
- one factory shell;
- one interior machine;
- one terminal component;
- one elevated route example;
- one underground entrance/exit;
- one accident/damage effect.

If these assets read coherently at intended game zoom, the pipeline is viable.

## 15. Pixel-art production contract (D-056)

Unit and structure art is hand-drawn pixel art (Aseprite). SVG art stays as the placeholder for anything not yet drawn; the two formats coexist per asset (`format: "pixel"` in `art-assets.ts`).

**Scale.** 1 art pixel = 0.8 world px. At the default zoom (1.25) that is 1:1 on screen; at max zoom (2.5) it is 2:1. One grid cell = 40x30 art px (32x24 world px). A 2x2 machine canvas is about 112x116 (80x60 base plus overhang). Zoom stops 0.625 / 1.25 / 2.5 are the pixel-perfect ones; other zooms stay acceptable but not exact.

**Rendering.** Pixel sprites are never rotated or stretched. Nearest filtering is set per pixel texture (not the global `pixelArt` flag, so SVG and UI text stay smooth). Positions snap to the 0.8 grid. Anchor is bottom-centre of the opaque body.

**One body per machine, built for four sides.** Draw bodies near-square and roughly symmetrical so a connection can enter or leave on any side without a redraw. Do not paint a lamp, glow, cargo or an arrow into the body: the status lamp, input/output arrows (cyan in, yellow out) and state overlays are drawn by code. Direction is therefore never baked into the sprite and no per-direction variants are needed. If a variant is ever needed, a horizontal flip is lossless.

**Generic output chute (optional).** One small shared overlay in four directions (N/E/S/W), placed on any machine's output side by code. Four tiny sprites serve every machine; they are not part of any body sheet.

**Animation.** `<id>-working.png` is a horizontal strip of N frames, same canvas as the static sprite; frame 0 must equal the static sprite. Frames follow the wall clock (not a per-object animation), so redraws never restart the loop. Smoke and steam live in the strip, not in code.

**Source and AI.** Pixels are drawn by hand. AI output is reference only (silhouette and material sheets), never the shipped asset.

**Identity.** Base-world silhouettes stay Dieselpunk per docs/WORLD_IDENTITY.md; Atompunk is limited to printed propaganda graphics.
