# Content Model

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
- value/export metadata;
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

Fuel should be data-driven rather than represented as hard-coded `fuel1/fuel2/fuel3` branches.

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

### Corporate request / contract

Defines temporary or persistent company demand.

Possible purposes:

- request samples;
- create an export incentive;
- require proof of capability;
- unlock analysis;
- diversify production.

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
reaction.thermal_042
references missing material: volatile_keral_gas

ERROR
machine.press_01
cannot provide reaction required pressure range

WARNING
material.crystal_17
has no extraction source and no producing reaction

WARNING
milestone.deep_scan
is not reachable from the current starting content
```

## 6. IDs and references

Use stable machine-readable IDs independent of display names.

Good:

```text
material.keralith_raw
operation.crush
machine.basic_crusher
reaction.keralith_crush
milestone.first_stable_powder
```

Do not use array index position as identity.

Renaming display text must not break saves or references.

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

## 10. First Studio slice

Do not build a giant editor before gameplay exists.

The first Studio only needs to prove:

1. create/edit materials;
2. create/edit operations;
3. create/edit reactions;
4. validate references;
5. preview a selected reaction in a small simulation harness;
6. export/load a versioned content snapshot.

Everything else can grow from actual design pain.
