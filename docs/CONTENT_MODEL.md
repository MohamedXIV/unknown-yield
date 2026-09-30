# Content Model

## Implemented content contract (2026-09-26)

The current Zod contract lives in `packages/content/src/schema.ts`. It separates machine definitions (footprint, operations, buffers, fuel, duration and build cost) from placed runtime instances. Materials, operations, reactions, authored site/deposits, terminal bounds, factory limits, belt/port costs and fuel assistance are editable data.

The starter fixture contains a known construction chain plus hidden outcomes of the same alien input. A crusher accepts different physical inputs; recipes are not baked into the renderer. `known` marks initial knowledge only. Runtime observations unlock public material metadata and notebook entries; authored truth never goes straight to player UI.

Content version `world-01-v6` is independent of save schema 11. Phase 5 #69 moves export compensation out of per-material static values into data-driven Materials Exchange definitions plus persisted runtime market memory (demand/saturation). Phase 5 #70 adds authored Corporate Orders and Special Directives plus persisted opportunity history additively; existing `world-01-v6` content without those arrays validates them as empty. Since Issue #14 the schema carries localization keys (`nameKey`, `observationKey`) instead of literal English `name`/`observation` strings; the English catalog lives in `packages/content/src/locale.ts` and is validated by Zod plus semantic key-coverage checks. Issue #4 added a `storages` table (bulk storage definitions: capacity, footprint, cost) and `site.stagingCapacity` for bounded terminal staging. Phase 4 replaces the old materials-only TinyBase proof with Content Studio v1: materials, operations, machines and reactions are editable authoring tables; English source/fallback text is authored alongside their stable localization-key references; the whole bundle validates before export/import; reverse references and isolated simulation preview are development-only tools. Site/economy/storage breadth remains preserved base content in v1 rather than a generic everything-editor.


### Company opportunities (Issue #70)

`economy.orders` and `economy.directives` are authored company-opportunity definitions with stable IDs and localized name/brief keys. Orders reference only a material already eligible for the Materials Exchange and define quantity, offer duration and fuel reward. Directives reference an experiment tuple (operation + known input + optional process condition), never a reaction ID or output ID; validation proves an authored outcome and capable processor exist without exposing either to the player snapshot.

Runtime offer/progress/expiry/completion state is save data, not content data. Save schema 9 stores one-shot opportunity history by stable opportunity ID. Schema 8 migrates exactly with an empty history because older saves had no offers, progress, expiries or rewards to preserve. The content version remains `world-01-v6` because #70 is an additive compatible extension: pre-#70 v6 content parses with empty order/directive arrays.

### Evidence milestones and terminal capabilities (Issue #71)

`economy.milestones` is a small stable-ID graph. Each milestone owns localized name/hint keys, one or more evidence requirements, and zero or more terminal-capability unlock IDs. Supported evidence references are stable machine-readable identities: confirmed reaction, exported material quantity, completed order, completed directive, completed milestone and terminal capability. Display text never participates in simulation identity.

`economy.terminalCapabilities` defines localized handling identities. An exchange listing may carry `requiredTerminalCapabilityId`; this changes the physical terminal export rule rather than only presentation. Content validation verifies all references, rejects graph cycles, requires every exchange handling gate to have a milestone unlocker, and rejects an unlock path that depends on exporting or completing an order for the same material the capability blocks.

The #71 fields remain additive to `world-01-v6`: older v6 content without terminal capabilities/milestones defaults those arrays empty and listings without a handling requirement continue to export under the pre-#71 rule.

### Corporate assistance packages (Issue #72)

`economy.assistancePackages` is an additive authored list keyed by stable package ID. A package owns localized name/brief keys plus `fuelBelow`, `grantFuel`, `baseObligationFuel`, `repeatObligationStepFuel` and `recoveryNetFuel`. `defaultAssistancePackageId` chooses the package used by the compatibility command path when no ID is supplied. Validation requires stable localization-key ownership, a valid default, an obligation no smaller than the grant, and a grant that exits its own fuel-depletion eligibility range. The fixture's actual recovery capacity is proven by the #72 world regression rather than by coupling package balance to the highest-fuel machine in all future content.

The pre-#72 `grant` and `assistanceBelow` scalars remain as an additive compatibility fallback for older `world-01-v6` content that has no assistance-package array. New fixture/runtime behavior uses the authored package instead. No display text participates in eligibility, debt or standing identity.

Save schema 11 persists only runtime company state—standing, intervention streak, net-export recovery progress and active recovery package ID—while the package rules remain content data. Schema 10 migration preserves existing `debt` exactly and derives only the minimum standing needed to represent it.

### Discrete process conditions (Issue #30)

