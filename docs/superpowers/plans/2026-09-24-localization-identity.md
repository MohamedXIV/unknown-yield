# Issue #14 — Localization-ready content identity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stable machine-readable IDs become the only content identity; all player-facing wording resolves through localization keys/resources. Approved as-is by the owner.

**Architecture:** `packages/content` owns key fields, the English catalog, Zod + semantic key validation (no new runtime deps). `apps/web` owns one shared i18next instance (`react-i18next` for React, direct `t()` for Phaser). `sim-core` snapshots carry IDs/keys only. TinyBase authors key fields.

**Tech Stack:** TypeScript, Zod, Vitest, new `apps/web` deps `i18next` + `react-i18next` (React-19/static-export compatible).

**Spec:** Issue #14 (ACTIVE, no open PR at planning), D-022, AGENTS.md Stable-IDs section. Base `origin/main` (`4ff6049…`), branch `feat/14-localization-identity`.

## Global Constraints

- `sim-core` must not import i18next/react-i18next/TinyBase/DOM; no rule branches on display text.
- Command-result messages stay English (generic UI strings — document, don't migrate).
- No translation beyond one English catalog; no fuel naming/model changes; no Studio expansion; no #4–#9 work.
- Content version `world-01-v2` → `world-01-v3`; old saves rejected on content-version mismatch (explicit, disposable-prototype precedent). Save schema stays 3.
- Key convention: `material.<id>.name`, `operation.<id>.name`, `machine.<id>.name`, `reaction.<id>.observation`; format `/^[a-z0-9]+(\.[a-z0-9-]+)+$/`.

## Review Focus

- Raw key rendered in UI — pinned by coverage validation + no-display-strings snapshot test + English-path assertions.
- `sim-core` importing locale/i18n libs — pinned by dependency-direction test.
- New content without catalog entries — pinned by `validateLocaleCoverage` throwing.
- Rename breaking saves/references — pinned by rename-robustness test.
- Locale swap changing sim state — pinned by swap test on `serialize()` equality.

---

### Task 1: Content keys + English catalog + version bump

**Files:**
- Modify: `packages/content/src/schema.ts`, `packages/content/src/fixture.ts`, `packages/content/src/index.ts`, `packages/content/test/content.test.ts`
- Create: `packages/content/src/locale.ts`

**Interfaces:**
- Consumes: existing `contentSchema`/`validateContent`.
- Produces: `enCatalog: Record<string,string>`; `validateLocaleCoverage(content, catalog): void` (throws `Missing localization key: <key>`).

- [ ] **Step 1: Write the failing test** — coverage pass, bogus-key throw, malformed-catalog throw, TinyBase round-trip on `nameKey`.
- [ ] **Step 2: Run test to verify it fails** — `npx vitest run packages/content`.
- [ ] **Step 3: Implement** — `name`→`nameKey`, `observation`→`observationKey`, key regex, semantic coverage in `validateContent`, fixture key migration, version `world-01-v3`.
- [ ] **Step 4: Run tests to verify pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(content): stable IDs with localization keys and validated English catalog"`

### Task 2: sim-core key-only snapshots

**Files:**
- Modify: `packages/sim-core/src/types.ts` (`MachineView.name`→`nameKey`; `Observation`→`{operationId,inputId,outputId,textKey}`), `src/simulation.ts` (ID/key mapping, drop `.name`/`.observation` lookups), `test/simulation.test.ts`, `test/ledger.test.ts`
- Create: `packages/sim-core/test/no-display-strings.test.ts`

**Interfaces:**
- Consumes: Task 1 key fields. Produces: key-only `PlayerSnapshot` for Task 3. `save.ts`/`ledger.ts`/`commands.ts` unchanged.

- [ ] **Step 1: Write failing tests** (ID/key assertions + no-display-strings + no-i18n-import).
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npx vitest run packages/sim-core` green.**
- [ ] **Step 5: Commit** — `git commit -m "feat(sim-core): snapshots carry stable IDs and localization keys"`

### Task 3: Web i18n runtime + UI migration

**Files:**
- Modify: `apps/web/package.json`, `components/GameClient.tsx`, `game/world.ts`, `components/Studio.tsx`
- Create: `apps/web/game/i18n.ts`, `apps/web/test/i18n.test.ts`

**Interfaces:**
- Consumes: `enCatalog` via `@site/content/locale` (verify subpath style vs `@site/content/studio`); key-only snapshot.
- Produces: English-identical player path, no raw keys.

- [ ] **Step 1: Write failing web tests** (missing-key fallback, locale swap with identical `serialize()`).
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** (deps, shared instance + provider, migrate touchpoints: GameClient material/machine/operation names, observations, aria labels; world.ts deposit/factory/discovery labels + identity keys; Studio `nameKey` cell).
- [ ] **Step 4: Run `npm test` green.**
- [ ] **Step 5: Commit** — `git commit -m "feat(web): resolve content text through shared i18next catalog"`

### Task 4: Docs + baseline + PR

**Files:**
- Modify: `docs/CONTENT_MODEL.md` (key convention, catalog ownership, generic-UI-string rule, version note)

- [ ] **Step 1: Update docs.**
- [ ] **Step 2: Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`; record results.**
- [ ] **Step 3: Scope-creep check** (only listed files; no i18next/TinyBase runtime imports in `sim-core/src`).
- [ ] **Step 4: Push only `feat/14-localization-identity`.**
- [ ] **Step 5: Open PR closing #14; report number + head SHA. Do NOT merge.**

## Self-Review

- Every Scope/Acceptance bullet maps to a task + named test; Non-goals excluded.
- Exact files/lines/key formats/commands/assertions specified; type names consistent across tasks.
