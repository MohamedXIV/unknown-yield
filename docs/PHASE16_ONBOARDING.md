# Phase 16 — Contextual onboarding (#155)

Issue #155 replaces the early static build checklist with a small state-derived **Field Brief** that teaches the accepted game language without exposing recipes or turning the opening into a tutorial corridor.

## Interaction rule

Only one onboarding beat is shown at a time.

The brief is derived from the same public `PlayerSnapshot` the player can already inspect, plus three presentation-only interaction signals:

- whether the Field Notebook has been opened;
- whether the Company Terminal has been opened;
- whether the player has toggled a factory closed/open.

No onboarding state is written into sim-core or the save schema.

The player may close the brief at any time and reopen it from the help button.

## Six normal beats

### 1. Read the site / camera and building

Before the first extractor exists, the brief teaches:

- right-drag pan;
- scroll zoom;
- Home recenter;
- placement preview;
- input/output arrows;
- placing an Extractor on a visible deposit.

It does not name a hidden process outcome.

### 2. Physical inventory

Once extraction exists but no factory exists, the brief explains that material remains physically in machines, belts, storage, factory buffers or terminal staging.

The next useful action is to establish a factory and connect it with belts/ports. Storage is described as geography, not global inventory.

### 3. Experimentation

Once a factory exists but no non-initial evidence exists, the brief explicitly teaches the game’s epistemic rule:

**operate a plausible process and learn from the result rather than looking for a recipe list.**

The copy discusses setup/input/condition but never embeds reaction IDs or hidden outputs.

### 4. Evidence

After the expedition obtains non-initial knowledge, the brief points to the Field Notebook.

It distinguishes:

- confirmed observations;
- unresolved branches;
- hazard evidence.

This beat completes when the player actually opens the Notebook.

### 5. Factory closure / reopen

The player is asked to close and reopen one factory.

Two user toggles demonstrate that a solved factory is persistent capital: closing changes presentation/operating context, while reopening exposes the preserved internal machines, buffers and connections.

### 6. Terminal / export

The final normal beat points to the Company Terminal and physical shipment manifest.

Opening the terminal changes the guidance from “find the terminal” to “stage and dispatch something the site actually produced.” The beat completes only after authoritative exported quantity becomes non-zero.

## Recovery interrupt

Recovery is not forced as a seventh checklist item.

If a machine or pump has an active incident at any point, the Field Brief temporarily switches to **RECOVERY**:

- inspect the affected equipment;
- use the currently available drain, reclaim, repair or safer-setup action;
- consult the Notebook for evidence.

When the physical incident is gone, normal onboarding resumes from the state-derived beat.

This lets failure teach recovery when it actually occurs instead of asking the opening expedition to manufacture a contrived accident.

## Completion

After the first export the brief reduces to the core loop:

**Discover → Experiment → Industrialize → Export**

It reminds the player to diagnose blockage/failure from world state and evidence rather than expecting hidden answers.

## Spoiler / authority boundary

Onboarding consumes only public snapshot state.

Focused tests assert that the copy does not embed canonical hidden reaction IDs. It never advances sim state, grants knowledge, injects inventory or marks gameplay milestones.

## Acceptance

The merge gate requires:

- deterministic beat progression tests from landing through export;
- recovery interrupt coverage;
- hidden-recipe-ID regression;
- real-browser verification of the initial contextual brief;
- full repository tests, typecheck, lint and build on the exact PR head.

No sim/save/content schema change is part of #155.