Machine definitions and reactions may each carry an optional stable `processConditionId`. The simulation matches the exact tuple of operation, input material and condition ID; omitted IDs match only other omitted IDs. There is no wildcard or fallback. Validation rejects duplicate tuples and any reaction or machine operation without a processor definition carrying the same condition. The fixture demonstrates `raw + heat` resolving to residue in `ambient` and granules in `sealed`; the authored outcomes remain hidden until observed. Existing unconditioned reactions remain valid. The condition is derived from the placed machine's existing `definitionId`. At the Issue #30 stage the fixture remained `world-01-v5`; later phases may bump content independently when their persisted/content contracts require it.

### Experiment evidence and player knowledge (Issue #31)

Player knowledge is no longer only a discovered/not-discovered reaction list. Save schema 6 adds a deduplicated experiment-evidence record keyed by the stable attempted tuple of operation + input + process condition. Starting a processor batch creates a `hinted` record that says only what was tried; it contains no output ID, observation key or reaction ID for player presentation. Completing that authored reaction promotes the same record to `confirmed`, after which the existing discovered reaction ID exposes the authored observation/output through the player snapshot. Repeating the same experiment never creates a second evidence record. The notebook resolves operation/material/setup labels through existing localization keys and never renders the stable IDs themselves.

### Knowledge-gated capability (Issue #33)

A machine definition may carry one optional `unlock` object with a stable prerequisite `reactionId` and a localized `hintKey`. This is deliberately not a generic prerequisite graph. Validation requires the reaction ID to exist and the hint key to belong to that machine. The fixture gates `oversealed-furnace` on confirmed `heat-raw-sealed` knowledge while leaving the existing machine/reaction identities and then-current content version intact.

Unlock state is not separately authored or persisted at runtime: it is derived from the save's confirmed reaction knowledge. Player snapshots sanitize the content rule into `{ unlocked, hintKey }`, so the prerequisite reaction ID does not leak into React/Phaser presentation before discovery.

### Authored hazardous failure (Issue #32)

A reaction may carry one optional authored hazard descriptor with a stable hazard ID plus localized name/observation keys. Hazards are only valid on reactions with an explicit process condition. The fixture adds an `oversealed` Heat setup: `raw + heat + oversealed` produces tracked vitrified residue and a deterministic `chamber-blowout` incident. The hazardous batch still consumes/produces material through the normal reaction ledger; the consequence is operational, not material deletion. The affected machine enters a persisted incident lockout, disables automatic operation, and exposes only the occurred localized incident through the player snapshot. Re-enabling the machine explicitly acknowledges/clears the incident; no generic damage/repair framework exists.

## 1. Purpose

Unknown Yield depends on a large amount of interconnected content. The project should treat this content as a first-class database rather than scattering balance and recipe logic across scene code.

The Content Studio should eventually allow designers to create, edit, validate, search, compare, and preview the game's industrial knowledge without touching implementation code.

TinyBase is the current content-store direction. Zod provides structural validation. Additional semantic validators enforce cross-table rules.

## 2. Core entities

The exact schema will evolve, but the conceptual model should cover the following.

### Material

Represents any input, intermediate, output, waste, fuel, or special substance.

Potential fields:

- stable ID;
- display name / localization key;
- tags;
- phase/category;
- icon/sprite references;
- physical/logistics traits;
- known/default handling class;
- exchange eligibility is defined by Materials Exchange content rather than a static material value;
- construction eligibility;
- hidden true properties;
- discovery presentation metadata.

Do not require every material to populate every possible physical property.

### Operation

Represents an industrial verb rather than a recipe.

Examples:

- crush;
- heat;
- cool;
- wash;
- separate;
- compress.

Potential fields:

- operation ID;
- categories;
- required machine capability;
- supported conditions;
- energy/fuel behavior;
- input constraints;
- UI presentation.

### Machine

Represents equipment able to perform one or more operations.

Potential fields:

- machine ID;
- supported operations/capabilities;
- input/output ports;
- throughput ranges;
- operating envelope;
- fuel requirements;
- failure tolerances;
- footprint;
- visual asset reference;
- unlock requirements.

Avoid encoding a single fixed recipe directly into a machine unless the design specifically calls for a dedicated machine.

### Reaction / transformation

Designer-authored truth that maps inputs + operation + conditions to outcomes.

Conceptually:

```text
inputs
+ operation
+ conditions
+ optional catalyst/context
= outputs + observations + hazards
```

Potential outcomes:

- primary outputs;
- by-products;
- waste;
- no useful yield;
- machine contamination;
- heat generation;
- pressure increase;
- hazard event;
- damage;
- new observation/discovery.

Player knowledge and designer reaction truth are separate data.

### Observation

A piece of knowledge the player can learn.

Examples:

- "reacts to salts";
- "gas expansion becomes extreme above threshold";
- "conductivity rises under compression";
- "safe in ceramic containment".

