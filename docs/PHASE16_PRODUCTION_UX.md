# Phase 16 — Production knowledge, inspector and terminal UX (#156)

Issue #156 brings the accepted information surfaces to production-slice quality without redesigning the simulation or turning the game into a dashboard shell.

## World-first rule

The world remains the primary interaction surface.

- selecting equipment opens the Inspector;
- the Notebook is a compact evidence surface, not a recipe database;
- the Terminal is an industrial interaction surface tied to physical cargo and company state;
- every summary is derived from the public PlayerSnapshot;
- no panel creates hidden truth, advances simulation state or invents a second diagnostic model.

## Shared context hierarchy

Notebook, Inspector and Terminal now start with the same small hierarchy:

1. **What state am I looking at?**
2. **Why is it important or blocked?**
3. **What is the useful next action?**

The summary strip is intentionally narrow and subordinate to the world.

### Inspector

The Inspector converts existing semantic machine/factory/transport state into concise cause/action language.

Examples:

- output-full -> downstream capacity or connection is the problem;
- needs-input -> trace upstream physical supply;
- special fuel missing -> inspect the terminal-held physical fuel;
- incident -> recover trapped material before restart;
- factory blockage -> inspect the external contract and preserved internal buffers before destructive rebuild.

The detailed authoritative data remains below the summary. No hidden reaction output is inferred.

### Field Notebook

The Notebook keeps the established evidence cards and adds four presentation-only filters:

- **All**
- **Open** — hinted experiments and unresolved branches;
- **Hazards** — observed hazard evidence;
- **Confirmed** — confirmed observations and non-branch findings.

The overview reports counts derived from public evidence only. Hidden reaction IDs and undiscovered outputs remain absent.

### Company Terminal

The Terminal leads with the physical/current priority:

- manifest ready;
- exportable cargo physically staged;
- outstanding obligation;
- active company work;
- otherwise terminal idle.

A compact section navigator jumps within the existing Terminal surface:

- Work
- Handling
- Shipment
- Company

This reduces long-panel hunting without splitting the Terminal into a SaaS-style multi-page application.

## Authority and compatibility

#156 changes presentation only.

It does **not** change:

- sim-core commands;
- save schema;
- content version;
- physical inventory semantics;
- market/opportunity rules;
- hidden-knowledge boundaries;
- shipment or assistance behavior.

The new production UX helpers consume only PlayerSnapshot and return display summaries/filters.

## Acceptance evidence

The merge gate requires:

- focused deterministic tests for Notebook filtering, Terminal priority and Inspector diagnosis;
- regression that production summaries do not contain canonical hidden reaction IDs;
- real-browser proof that Notebook filters and Terminal section navigation render and respond;
- full repository tests;
- typecheck;
- lint;
- production build;
- security checks;
- no unresolved blocking review threads.
