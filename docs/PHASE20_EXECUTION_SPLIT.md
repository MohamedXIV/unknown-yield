# Phase 20 — GitHub-only ChatGPT × VM Codex Cloud work split

**Coordinated for user request 2026-10-09.** Epic [#261](https://github.com/MohamedXIV/unknown-yield/issues/261); completed P0 [#262](https://github.com/MohamedXIV/unknown-yield/issues/262), P1 [#263](https://github.com/MohamedXIV/unknown-yield/issues/263), P2 [#264](https://github.com/MohamedXIV/unknown-yield/issues/264), and P3 [#265](https://github.com/MohamedXIV/unknown-yield/issues/265); next runnable issue [#266](https://github.com/MohamedXIV/unknown-yield/issues/266). [P0 decisions](PHASE20_INTERACTION_CONTRACT.md), [approved scope](PHASE20_SCOPE.md) and the [P4/P5 demolition safety audit & VM acceptance oracle](PHASE20_DISMANTLE_AUDIT.md), and [P1–P3 actual logistics flow audit & VM acceptance matrix](PHASE20_LOGISTICS_AUDIT.md) are shared review guidance; issue dependencies still apply.

## Ownership by execution capability

| Work | Owner | Files / deliverables |
| --- | --- | --- |
| Product semantics, entity-kind taxonomy, authoring complete acceptance examples | **ChatGPT, GitHub connector** | `docs/PHASE20_INTERACTION_CONTRACT.md`, issue/PR review discussions; merged docs-only without CI |
| Backlog sequencing, dependency boundaries, acceptance gate sanity, documentation consistency, review of Codex diffs/evidence | **ChatGPT, GitHub connector** | #261–#269, `docs/EXECUTION.md`, `docs/ROADMAP.md`; only GitHub-side operations |
| P0 **DONE** pure entity classifier + selection candidate extraction and tests | **Codex Cloud VM** | #262 [PR #274](https://github.com/MohamedXIV/unknown-yield/pull/274), merged `80a457b8edb0cbd21d62c43fc19772334d664ded` |
| Gap-aware authoritative belts; flow-based joining; pipe/pressure parity | **Codex Cloud VM** | **#263 DONE** [PR #278](https://github.com/MohamedXIV/unknown-yield/pull/278); **#264 DONE** [PR #280](https://github.com/MohamedXIV/unknown-yield/pull/280); **#265 DONE** [PR #282](https://github.com/MohamedXIV/unknown-yield/pull/282), `packages/sim-core`, `apps/web/game`, tests and real browser |
| Batch demolition under material preservation; four player modes | **Codex Cloud VM** | #266 → #267: `packages/sim-core`, `apps/web/game`, `GameClient`, tests and browser |
| Pipette, routing preview, accessible touch/keyboard UX | **Codex Cloud VM** | #268: real interaction + visual/playability verification |
| Integrated runtime/performance/browser/playtest gate and technical exit | **Codex Cloud VM**, **ChatGPT reviews GitHub evidence** | #269, `docs/PHASE20_EXIT_REVIEW.md` only after real checks |
| Subjective gameplay/visual/accessibility feel on **user's own hardware** | **User** | Separate deferred acceptance; never fabricate a physical-device PASS |

There is **no installed Codex Cloud action in this chat** that can launch its VM directly; the user initiates its cloud task with the handoff below. A GitHub issue/mention is not a guarantee that Codex runs. Conversely, ChatGPT can review/merge/check GitHub state when invoked in this conversation; do not promise background monitoring.

## Collaboration rules to prevent duplicate work

1. **One canonical PR per active issue.** Read live `main`, issue and open PR list on every new agent run. Continue existing PR rather than starting competing branch. Use `AGENTS.md`, `docs/EXECUTION.md`, `docs/PHASE20_SCOPE.md`, and `docs/PHASE20_INTERACTION_CONTRACT.md` as primary sources.
2. **Doc ownership boundary:** ChatGPT owns scope and issue coordination; Codex owns source code, runnable tests, browser acceptance and code-level evidence. Either may propose design changes in a PR comment; only merge contract revisions when reconciled with the epic and tests. Avoid simultaneous edits to the same files.
3. **P0 is COMPLETE**: #262 classifier + selection tests passed in Codex VM and were independently GitHub-reviewed and merged via #274; **P1/P2 belt construction and P3 directed liquid/gas reuse are delivered; batch dismantle remains future work**. Codex's normal `npm run build` failed in that VM on Next's TypeScript CLI subprocess output parsing, but an alternate temporary TS-API-path build/static export passed and the Vercel preview was Ready. Recheck the normal build on a clean GitHub Actions runner; no repository config workaround was committed.
4. **Current next step:** #266 authoritative batch dismantle on fresh live `main` after #265 merged (PR #282, `afb0d49c8d21f1d8d90d85993d1bcf82f551feba`). Reuse existing single-dismantle safety and P0 classifier; never create competing branches or discard loaded cargo. Complete a reviewable issue-scoped PR with exact-head evidence before proceeding to the next merged dependency. Use current issue state, not stale prompt SHAs.
5. **Merge discipline:** PR head must match the tested tree. Codex should provide head SHA, commands, results, browser evidence, known failures and compatibility notes. ChatGPT can review that evidence and merge if asked; Codex need not remain idle for an unavailable reviewer if the user's autonomous execution authorization and repository checks permit a safe merge. Never merge red/untested runtime work while describing it as green.
6. **CI policy updated for this public repo:** the user explicitly permitted GitHub Actions freely on 2026-10-09. Run focused tests and `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` in Codex VM; use ready-PR GitHub CI and manual `workflow_dispatch` when verification or debugging benefits. CI's Ubuntu/Node 24 normal `npm run build` is useful independent evidence for the Next subprocess failure; no unnecessary duplicate jobs or manual Vercel deployment.
7. **Browser acceptance:** world gestures, canvas previews, save/reload and accessibility are VM/browser work. Follow the repository's real acceptance harness rather than inventing a command. Browser emulation is not a substitute for user's GPU/handheld human review.
8. After a merged feature PR, sync `main` before the next issue. Report exact feature coverage rather than treating all #261 children as complete.

## Current Codex Cloud handoff (P0–P3 complete; P4 #266 next)

> Continue `MohamedXIV/unknown-yield` from the **actual live main**. Verify open PRs and `AGENTS.md`, `docs/EXECUTION.md`, `docs/PHASE20_SCOPE.md`, `docs/PHASE20_INTERACTION_CONTRACT.md`, `docs/PHASE20_LOGISTICS_AUDIT.md`, `docs/PHASE20_DISMANTLE_AUDIT.md` and the corresponding issue before editing.
>
> P0–P3 (#262–#265) are **DONE** via PRs #274/#278/#280/#282. Start **#266**, implementing authoritative deterministic bounded batch dismantle (`dismantleMany` or equivalent) with stable entity IDs, duplicate/stale handling, parent/child dependency ordering, exact per-target removed/blocked/skipped reasons and reclaimed structural materials. Use `docs/PHASE20_DISMANTLE_AUDIT.md` and the existing P0 classifier. Enforce the same single-dismantle cargo, hazardous pressure, buffer, factory-port and capacity protections; no venting or silent destruction. Preview/commit revalidation must not accept stale removals or falsely refund. Follow all D-series audit tests. Keep four player-facing selection modes for #267, not #266. Implement a focused PR with deterministic domain and production-browser tests, then full test, typecheck, lint and normal build.
>
> This repository is **public; the user explicitly authorizes GitHub Actions**. Ready-PR CI (normal Ubuntu/Node 24 build) may resolve the earlier Codex VM stdout/Next TypeScript subprocess limitation. An alternative build remains diagnostic only, not a normal-build PASS. Browser-test world interaction if changed; don't claim physical-device proof.
>
> #266 is now the single next runtime issue. After its independently reviewed merge, #267 adds four player-facing dismantle modes. Keep one canonical branch/PR per issue, with exact tested SHA, changed files, checks, browser evidence, remaining risks and handoff to ChatGPT for independent GitHub-side review.

## Handoff back to ChatGPT

When Codex creates a PR, share its URL/number in the conversation and ask:

> Review the current PR for `MohamedXIV/unknown-yield` against #261 / `PHASE20_INTERACTION_CONTRACT.md`: check authoritative safety, exact-head tests, material accounting, save and UX regressions. If safe and repository checks allow, merge it and update the issue/dependency board. Use the connected GitHub connector; GitHub Actions are explicitly allowed for this public project when useful.

This split is **coordination**, not a claim that Codex was automatically started or that test results exist.
