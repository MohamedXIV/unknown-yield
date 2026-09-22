> **Historical plan — superseded 2026-09-22.** The user replaced this fixed-site implementation scope with the player-built world in [`docs/WORLD_BUILDING.md`](../../WORLD_BUILDING.md). Its deferred-building constraints and proposed checks are not current requirements. Read [`docs/IMPLEMENTATION_LOG.md`](../../IMPLEMENTATION_LOG.md) for the delivered scope and evidence.

# First Playable Implementation Plan

> Execute inline using superpowers:executing-plans. User approved the specification and requested execution on 2026-09-22.

**Goal:** Deliver a browser-playable discovery-to-export scenario with content validation and portable simulation.

**Architecture:** Next/React presents coarse player snapshots. A browser-only Phaser view renders the authored site. Pure TypeScript owns commands, batches, transfers, discoveries, economy, and saves; TinyBase edits validated content independently.

**Tech stack:** TypeScript, Next, React, Phaser 4, TinyBase, Zod, Vitest, ESLint.

**Spec:** `docs/FIRST_PLAYABLE.md`

## Global constraints

- No renderer imports in sim-core; no per-frame React transforms.
- Hidden canonical reactions never enter undiscovered player views.
- No free building placement, workers, aggregate simulation, or new engine packages.
- Studio is a separate development-only entry, absent from production export.
- Validate saves before replacing live state; content/save versions are separate.

## Review focus

1. Invalid/non-finite command inputs must not mutate inventories (Task 2).
2. Full buffers and competing incoming links must not discard output (Task 2).
3. Partial-batch reload and fractional tick remainder must continue identically (Task 2).
4. Exhausted fuel and debt must permit recovery without free repeated grants (Task 2).
5. Mount/unmount, hidden tabs, and storage failures must leave the game usable (Task 3).

## Task 1 — Validated content and executable workspace

Files: root package/TypeScript/Vitest/ESLint configuration; `packages/content/src/{schema,fixture,studio,index}.ts`; `packages/content/test/content.test.ts`.

Interface: `validateContent(input: unknown): Content`; `fixture: Content`; `createContentStore(content: Content)` and `contentFromStore(store, base): Content`.

- [ ] Set up npm workspaces and pinned dependencies; provide test/typecheck/lint/dev/build scripts.
- [ ] Write content tests first, run `npm test -- packages/content`, then implement schema, duplicate/reference/capability/semantic checks and the tiny authored scenario.
- [ ] Test TinyBase material edit/export/import against the same validation boundary.

Core acceptance example:
```ts
const candidate = structuredClone(fixture);
candidate.reactions[0].output = 'missing';
expect(() => validateContent(candidate)).toThrow();
```

## Task 2 — Simulation, knowledge, economy, saves

Files: `packages/sim-core/src/{types,simulation,save,index}.ts`; `packages/sim-core/test/simulation.test.ts`.

Consumes `Content`. Produces `Simulation`, with `command(GameCommand): CommandResult`, `step(deltaMs: number): void`, `snapshot(): PlayerSnapshot`, `serialize(): Save`, `load(input: unknown): CommandResult`.

- [ ] Write failing tests for extraction/experiments/discovery, inventory conservation, links, repeat mode, debt and milestone, save validation and deterministic continuation.
- [ ] Implement deterministic tick order: finish batches, transfer bounded units, start enabled batches. Commands can start one experiment or toggle repeat production.
- [ ] Validate links (extractor→processor, processor→terminal), reserve batch output capacity, and debit inputs/fuel once at start.
- [ ] Serialize authoritative state and tick remainder. Reject incompatible versions, malformed jobs, unknown IDs, invalid knowledge, quantities, links, and counters before replacing state.
- [ ] Run `npm test -- packages/sim-core`, then full `npm test` and typecheck.

Core acceptance example:
```ts
const a = new Simulation(fixture);
a.command({type: 'run', machineId: 'extractor'});
a.step(450);
const b = new Simulation(fixture);
expect(b.load(a.serialize()).ok).toBe(true);
a.step(1550); b.step(1550);
expect(b.serialize()).toEqual(a.serialize());
```

## Task 3 — Playable world and development Studio

Files: `apps/web/app/{layout,page,globals.css}`, `apps/web/components/{GameClient,GameHost,Studio}.tsx`, `apps/web/game/{world,session}.ts`, `apps/web/next.config.ts`, `scripts/{studio,verify-export}.mjs`.

Consumes only player snapshots/commands in UI and Phaser. Session owns wall-clock handling and save storage. World owns fixed camera, grid, authored scene, roof presentation, ports and transfer animation.

- [ ] Add a browser smoke specification for sample→experiment→repeat→export→fuel and save/reload; verify initial missing entry before implementation.
- [ ] Create a responsive industrial field-console layout with in-canvas selection, keyboard/pointer pan, zoom, roof toggle, machine operations, directed links, knowledge log and terminal controls.
- [ ] Use a stable host with cleanup; pause when hidden and cap catch-up. Handle storage failure with visible feedback; provide explicit save/load/reset.
- [ ] Add the TinyBase material editor via an opt-in generated development route. Production builds omit that route and verify no Studio output exists.
- [ ] Verify with browser interactions, including first unknown result, recoverable failure, no spoiler, export, save/load, roof, and Studio validation.

## Task 4 — Verification and handoff

- [ ] Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`; fix observed failures and add deterministic regression cases where appropriate.
- [ ] Inspect the actual browser rendering and runtime logs. Keep the playable local preview available.
- [ ] Update README with exact setup, controls, script commands, save compatibility and current limitations; record actual verification evidence in `docs/IMPLEMENTATION_LOG.md`.

## Execution rulings

- Continue inline after the user's explicit “اعتمد، انطلق”; no repeated approval for the already authorized implementation.
- Work in the existing checkout on a `codex/` branch to preserve the approved uncommitted documentation. No remote-agent work.
