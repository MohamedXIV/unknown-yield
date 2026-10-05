# Phase 15 — Partial knowledge graph and discovery hints (#146)

Issue #146 expands what the player can infer from evidence without turning the Field Notebook into a recipe database.

## Contract

Authoritative recipe truth remains in content and confirmed reaction identity remains in save evidence.

The new `knowledgeInsights` content table is presentation guidance only. Each insight contains:

- a stable insight ID;
- a **known target material**;
- a player-facing kind: `property`, `branch` or `opportunity`;
- a localization key;
- one evidence trigger.

Evidence triggers may be:

- `material-known`: the company already knows the material exists;
- `reaction-evidence`: a specific authored reaction has reached exactly `hinted` or `confirmed` evidence.

The trigger is **never emitted in PlayerSnapshot**. The public view contains only the insight ID, target material, kind and localized text key.

## Secrecy rules

An insight is visible only when its target material is already company-known.

This means reaction evidence cannot reveal the name/identity of an undiscovered output. A hinted experiment still exposes only the existing experiment card: input + operation + setup, with no output.

Confirmed evidence may make the produced material known through the existing reaction-discovery path. Only then can an insight targeted at that material appear.

There is no second persisted knowledge state. Insight visibility is derived from:

- `Save.knowledge`;
- `Save.evidence`;
- initially-known material definitions.

Save/load therefore restores the same graph automatically.

## Representative authored graph

### Ferrite

Initially visible:

- **Observed property:** ferrite feeds structural plate production, so alternate uses compete with physical expansion.
- **Open branch:** ferrite has unresolved thermal behavior.

After `heat-ferrite` is confirmed:

- **Company opportunity:** magnetic ceramic is valuable in small batches but saturates quickly.

### Veined material

Initially visible:

- **Open branch:** veined ore has multiple transformation paths and may leave ordinary dry handling.

After `liquefy-raw` is confirmed:

- **Observed property:** the discovered liquid phase requires corrosion-resistant containment.

### Resonant catalyst

Initially visible:

- **Open branch:** catalytic stone has competing commodity and higher-grade uses.

After `crush-catalyst` is confirmed:

- **Company opportunity:** catalyst powder is a lower-value but slower-saturating outlet.

After `sinter-catalyst` is confirmed:

- **Company opportunity:** the local resonant-matrix route is strategically more valuable and competes for the same scarce feedstock.

## UI

The Field Notebook renders **Material findings** before detailed experiment/hazard evidence.

The cards deliberately omit:

- reaction IDs;
- output IDs not already known;
- hidden authored alternatives;
- complete process chains.

The existing experiment and hazard cards remain the source of exact observed process history.

## Compatibility

No save schema change is required.

`knowledgeInsights` defaults to an empty array for older authored content, and the current Studio bundle preserves the table through its existing base-content passthrough even though #146 does not add dedicated Studio editing controls.

Dedicated Studio expansion remains #151 and must still be justified by repeated authoring pain.
