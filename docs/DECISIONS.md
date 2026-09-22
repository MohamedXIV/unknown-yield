# Decision Log

This document records project decisions that should not be casually reopened by future implementation work. Decisions can change, but changes should be explicit and supported by new evidence.

## D-001 — Runtime presentation is 2D

**Status:** accepted

Unknown Yield targets a fixed top-down / three-quarter 2D presentation.

3D runtime rendering is not the current direction.

### Reason

A full 3D industrial game substantially raises art, lighting, material, asset, environment, polish, and production expectations. The project gains more from controlled 2D art and data/simulation depth.

### Consequence

Do not introduce a 3D runtime engine because a single mechanic seems easier to depict in 3D.

---

## D-002 — 3D blockouts are part of the 2D art workflow

**Status:** accepted

Simple 3D models, animation, camera renders, and render passes may be used to guide AI-assisted sprite generation.

### Reason

This provides consistent perspective, silhouette, part placement, and animation while keeping runtime assets 2D.

### Consequence

3D authoring tools are production tools, not evidence that the runtime should become 3D.

---

## D-003 — Next.js + React are the application/tooling shell

**Status:** accepted

Next.js is allowed and encouraged where it provides application/UI/tooling value.

### Responsibilities

- HUD;
- inspectors;
- terminal UI;
- knowledge UI;
- Content Studio;
- debug tooling.

### Consequence

Next.js does not own world simulation.

---

## D-004 — Phaser 4 owns world rendering and interaction

**Status:** accepted

Phaser is the primary world renderer/input layer.

### Consequence

Do not put authoritative production logic inside Phaser GameObjects or scene update methods.

---

## D-005 — Simulation begins in pure TypeScript

**Status:** accepted

The authoritative gameplay simulation starts as a renderer-independent TypeScript package.

### Reason

- fastest iteration;
- easy testing;
- shared language across project;
- good AI/tool support;
- sufficient performance until proven otherwise.

### Consequence

No Rust rewrite at foundation stage.

---

## D-006 — Rust/WASM is a measured optimization path

**Status:** accepted

Rust may be introduced later for proven bottlenecks.

### Gate

A reproducible benchmark must show an important budget failure after simpler TypeScript/data-layout/update-frequency improvements.

### Consequence

Keep the simulation API coarse enough that implementation can move without changing gameplay clients.

---

## D-007 — TinyBase is content data, not default per-frame world state

**Status:** accepted

TinyBase drives the data-centric Content Studio and game definitions.

### Consequence

Do not store every belt item/vehicle transform/machine tick as reactive TinyBase state by default.

---

## D-008 — Content and saves are separately versioned

**Status:** accepted

Designer-authored content definitions and player save state are distinct artifacts.

### Consequence

A save records the content version it depends on and may require migration.

---

## D-009 — No generic XP progression

**Status:** accepted

Progression is based on discoveries, demonstrated capability, industrial milestones, and company relationships.

### Consequence

Do not implement "mine N ore -> gain generic XP -> purchase arbitrary tech" without a new design decision.

---

## D-010 — Recipes are hidden player knowledge

**Status:** accepted

The implementation may contain deterministic reaction definitions, but the player does not automatically see them.

### Consequence

Designer truth and player knowledge must be modeled separately.

---

## D-011 — Factory as function is a core identity

**Status:** accepted

Player-built factory interiors can become external black boxes with explicit input/output contracts once solved/stable.

### Consequence

Architecture and UI should support both detailed editing and aggregate operation.

---

## D-012 — Company/terminal dependency is a core identity

**Status:** accepted

The expedition remains connected to and dependent on off-world company infrastructure.

### Consequence

Exports should have operational purpose beyond abstract money.

---

## D-013 — Scope is intentionally narrower than major factory sandboxes

**Status:** accepted

Combat, survival systems, huge technology catalogs, multiplayer, fully physical chemistry, and large vehicle ecosystems are not foundation requirements.

### Consequence

Do not add genre-standard systems merely because comparable games contain them.

---

## How to change a decision

When evidence requires a change:

1. update this document;
2. state the old decision;
3. state the new decision;
4. explain evidence/trade-off;
5. update affected design/architecture docs;
6. avoid leaving contradictory guidance in the repository.