An observation can be unlocked by:

- performing an experiment;
- analyzing a sample;
- causing an accident;
- sustaining a process;
- receiving company analysis.

### Discovery / knowledge state

Save-game state recording what the player currently knows.

Do not mutate canonical content to represent one save's discoveries.

Knowledge may track:

- unknown;
- hinted;
- observed;
- confirmed;
- industrialized.

### Factory blueprint

Player-authored data, not base content.

Stores:

- footprint;
- internal machine layout;
- internal routing;
- port definitions;
- labels;
- expected input/output contract;
- optional tags/notes.

### Logistics type

Defines handling capability and restrictions.

Examples:

- bulk solid;
- ordinary liquid;
- pressure gas;
- corrosive liquid;
- cryogenic;
- sealed/atmosphere-sensitive;
- high-value secure cargo.

Transport systems and terminal modules reference capabilities rather than material names where possible.

### Terminal module

Defines a new import/export handling capability, capacity, or service.

### Fuel class

Defines company-provided operational resources.

Fuel should be data-driven rather than represented as hard-coded `fuel1/fuel2/fuel3` branches. Fuel-class identity must also be independent from the eventual player-facing name; a neutral stable ID such as `fuel-0` may remain unchanged even if its displayed name is redesigned later.

### Milestone

Represents evidence-driven progression.

Possible conditions:

- discovery confirmed;
- material extracted;
- material exported;
- stable throughput reached;
- operation demonstrated;
- terminal capability installed;
- company request completed.

Milestones may unlock machines, terminal modules, infrastructure, analysis capability, or company allocation classes.

### Materials Exchange definition

Defines economic behavior for a discovered/listed product without hard-coding market logic in UI.

Potential fields:

- material/product reference;
- baseline compensation;
- utility floor;
- demand class/curve;
- saturation sensitivity;
- recovery rate;
- volatility bounds;
- eligible company programs.

Runtime demand/saturation is save/economy state; authored curves and constraints are content.

### Corporate order

Defines temporary procurement for a **known** product: quantity, optional handling/quality requirements, duration and premium/allocation reward.

### Special directive

Defines a differentiated company opportunity such as a research sample, prototype, quality challenge, recovery request or property-based/experimental industrial problem.

Directives may reward capability, terminal modules, imported components, catalysts or unique equipment as well as fuel.

Avoid reducing the whole game to rotating quest chores.

## 3. Hidden truth vs player-facing knowledge

This distinction is central.

Example:

```text
DESIGNER TRUTH
Material A + Material B + high-pressure heat
-> Output C + dangerous pressure spike

PLAYER KNOWLEDGE
Material A: reacts under pressure
Material B: unknown interaction
Combined process: not yet tested
```

After the experiment:

```text
PLAYER KNOWLEDGE
Combination confirmed
Output C discovered
High-pressure hazard confirmed
```

The player should never gain hidden data simply because it exists in the content store.

## 4. Reaction matching

Avoid designing the first implementation as an unrestricted chemistry solver.

A practical model can match authored transformations against:

- material IDs or material tags;
- operation;
- condition ranges;
- catalysts;
- machine capability;
- process history if required.

The system should be expressive enough for surprising outcomes while remaining authorable and debuggable.

## 5. Content Studio goals

The Studio should eventually provide:

### Materials

- searchable list;
- properties;
- tags;
- asset preview;
- inbound/outbound reaction references;
- logistics requirements.

### Operations and machines

- capability matrix;
- operating ranges;
- compatibility warnings.

### Reactions

- graphical or structured input/process/output editor;
- condition editor;
- hazard definitions;
- discovery outcomes;
- reverse references.

### Knowledge graph

- view which observations/discoveries can lead to which milestones;
- identify dead-end content;
- identify accidental spoilers.

### Milestones and unlocks

- condition editor;
- dependency graph;
- circular dependency detection;
- "unreachable unlock" validation.

### Terminal / economy

- cargo handling classes;
- export compensation;
- fuel mappings;
- company requests.

### Validation dashboard

Show actionable errors and warnings, for example:

```text
ERROR
reaction-thermal-042
references missing material: volatile-keral-gas

ERROR
machine-press-01
cannot provide reaction required pressure range

WARNING
material-crystal-17
has no extraction source and no producing reaction

WARNING
milestone-deep-scan
is not reachable from the current starting content
```

## 6. IDs, presentation and localization

Use stable machine-readable IDs independent of display names, descriptions and translations.

The current implementation accepts lowercase hyphenated IDs. The exact namespace syntax may evolve, but the contract does not:

- IDs are canonical simulation/reference/save identity;
- player-facing text is presentation data;
- translated text is never identity;
- no gameplay rule may branch on an English or localized string;
- changing visible wording must not require changing an ID.

