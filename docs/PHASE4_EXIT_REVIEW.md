# Phase 4 Exit Review — Content Studio v1

Issue: #63  
Parent epic: #11

Phase 4 turns the original materials-only TinyBase proof into a development-only authoring workflow for the core industrial content model.

## Accepted Studio contract

The Content Studio v1 owns **authoring state**, not gameplay state.

It can author:

- materials;
- operations;
- processor/extractor machine definitions;
- reactions, process conditions and hazards;
- stable localization-key references plus English source/fallback text;
- content version metadata.

It deliberately preserves site/economy/storage breadth from the base snapshot in this first slice rather than becoming a generic editor for every future content domain.

A Studio export is a deterministic versioned bundle:

```ts
{
  schemaVersion: 1,
  content: Content,
  locale: LocaleCatalog
}
```

The bundle validates both gameplay/content semantics and locale-resource coverage before export/import.

## #60 — versioned authoring core

Draft PR #64 established the authoring boundary.

The TinyBase store expanded from a materials-only proof to tables for:

- content metadata;
- materials;
- operations;
- machines;
- reactions;
- locale source/fallback text.

Nested machine/reaction data is flattened only inside the editor store and reconstructed at the validated export boundary.

The core supports:

- deterministic import/export;
- bundle schema validation;
- custom locale catalogs;
- reverse references for stable material/operation/reaction identities;
- invalid-reference rejection before export;
- backward-compatible runtime `validateContent(input)` behavior with the built-in English catalog.

A key Phase 4 requirement is that a genuinely new stable ID can be authored together with its presentation resources. The Studio is therefore no longer limited to editing values whose keys were already hard-coded in `enCatalog`.

## #61 — workbench and reference browser

Draft PR #65 replaces the old material table with a development-only Content Workbench.

The accepted interaction model is:

- content-type tabs for Materials / Operations / Machines / Reactions;
- searchable entity list;
- create/edit/delete draft records;
- stable lowercase IDs remain identity;
- localization keys are derived/stable rather than manually renamed;
- English source/fallback wording is editable independently;
- live whole-bundle validation;
- reverse-reference inspector;
- deterministic bundle export/import;
- responsive editor layout.

Invalid drafts may exist temporarily in TinyBase so related records can be authored together. They cannot be exported or previewed until the complete bundle validates.

Deleting a referenced record is likewise allowed as an editing action; validation then exposes the broken semantic reference rather than silently rewriting dependent records.

The Studio continues to exist only through the generated `npm run dev:studio` entry and remains absent from the player static export.

## #62 — selected-content simulation preview

Draft PR #66 adds an isolated reaction preview using the real `Simulation`, real commands, belts, transport, authored reaction matching and incident behavior.

For a selected reaction, the preview:

1. validates the Studio bundle;
2. chooses a compatible authored processor matching operation + process condition;
3. creates a synthetic preview-only site with a deposit of the selected input;
4. places a real extractor, factory, wall port, belts and processor through simulation commands;
5. selects the authored operation;
6. advances a fresh simulation until the reaction completes;
7. reports processor, condition, input/output, ticks, result amount, incident/status and remaining fuel.

The active expedition and save are never read or mutated.

Progression unlocks are removed only from the synthetic preview clone so a designer can inspect authored physical behavior before a player has earned the capability. This does not change runtime progression rules.

Preview coverage includes:

- an ordinary safe reaction;
- a condition-sensitive sealed reaction;
- the authored hazardous oversealed reaction;
- a completely new material + operation + machine + reaction authored through the Studio.

Repeated previews from the same valid bundle must be deterministic.

## Locale and simulation validation boundary

Phase 4 exposed one pre-existing authority leak: `Simulation` constructed itself through `validateContent(content)`, whose default also required every localization resource to exist in the built-in English catalog.

That prevented valid dynamic Studio content from entering an isolated simulation even after its own locale bundle had validated.

The accepted boundary is now:

- `validateContent(input, catalog)` — content authoring/distribution boundary; validates structure, gameplay semantics, stable localization-key identity **and** locale resource coverage;
- `validateSimulationContent(input)` — simulation boundary; validates the same structure/gameplay semantics/stable key relationships, but not presentation-resource availability;
- `sim-core` consumes only the second boundary and never depends on a localization framework/catalog;
- normal built-in fixture/content is still created through `validateContent`, so player-distributed content continues to prove locale coverage before runtime.

This is one architectural Phase 4 change to sim-core's validation call site. After it, adding a new authored entity/reaction does not require per-content sim-core edits.

## Integrated Phase 4 regression gate

`apps/web/test/phase4-exit.test.ts` proves the full vertical path with new authored IDs:

```text
powder material
+ polish operation
+ polisher processor
+ polish-raw reaction
+ new English source text
```

The gate requires:

1. authoring through TinyBase/workbench helpers;
2. complete content + locale validation;
3. static built-in-catalog validation to reject the new keys when the authored locale is omitted;
4. locale-independent simulation semantic validation to accept the keyed content;
5. reverse-reference discovery;
6. deterministic Studio bundle serialization;
7. parse/import into a fresh TinyBase store with byte-identical re-export;
8. two fresh real simulation previews to return exactly the same result;
9. original canonical fixture to remain unchanged;
10. invalid drafts to fail before export/preview;
11. safe, conditioned and hazardous canonical preview paths to remain deterministic.

The existing content, Phase 2 and simulation tests remain part of the final repository gate.

## Player export boundary

The Studio remains a development tool.

`scripts/studio.mjs` generates the temporary authoring route only for `npm run dev:studio`.

The normal production build does not include that route, and `scripts/verify-export.mjs` rejects:

- any exported path containing Studio routing;
- Studio-specific authoring component markers in player JavaScript.

Phase 4 does not introduce runtime hot-reload of authored bundles into an active expedition.

## Scope deliberately deferred

Content Studio v1 does **not** yet become a universal editor for:

- Materials Exchange / company economy;
- milestones/knowledge graph breadth;
- site/deposit/world-layout authoring;
- storage definitions;
- later logistics technologies;
- art asset management;
- runtime mod loading.

Those should enter the Studio when their gameplay phases establish concrete schemas and authoring pain.

## Phase 4 outcome

Phase 4 is complete when the stacked #60 → #61 → #62 → #63 sequence passes its final combined automated/browser gate and merges.

The resulting authoring architecture is:

- **TinyBase for editable authoring state;**
- **Zod + semantic validators at bundle boundaries;**
- **stable IDs/keys separate from visible wording;**
- **deterministic versioned content + locale bundles;**
- **reverse-reference inspection;**
- **isolated real-simulation preview;**
- **zero authority over the active player world;**
- **no Studio route/component in the player production export.**

Phase 5 may begin only after #63 and parent #11 close.
