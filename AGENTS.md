# AGENTS.md

These rules apply to humans and coding agents working in this repository.

## 1. Source of truth

Read the relevant files in `docs/` before changing architecture or gameplay foundations.

Live repository state overrides stale task descriptions.

If implementation and docs disagree, do not silently choose one. Determine whether the code is incomplete or the decision changed, then update the appropriate source of truth.

## 2. Core architecture rules

### Simulation

Authoritative gameplay logic belongs in the pure TypeScript simulation domain.

Do not put production truth in:

- Phaser scene update loops;
- Phaser GameObjects;
- React components;
- CSS/DOM state;
- TinyBase reactive UI rows by default.

### Phaser

Phaser owns world presentation and interaction.

It may:

- render simulation snapshots;
- interpolate positions;
- handle camera/input;
- show effects.

It must not become the authoritative source for inventory, production, discovery, or progression.

### React / Next.js

React owns application UI and tools.

Do not stream per-frame world transforms through React state.

### TinyBase

TinyBase owns editable content definitions and Content Studio queries.

Do not use it as an automatic replacement for optimized runtime simulation structures.

## 3. Keep the simulation portable

`sim-core` must not import Phaser, React, Next.js, DOM, or Canvas APIs.

Prefer coarse interfaces such as:

- `command(...)`;
- `step(...)`;
- `snapshot(...)`;
- `serialize()`.

This keeps Web Worker and possible Rust/WASM migration viable.

## 4. No premature Rust

Do not introduce Rust/WASM because the simulation might become large.

Required evidence:

- reproducible benchmark;
- profiler evidence;
- important target budget failure;
- simpler TypeScript fixes considered first.

## 5. Data-driven content

Do not hard-code game content or balance into renderer/UI logic when it belongs in content data.

Examples that generally belong in content:

- materials;
- process definitions;
- reactions;
- hazards;
- machine capabilities;
- costs;
- throughput;
- milestone thresholds;
- fuel classes;
- terminal capabilities;
- company requests.

Avoid magic numbers.

### Stable IDs and localization

Treat machine-readable content IDs as canonical identity and player-facing wording as replaceable presentation data.

- saves, references and simulation rules use stable IDs;
- do not use display names, translated strings or array positions as identity;
- new player-facing authored text should use localization keys/resources rather than being embedded as English simulation truth;
- keep localization resolution outside authoritative `sim-core` logic;
- a visible rename/translation should not require a save migration unless the stable ID itself truly changes;
- do not choose final content names merely to satisfy an internal identifier. A neutral ID such as `fuel-0` may outlive several display-name iterations.

Localization-ready does not mean translating the whole game during foundation work. Prefer a small validated resource boundary over a heavyweight framework unless requirements justify one.

## 6. Hidden knowledge rule

Do not leak authored reaction truth directly into player UI.

Keep separate:

- canonical content truth;
- current save's discovered knowledge.

Tests should cover this boundary.

### Material conservation

The target simulation obeys a material-conservation invariant:

> Nothing disappears. Every produced material remains in a tracked physical location until it is transformed, consumed by a defined process, stored, or exported off-map.

Do not add generic delete/discard mechanics as final gameplay. Waste and dead stock are gameplay state. Storage is geography, not a magical global inventory. Prototype shortcuts must be explicitly documented and must not be expanded as if they were accepted design.

When inventory systems change, add conservation/regression tests that reconcile extraction, transformation, storage, transit, factory buffers, export, and defined consumption.

## 7. Scope discipline

Do not add a generic framework, subsystem, dependency, or abstraction solely for hypothetical future use.

Especially avoid foundation work for:

- combat;
- multiplayer;
- 3D runtime rendering;
- ECS rewrites;
- native desktop packaging;
- advanced rail systems;
- procedural world generation;
- Rust/WASM.

Build only what the active vertical slice needs, unless an explicit task changes scope.

## 8. Testing

Prefer domain tests over presentation tests.

Any change to sim-core should include focused tests for its rules.

Content changes should pass:

- schema validation;
- reference integrity;
- semantic validation where applicable.

For bugs, add a regression test when the behavior can be expressed deterministically.

GitHub Actions CI mirrors the repository baseline (`npm test`, typecheck, lint, build) only at economical merge gates: ready/non-draft PR updates or explicit manual dispatch. Draft PRs, docs-only changes, and duplicate post-merge `main` pushes do not spend CI minutes; newer PR commits cancel older in-progress runs. CI is automated evidence, not a substitute for issue-required browser/device acceptance.

## 9. Performance work

Do not optimize by intuition alone.

For meaningful performance changes, record:

- scenario;
- entity/system scale;
- before measurement;
- after measurement;
- hardware/runtime if relevant.

Prefer lower-frequency simulation, aggregation, data layout, and worker isolation before language migration.

## 10. Save compatibility

Do not change serialized structures casually.

When a persisted schema changes:

- bump the relevant version;
- provide migration or explicitly declare incompatibility while the project is still in a disposable prototype phase;
- update tests.

Content version and save schema version are different concepts.

## 11. Art integration

Runtime art is 2D.

Do not add 3D runtime dependencies to support the asset-generation pipeline.

3D blockouts/renders are source/reference assets used to create consistent 2D output.

## 12. Development workflow

For roadmap work, read `docs/EXECUTION.md` and the active GitHub issue. Issue #2 is the archived execution history. Use docs/EXECUTION.md for current direction and the next explicitly agreed gameplay issue for active scope; preserve dependencies within that scope.

If a canonical issue already has an open PR, continue/review that PR before starting parallel implementation for the same scope.

For each task:

1. inspect current code/docs relevant to the task;
2. make the smallest coherent change;
3. add/update tests;
4. run focused checks first;
5. run broader checks appropriate to the touched packages;
6. report exact evidence: changed files, tests, failures, and unresolved risks;
7. reference the issue in the PR and keep the PR scoped to that issue's acceptance gate;
8. after merge, recheck docs/EXECUTION.md and the active issue before selecting the next agreed task.

Avoid broad repo-wide audits when the current task is narrow. Do not create speculative child issues for distant phases merely to look organized.

## 13. Documentation

Update docs when a change modifies:

- a core design pillar;
- architecture boundaries;
- content model;
- simulation contract;
- art pipeline;
- roadmap phase/gate;
- an accepted decision.

Do not turn one example material, recipe, map layout, or number into sacred global content unless explicitly locked.

## 14. Naming and working title

`Unknown Yield` is the current working title.

Do not couple internal architecture to the title. Package/domain naming should survive a future title change where practical.