Illustrative content:

```ts
{
  id: "fuel-0",
  nameKey: "material.fuel-0.name",
  descriptionKey: "material.fuel-0.description"
}
```

An English resource may later map `material.fuel-0.name` to `Petroleum`, `Industrial Feed`, or another final name without changing `fuel-0`.

This example does **not** lock the final fuel count, names, chemistry or ordering. `fuel-0` is a stable string ID, not permission to use array position `fuels[0]` as identity.

The same rule applies to:

- materials;
- machines;
- operations;
- fuel classes;
- terminal modules;
- milestones;
- observations/discoveries;
- contracts/directives;
- other player-facing authored content.

Observations should ultimately be referenced by stable identity/localization key rather than persisting English prose in authoritative save state.

Localization resources belong at the presentation/content boundary. `sim-core` may carry stable IDs or localization keys as data, but it must not import a localization/UI framework or depend on the rendered wording.

Implemented convention (Issue #14):

- key format `/^[a-z0-9]+(\.[a-z0-9-]+)+$/`, namespaced per entity: `material.<id>.name`, `operation.<id>.name`, `machine.<id>.name`, `reaction.<id>.observation`;
- `packages/content/src/locale.ts` holds the English source/fallback catalog (`enCatalog`), the catalog shape (`localeCatalogSchema`) and `validateLocaleCoverage`, which `validateContent` enforces for every snapshot;
- `apps/web/game/i18n.ts` owns the single shared i18next instance: React resolves text via `I18nextProvider` + `useTranslation`, Phaser/tools use the same instance directly; `sim-core` snapshots expose IDs/keys only;
- new content entities must add `nameKey`/equivalent key fields plus catalog entries — missing keys fail validation, never silently substitute identity;
- keys are per-entity stable references and must match their entity exactly (`material.<id>.name`, not another entity's key): borrowing a key would couple two display names forever, so aliasing is rejected by semantic validation;
- machine runtime state uses semantic status codes (`ready`, `processing`, `disabled`, `deposit-exhausted`, `needs-compatible-input`, `needs-input`, `output-full`, `needs-fuel`): gameplay branches on codes, presentation maps them through an exhaustive label table — never English prose as domain state;
- build-toolbar machine labels resolve from content definitions through the catalog (a rename updates toolbar and inspector together); placement toasts use generic wording, never raw IDs;
- generic UI chrome (tool labels, buttons, hints, command-result toasts) stays plain English for now and is explicitly out of the content-key migration; do not mix such strings into content identity or save state;
- renaming a catalog value changes no ID, reference or save; swapping locale resources changes presentation without changing simulation state (both covered by tests).

Missing localization keys should fail visibly in development and have a readable fallback policy in player builds; silently substituting a different content identity is never valid.

Do not use array index position as identity.

Renaming or translating display text must not break saves or references.

## 7. Content versioning

Every distributable content snapshot should have a version.

Save data should record the content version it was created against.

Migrations should be explicit for:

- renamed IDs;
- removed content;
- changed factory-machine contracts;
- progression changes;
- save schema changes.

## 8. Balance values

Balance data belongs in content when practical:

- throughput;
- fuel rates;
- capacities;
- construction cost;
- terminal capacity;
- bailout amounts;
- debt repayment behavior;
- thresholds;
- milestone requirements.

Avoid magic values buried in UI or Phaser scene code.

## 9. Content fixtures

Maintain tiny canonical fixture sets for tests.

For example:

- 3–5 materials;
- 2–3 operations;
- 2 machines;
- 3 reactions;
- 1 safe reaction;
- 1 hazardous reaction;
- 1 no-useful-yield reaction;
- 2 milestones;
- 1 terminal contract.

Tests should be able to load this fixture without booting the full game.

## 10. Content Studio v1 — accepted Phase 4 slice

Do not build a giant editor merely because the content model may grow later.

Phase 4 v1 proves:

1. create/edit materials, operations, machines and reactions through TinyBase authoring state;
2. author English source/fallback text while stable IDs and localization keys remain canonical identity references;
3. validate complete structural/semantic content plus locale coverage before export;
4. inspect reverse references for core stable IDs;
5. export/import a deterministic versioned `{ schemaVersion, content, locale }` bundle;
6. preview a selected reaction through a fresh isolated real `Simulation`, including conditioned and hazardous outcomes;
7. author a completely new material + operation + machine + reaction and preview it without a per-content sim-core code change;
8. keep the Studio development-only and absent from the player static export.

TinyBase may contain temporarily invalid draft combinations during editing; invalid bundles cannot export or preview.

Site/economy/storage editors, knowledge-graph breadth, market/company authoring, asset management and runtime mod loading remain later work driven by their gameplay phases.
