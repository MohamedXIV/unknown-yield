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

## 5. Visual style

The exact final style is intentionally not locked yet.

The pipeline should support stylization without requiring photorealistic rendering.

Desired qualities:

- readable at gameplay zoom;
- industrial but not sterile;
- strong silhouettes;
- distinct material families;
- enough texture/detail to avoid flat vector appearance;
- coherent lighting and shadow language;
- visually understandable input/output ports;
- visible machine operating state.

Avoid choosing a style that requires AAA-grade 3D material polish for every asset.

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
