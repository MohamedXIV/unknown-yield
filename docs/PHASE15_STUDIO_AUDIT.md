# Phase 15 — Content Studio gap audit and targeted tooling (#151)

Issue #151 audits real Phase 15 authoring work before adding more editor surface.

## Evidence from Phase 15

The canonical fixture was edited directly in every content-heavy Phase 15 child before this audit:

- #145 / PR #198 — new materials, reactions and exchange listings;
- #146 / PR #199 — knowledge insight content;
- #147 / PR #200 — fuel classes and machine fuel assignments;
- #148 / PR #201 — imports, property directives, sensing and deep-resource content;
- #149 / PR #202 — late materials, reactions, hazards, machines and exchange content.

The existing Studio already absorbed repeated core-table needs over time: materials, operations, machines and reactions, including containment, fuel-class assignment and hazard/unlock fields.

The repeated gap that remains across multiple accepted children is **economy authoring**. Exchange listings, off-world imports, Corporate Orders and property directives still required direct fixture edits even when the related materials/reactions were already Studio-authorable.

## Decision

**GO — narrowly targeted economy authoring.**

Add explicit Studio tables and workbench tabs for exactly:

1. Materials Exchange listings;
2. off-world imports;
3. Corporate Orders;
4. property-based Special Directives.

Do not add a generic raw JSON editor.

Do not add dedicated Studio authoring for the following under #151:

- milestones;
- sensing capabilities/signals/deposits;
- fuel-class definitions;
- knowledge insights;
- terminal modules;
- storage/site geometry;
- asset/art workflows.

Those remain passthrough content until repeated authoring friction independently justifies them.

## Store contract

The Studio TinyBase draft now mirrors the four accepted economy tables in addition to the Phase 4 core tables.

Stable identity remains authoritative:

- Exchange listing row ID = material ID;
- Import row ID = import supply ID;
- Order row ID = order ID;
- Property Directive row ID = directive ID.

The exported Studio bundle wire format remains schema version **1**. The bundle has always contained the complete validated `content + locale` snapshot; #151 changes only which fields the authoring store can mutate before that snapshot is emitted.

Untouched economy tables and all site data are preserved from the current base content.

## Workbench behavior

The development-only workbench exposes explicit tabs rather than a generic schema editor.

### Exchange

Authors:

- base/floor compensation;
- base demand;
- saturation per unit;
- saturation recovery;
- demand recovery;
- optional outbound terminal capability.

A new Exchange record must name an existing material by stable ID.

### Imports

Authors:

- localized name/brief;
- material;
- quantity;
- company fuel cost;
- optional terminal module;
- optional prerequisite opportunity.

### Orders

Authors:

- localized name/brief;
- requested material;
- quantity;
- offer duration;
- one-shot fuel reward.

### Property Directives

Authors:

- localized name/brief/property goal;
- target material;
- acceptable solution reaction IDs;
- duration;
- optional fuel reward;
- optional physical import reward.

Solution reaction IDs remain developer-only canonical spoilers; player UI still receives only the existing public directive view.

## Validation and references

Drafts may be temporarily invalid while being edited, matching Studio v1 behavior.

Validation/export remains fail-closed through the canonical `validateContent` boundary.

Reverse references now include the targeted economy relationships so a developer can see that a material is used by an Exchange listing/import/order/property directive, and that a reaction is an accepted property-directive solution before deleting or renaming stable content.

## Explicit non-goals

#151 does not:

- expose Content Studio to the player runtime;
- create a production `/studio` route;
- change sim-core authority;
- change save data;
- change Studio bundle wire schema;
- invent generic economy objects;
- expand to every content table simply because it exists.

## Acceptance gate

The exact closing PR head must prove:

- canonical economy rows load into the Studio draft;
- economy edits round-trip through the existing versioned bundle;
- new economy records can be authored with stable IDs/localization;
- untouched site/economy tables remain byte-equivalent at the content-object level;
- reverse references cover the new relationships;
- existing Phase 4 authoring/preview tests remain green;
- full tests, typecheck, lint and build pass.
