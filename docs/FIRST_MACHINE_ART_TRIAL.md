# First Production Art Trial — Surface Extractor v0.1

**Status:** one real machine art candidate on `art/extractor-dieselpunk-v01`, pending visual/gameplay review. It is not a final art kit or authorization to populate the remaining machines.

## Starting point: what the current game actually has

- Existing asset: `apps/web/public/art/phase16/machine-extractor.svg` at **96×88**.
- Existing source image shape: rectangular engine platform, tall left upright/bridge and suspended serrated drill on the right. The machine already belongs to the `machine-extractor` registered texture.
- Registry: `apps/web/game/art-assets.ts` — fixed-three-quarter view, bottom-center anchor **(0.5, 0.78)**, **2×2** simulation footprint. `representativeMachineAsset` maps both `extractor` and current `deep-extractor` to the same sprite. No new gameplay identity.
- Runtime: `apps/web/game/world.ts` uses the real snapshot machine position/rotation and draws legal output arrows; the source had a Graphics derrick silhouette underneath the asset, which can cause double lines.

## What this trial changes

- Replaces **only this existing SVG source** with a more complete fixed-view hand-authored vector rendering of the *same* drill machine: reinforced bolted base, angular enclosure, louvered machinery, overhead support, motor carriage, brass-finished screw/auger and structural shadow. The SVG separates the major visual parts into semantic `extractor-chassis`, `extractor-engine`, `extractor-mast`, `extractor-auger` groups so a later art pass can reuse the design without inventing extra machines.
- Preserves `96×88`, alpha/transparency, registry path, stable texture key, machine footprint, anchor, rotation handling and real simulation logic.
- Suppresses the redundant Graphics mast only when the SVG art override already represents an extractor; the fallback graphics remains for other extractor definitions.
- Adds a small regression test proving size, anchor and recognizable structural parts.

## Design goals / deliberate non-goals

**Keep:** legible auger silhouette at actual 2×2 footprint, painted steel and restrained brass, modular technical detail, non-junkyard wear, industrial visual seriousness, world-first game use.

**Do not infer:** the illustration does not add a pump, pressure simulation, electricity grid, new machine animations, generic “operating fuel” tank, new output ports or any hidden ore recipe. Small amber service marks are not indicators that the machine is running. Deep Extractor is **still sharing** this first test art intentionally; a genuinely distinct advanced model is later content/art work.

**Important:** no animation variants are shipped in v0.1. Real machine status remains in existing `machineStatusLabel`, machine/world labels and incident overlay, not in invented constant spinning/spouting smoke.

## Review checklist before accepting the art direction

1. Extractor still matches its old functional silhouette: engine platform + raised gantry + drill.
2. In the actual Phaser scene at normal zoom, auger and output direction can be distinguished from belts, ports and deposits.
3. The silhouette remains clear at zoomed-out site view and within the roof-open factory context.
4. The sprite isn't cropped by its fixed SVG viewport, anchor, or 90-degree rotations.
5. It looks consistently manufactured near the existing Terrain, Belt, Crusher and Terminal, **not** like a separate 3D diorama.
6. The broad art family is compelling enough to apply to one *other* machine; do not scale to 30 assets without player review.

## Verification and next decision

The SVG and renderer are the **implementation**. Automated asset metadata tests validate dimensions/identity but cannot prove beauty, correct spatial coupling, display zoom quality or camera readability. A browser screenshot/gameplay review is needed before declaring the art locked. Link [ART_PIPELINE.md](ART_PIPELINE.md) and [WORLD_IDENTITY.md](WORLD_IDENTITY.md) as accepted constraints.

User review should approve/revise this first extractor before creating art for additional machine types.
