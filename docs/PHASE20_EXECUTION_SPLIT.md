# Phase 20 — GitHub-only ChatGPT × VM Codex Cloud work split

**Coordinated for user request 2026-10-09.** Epic [#261](https://github.com/MohamedXIV/unknown-yield/issues/261); active initial issue [#262](https://github.com/MohamedXIV/unknown-yield/issues/262). [P0 decisions](PHASE20_INTERACTION_CONTRACT.md) and [approved scope](PHASE20_SCOPE.md) are shared authority.

## Ownership by execution capability

| Work | Owner | Files / deliverables |
| --- | --- | --- |
| Product semantics, entity-kind taxonomy, authoring complete acceptance examples | **ChatGPT, GitHub connector** | `docs/PHASE20_INTERACTION_CONTRACT.md`, issue/PR review discussions; merged docs-only without CI |
| Backlog sequencing, dependency boundaries, acceptance gate sanity, documentation consistency, review of Codex diffs/evidence | **ChatGPT, GitHub connector** | #261–#269, `docs/EXECUTION.md`, `docs/ROADMAP.md`; only GitHub-side operations |
| P0 **runnable** pure entity classifier + selection candidate extraction and tests | **Codex Cloud VM** | #262 code/tests, focused TypeScript/vitest runs, PR |
| Gap-aware authoritative belts; flow-based joining; pipe/pressure parity | **Codex Cloud VM** | #263 → #264 → #265: `packages/sim-core`, `apps/web/game`, tests and real browser |
| Batch demolition under material preservation; four player modes | **Codex Cloud VM** | #266 → #267: `packages/sim-core`, `apps/web/game`, `GameClient`, tests and browser |
| Pipette, routing preview, accessible touch/keyboard UX | **Codex Cloud VM** | #268: real interaction + visual/playability verification |
| Integrated runtime/performance/browser/playtest gate and technical exit | **Codex Cloud VM**, **ChatGPT reviews GitHub evidence** | #269, `docs/PHASE20_EXIT_REVIEW.md` only after real checks |
| Subjective gameplay/visual/accessibility feel on **user's own hardware** | **User** | Separate deferred acceptance; never fabricate a physical-device PASS |

There is **no installed Codex Cloud action in this chat** that can launch its VM directly; the user initiates its cloud task with the handoff below. A GitHub issue/mention is not a guarantee that Codex runs. Conversely, ChatGPT can review/merge/check GitHub state when invoked in this conversation; do not promise background monitoring.

## Collaboration rules to prevent duplicate work

1. **One canonical PR per active issue.** Read live `main`, issue and open PR list on every new agent run. Continue existing PR rather than starting competing branch. Use `AGENTS.md`, `docs/EXECUTION.md`, `docs/PHASE20_SCOPE.md`, and `docs/PHASE20_INTERACTION_CONTRACT.md` as primary sources.
2. **Doc ownership boundary:** ChatGPT owns scope and issue coordination; Codex owns source code, runnable tests, browser acceptance and code-level evidence. Either may propose design changes in a PR comment; only merge contract revisions when reconciled with the epic and tests. Avoid simultaneous edits to the same files.
3. **P0 is half-complete only when the contract is merged;** #262 remains OPEN until Codex checks in pure TS entity classification/candidate extraction and actually runs focused tests/typecheck. Do not mark P0 PASS just because the spec exists.
4. After P0, priority for a **single** Codex VM: #263 → #264 → #265 (construction) then #266 → #267 (dismantle), or #266 immediately after #263 if branch cleanliness and tests allow. Preserve each child's dependency. No unmerged branches stacked invisibly against other agents.
5. **Merge discipline:** PR head must match the tested tree. Codex should provide head SHA, commands, results, browser evidence, known failures and compatibility notes. ChatGPT can review that evidence and merge if asked; Codex need not remain idle for an unavailable reviewer if the user's autonomous execution authorization and repository checks permit a safe merge. Never merge red/untested runtime work while describing it as green.
6. **Cost discipline:** run focused tests and `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` inside the Codex VM. Don't manually dispatch GitHub Actions for each iteration; use existing automatic ready-PR merge gate only as needed. Don't redeploy Vercel for this.
7. **Browser acceptance:** world gestures, canvas previews, save/reload and accessibility are VM/browser work. Follow the repository's real acceptance harness rather than inventing a command. Browser emulation is not a substitute for user's GPU/handheld human review.
8. After a merged feature PR, sync `main` before the next issue. Report exact feature coverage rather than treating all #261 children as complete.

## Initial Codex Cloud handoff (copy as one task)

> Continue autonomously in `MohamedXIV/unknown-yield` from **actual live GitHub main** using the repository VM. First read `AGENTS.md`, `docs/EXECUTION.md`, `docs/PHASE20_SCOPE.md`, `docs/PHASE20_INTERACTION_CONTRACT.md` and `docs/PHASE20_EXECUTION_SPLIT.md`.
>
> We are collaborating: ChatGPT handles GitHub-only design contracts, issue/backlog coordination and code reviews; **you own all VM-required TypeScript implementation, focused/full tests and real browser acceptance**. Never rewrite the approved roadmap or create competing PRs. The design contract for #262 is authored already; the **code/tests part is still open**, so begin there. Implement the minimum pure, deterministic classifier/candidate selection and tests required by #262, then run focused tests and `npm run typecheck`; open a focused issue-referencing PR with exact evidence.
>
> When #262 is safely merged, tackle #263 smart idempotent belt-gap filling, #264 flow-aware joints and bends, #265 pipe/gas parity, then #266 authoritative safe batch dismantle, #267 four demolition filters, #268 accessibility/ergonomics, #269 integrated exit. The two tracks may be parallelized only when distinct clean branches and merged dependencies permit. The accepted P0 contract constrains all future implementation; if a genuine sim-core contradiction appears, document it explicitly, explain your proposed safe change and update contract/tests together.
>
> Preserve **sim-core authority, conservation of every physical material/cargo, real drainage/structural gates, deterministic save/load, imported machine IDs, hidden-knowledge UI, zero-charge reused cells, touch pan/pinch cancellation and camera performance**. No unsolicited scope expansion, automatic auto-dismantle/auto-reroute, full reskin, Rust, construction timers, speculative new dependencies or manual Vercel deployments. Use Codex VM for `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and production-browser acceptance when an issue needs it. Avoid manual GitHub Actions to save quota. Do not report a test as passed unless actually run. For each issue give exact PR/head/test status and actual blockers; don't claim a physical-device FPS certificate.

## Handoff back to ChatGPT

When Codex creates a PR, share its URL/number in the conversation and ask:

> Review the current PR for `MohamedXIV/unknown-yield` against #261 / `PHASE20_INTERACTION_CONTRACT.md`: check authoritative safety, exact-head tests, material accounting, save and UX regressions. If safe and repository checks allow, merge it and update the issue/dependency board. Use the connected GitHub connector only; don't run Actions manually.

This split is **coordination**, not a claim that Codex was automatically started or that test results exist.
