# Phase 15 — Differentiated material families (#145)

Phase 15 begins by scaling content through systems that already exist. This issue does **not** add a material-family schema, a new machine class or new progression mechanics.

The canonical fixture now exposes three representative families whose industrial decisions differ for concrete reasons.

## 1. Structural ferrite

Stable source material: `ferrite`.

The known `press-ferrite` route remains the construction-first path:

`Ferrite rubble -> Crush -> Structural plates`

Structural plates are the site build material and are deliberately not a Materials Exchange listing. Consuming ferrite here expands physical capital.

A second, hidden route now exists:

`Ferrite rubble -> Ambient Heat -> Magnetic ceramic`

Magnetic ceramic is exportable at a strong initial rate, but saturates aggressively. This creates a local-capital vs short-lived export opportunity without adding an arbitrary “ore tier”.

## 2. Reactive veined material

Stable source material: `raw`.

This family already crosses the proven material-state systems:

`Veined ore -> Liquefy -> corrosive liquid -> Precipitate -> Conductive granules`

or:

`corrosive liquid -> Vaporize -> pressure gas -> Collect -> Conductive granules`

The liquid requires corrosion-resistant containment, while the vapor requires gas logistics. The family therefore changes factory layout and handling rather than just numerical yield.

Existing thermal experiments and hazards remain separate discovery branches; #145 does not expand their hint graph.

## 3. Resonant catalyst

The local `catalyst` source is a hidden deep seam behind the accepted resonance-probe capability.

It now supports two different uses:

`Catalytic stone -> Crush -> Catalyst powder`

and:

`Catalytic stone -> Sinter -> Resonant matrix`

Catalyst powder is a lower-value but broad, slow-saturating commodity. Resonant matrix has higher value and already participates in company orders, property directives and a discovery-created demand shock.

The choice is therefore not “Mk1 vs Mk2”: it is commodity conversion versus preserving scarce catalyst for higher-value resonant industry.

## Compatibility and authoring

The additions use only existing content tables:

- materials;
- reactions;
- existing operations and machines;
- Materials Exchange listings;
- localization.

No schema or Content Studio tooling change is required. The existing Studio bundle round-trips the new materials and reactions exactly.

The content version remains `world-01-v13` intentionally: all added materials and reactions are unknown at expedition start, no previously-known reaction or material identity changes, and the new exchange listings cannot exist in save market state until their corresponding outputs become known. The additive content therefore does not require invalidating current compatible saves.

## #145 acceptance boundary

This issue establishes representative differentiated content. It does not yet:

- expand the partial knowledge/hint graph (#146);
- add advanced/research-grade fuel progression (#147);
- create recursive company technology (#148);
- add new late-game hazard/logistics systems (#149);
- claim final pacing or balance (#150);
- add Content Studio tooling (#151).

Those remain dependency-ordered Phase 15 work.
