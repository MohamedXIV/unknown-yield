# Issue #3 — Material ledger and conservation invariants — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make material conservation an executable simulation invariant via a reusable `sim-core` ledger module plus cumulative flow accounting.

**Architecture:** New pure-TS `packages/sim-core/src/ledger.ts` (`collectLedger`/`auditLedger`) over the existing `Save` shape. Four aggregate per-material flow counters (`consumed`/`produced`/`exported`/`discarded`) persist in `Save.flows`; escrow (in-flight jobs) and embodied construction are computed holdings. Save schema 2→3; v2 explicitly rejected (user decision, precedent D-018). Per-material invariant:

```text
depositsRemaining + stock + machineInput + machineOutput + beltCargo + escrow + embodied
  + flows.exported + flows.discarded + flows.consumed
    = initialStock + initialDeposits + flows.produced
```

Matches `docs/ECONOMY.md` §8. Batching preserved (aggregates only, no per-unit objects).

**Tech Stack:** TypeScript, Zod (save boundary), Vitest. No new dependencies. No Phaser/React/TinyBase/DOM in `sim-core`.

**Spec:** GitHub Issue #3 (`[P1.5] Establish material ledger and conservation invariants`), parent roadmap Issue #2, contract in `docs/ECONOMY.md` §§6–8 and `AGENTS.md` §6.

## Global Constraints

- `sim-core` remains authoritative pure TypeScript; no presentation/content-authoring imports.
- No Rust/WASM, ECS, workers, market systems, Studio expansion, advanced logistics.
- No Issue #14 localization work; no Issues #4–#8 implementation beyond minimum interfaces.
- Do NOT expand the `discard` shortcut — only account it as an explicit sink (removal is Issue #5).
- Save schema bump requires version bump + explicit incompatibility declaration (done: v2 rejected, key `industrial-site-save-v3`).
- Existing first-playable behavior stays green.

## Review Focus

- Reaction ID-change (`2 ferrite → 6 plates`) must not flag as creation/destruction — pinned in transformation test.
- In-flight escrow double-counting (buffer vs escrow vs consumed/produced timing) — pinned in mid-batch/blocked tests.
- Embodied construction plates missed (build/dismantle must stay audit-neutral) — pinned in refund-cycle test.
- Per-material export detail lost in the numeric `exported` total — pinned by asserting `flows.exported` sums.
- `discard` silently unbalanced if recording missed — pinned in discard test.
- Save/load dropping `flows` — pinned in round-trip test (serialize equality + identical audit).

---

### Task 1: `Save.flows` plumbing + schema 3

**Files:**
- Modify: `packages/sim-core/src/types.ts` (add `FlowTotals`, `Save.flows`, `schemaVersion: 3`)
- Modify: `packages/sim-core/src/save.ts` (Zod `flows` schema, `initialState`, `parseSave` v3-only)

**Interfaces:**
- Consumes: existing `Inventory`, `Save` types.
- Produces: `export type FlowTotals = { consumed: Inventory; produced: Inventory; exported: Inventory; discarded: Inventory }` used by Tasks 2–4.

- [ ] **Step 1: Write the failing test** — in `packages/sim-core/test/ledger.test.ts`: fresh `Simulation` audit balances and `serialize().flows` equals zeroed inventories.
- [ ] **Step 2: Run test to verify it fails** — `npx vitest run packages/sim-core/test/ledger.test.ts`; expect FAIL (`flows` undefined / `ledger` module missing).
- [ ] **Step 3: Implement types + save plumbing** — add `FlowTotals`, extend `Save`, Zod `flowsSchema`, `initialState` zeroes, `schemaVersion: z.literal(3)`, reject message preserved.
- [ ] **Step 4: Run test** — still fails on missing ledger module (expected); Task 2 provides it.
- [ ] **Step 5: Commit** — `git add packages/sim-core/src/types.ts packages/sim-core/src/save.ts packages/sim-core/test/ledger.test.ts && git commit -m "feat(sim-core): persist material flow totals in save schema 3"`

### Task 2: `ledger.ts` collect + audit

**Files:**
- Create: `packages/sim-core/src/ledger.ts`
- Modify: `packages/sim-core/src/index.ts` (export `collectLedger`, `auditLedger`, ledger types)

**Interfaces:**
- Consumes: `Content`, `Save`, `FlowTotals` (Task 1), `footprint`/`key` from `geometry.ts`.
- Produces: `collectLedger(c, s): LedgerSnapshot` (per-material rows with every category); `auditLedger(c, s): LedgerReport` (`{ ok, rows, mismatches }` where each mismatch names material, delta, held, sources, category breakdown).

Category rules: `depositsRemaining` (save deposits → material via content), `stock`, `machineInput/Output`, `belts`, `escrow` (extractor job = 1 unit of deposit material; processor job = `inputAmount` of reaction input), `embodied` (machines Σcost + factories area×cellCost + belts×beltCost + ports×portCost, all in `site.buildMaterial`), sources `initial` (startStock + deposit units) + `produced`. Defensive: unknown material IDs report as mismatch, never throw.

- [ ] **Step 1: Extend failing test** — `collectLedger` on fresh sim shows `initial.plates = startStock`, all flows zero; `auditLedger(...).ok === true`.
- [ ] **Step 2: Run test, verify fail** — missing module.
- [ ] **Step 3: Implement ledger.ts + index exports.**
- [ ] **Step 4: Run test, verify pass** — `npx vitest run packages/sim-core/test/ledger.test.ts`.
- [ ] **Step 5: Commit** — `git add packages/sim-core/src/ledger.ts packages/sim-core/src/index.ts && git commit -m "feat(sim-core): add material ledger collect/audit helpers"`

### Task 3: Flow recording in production + commands

**Files:**
- Modify: `packages/sim-core/src/production.ts` (`completeAndStart` records `consumed`+`produced` at batch completion; `transport` export sweep records per-material `flows.exported` alongside existing total)
- Modify: `packages/sim-core/src/commands.ts` (`discard` records cleared amounts into `flows.discarded`)
- Modify: `packages/sim-core/src/simulation.ts` (load-rejection message references schema 3)

**Interfaces:**
- Consumes: `FlowTotals` on `Save`; existing `change()` helper.
- Produces: flow-accurate `Save` for Task 4 tests. No signature changes to `command`/`step`/`snapshot`/`serialize`/`load`.

Recording rules: extractor completion does NOT touch `produced` (source already counted via deposit decrement + escrow transfer). Processor completion: `consumed[input] += inputAmount`, `produced[output] += outputAmount`. Export sweep: `flows.exported[m] += n` wherever `s.exported += n` happens. Discard: sum cleared buffer entries into `flows.discarded` before clearing.

- [ ] **Step 1: Extend failing tests** — run the construction line to first output; assert `flows.produced`/`consumed` match reaction stoichiometry; discard then assert `flows.discarded`.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement recording.**
- [ ] **Step 4: Run focused ledger tests, verify pass.**
- [ ] **Step 5: Run existing suite** — `npx vitest run packages/sim-core` — must stay green.
- [ ] **Step 6: Commit** — `git commit -m "feat(sim-core): record transformation, export and discard flows"`

### Task 4: Full conservation suite + corruption diagnostics

**Files:**
- Modify: `packages/sim-core/test/ledger.test.ts` (all scenarios below)
- Modify: `apps/web/game/session.ts` (`SAVE_KEY` → `industrial-site-save-v3`, stale-key message covers v1+v2)

Scenarios (all drive the real `Simulation` with the fixture; reuse the `line()`/`path()`/`build()` helpers pattern from `simulation.test.ts`):
1. Full alien line to export: audit green after extraction, transit, crush, terminal stock, and export stages; `flows.exported.granules === snapshot.exported`.
2. Blocked/in-flight: `Output full` extractor + mid-batch processor audit green (escrow coverage).
3. Construction cycle: build factory/machines/belts/ports then dismantle to empty — audit green throughout (embodied coverage).
4. Save/load round-trip mid-production: `serialize()` equal after reload + continued stepping; audits identical.
5. Corruption: validation-passing mutations (`stock.plates += 5`; belt cargo deletion; machine output decrement) each yield `ok:false` with the exact material and nonzero delta in `mismatches`.
6. Existing `simulation.test.ts` + content/web tests untouched and green.

- [ ] **Step 1: Write the failing tests.**
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Fix implementation gaps (if any) — no test-only summation shortcuts.**
- [ ] **Step 4: Run `npx vitest run packages/sim-core` green.**
- [ ] **Step 5: Commit** — `git commit -m "test(sim-core): cover end-to-end conservation, escrow, round-trip and corruption"`

### Task 5: Docs + full baseline + PR

**Files:**
- Modify: `docs/SIMULATION.md` (implemented-contract: ledger categories, flow events, schema 3, v2 rejection)

- [ ] **Step 1: Update docs/SIMULATION.md.**
- [ ] **Step 2: Run baseline** — `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`; record exact results.
- [ ] **Step 3: Inspect final diff** — `git status`, `git diff --stat`, scope-creep check (only files listed above).
- [ ] **Step 4: Push** — `git push -u origin feat/3-material-ledger` (only this branch).
- [ ] **Step 5: Open PR** — `gh pr create` with title `feat: establish material ledger and conservation invariants`, body: closes #3, summary, design choices, verification evidence, save/content compat notes, remaining risks. Report PR number + head SHA. Do NOT merge.

## Self-Review

- Spec coverage: Issue #3 scope (categories ✓ Task 2; reusable helpers ✓ Task 2; batching ✓ aggregates; diagnostics ✓ mismatches) and acceptance (flow tests ✓ Task 4; round-trip ✓ Task 4; no new sim-core deps ✓ `ledger.ts` imports only content types/geometry; first-playable green ✓ Task 3 Step 5 + baseline). Non-goals respected (no storage UI, pricing, WASM).
- No placeholders: all steps name exact files/commands/assertions.
- Type consistency: `FlowTotals` defined once in Task 1, consumed by Tasks 2–4 with identical field names.
