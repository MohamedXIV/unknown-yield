# #110 ledger — plan: docs/superpowers/plans/2026-10-04-containment-compatibility.md

User approved design, written spec, implementation plan and native execution. Same checkout/branch, no worktree or agents. Live #110 open; #109 merged through #163. Base dd67f42f5e391c425cbbc2188618a4366b4e6821.

Task 1: five content tests observed RED before adding predicate/fields/validation. All-of requirements, fixture corrosion branch, invalid references/baseline/costs, protected machine interfaces and Studio roundtrip now GREEN (5 tests). Broader content run: 50 PASS / 1 stale version assertion; changed expected v8 → v9. Typecheck PASS before runtime edits. Final focused content repeat recorded below.

Ruling: retain the existing Studio serializeStudioBundle/parseStudioBundle APIs — no speculative new export/import API. Initial new test used incorrect names; corrected it to the actual boundary before implementation.

Task 2: construction tests observed RED: lined pipe preview incorrectly 2 instead of 4, tank 24 instead of 34. Implementing physical profiles and exact costs next.

Tasks 2–3: profile records, exact construction/delta/refund accounting and every receiving admission were implemented. New construction and transfer tests observed RED before GREEN. Focused construction/transport/liquid/persistence/ledger run: 5 files / 32 PASS. Typecheck caught missing explicit profiles in hand-authored legacy test records; liquid records were updated without weakening their runtime type.

Task 4: public capability/diagnostic tests observed RED. Added location/interface save protection and known-set sanitizer, then current-cargo diagnostics beside transport target checks. Initial protected-save fixture lacked discovery evidence and was correctly rejected; the focused fixture now declares its seeded material known. Broadened rejection cases and all-of machine receiver tests pass. Existing normal-command liquid/gas chains now use Lined profiles, audit exact ledger every tick and compare complete restored/uninterrupted saves; liquid stop/drain/profile recovery is covered.

Task 5: blueprint v5 test observed RED (export was v3), then GREEN. Relative profiles, strict old blueprint fields, connected settings and unrelated settings, build/rotate profile selection, v10/v9 fallback, localized inspector controls/costs and lining markers are implemented. Fresh runtime/UI full run: 51 files / 331 PASS, 2 skipped. Typecheck/lint/build/diff check PASS at that checkpoint; production static export excludes Studio.

Self-review rulings: retain existing chain suites instead of duplicating their full build setup in a new containment-chain file. Current diagnostics must report a missing route before checking a nonexistent receiver's capabilities; corrected and verified in restored browser state. Source/destination incompatibility wording is broader than the previous different-liquid label. The genuinely unaffordable construction test now uses a valid in-bounds build with three plates, rather than an out-of-bounds path.

Review fix: Studio core roundtrip preserved containment cells, but its form omitted editing controls. Added the approved small material/interface JSON-array editors and empty draft defaults. Studio focused run observed one expected-default assertion failure; corrected the explicit draft expectation.

Review fix: live `Simulation.command` globally reset certificates on an unrelated tank profile change. A real certified production line regression observed RED, then the profile command was changed to re-observe local/connected signatures rather than global reset. No other command behavior was broadened.

Browser: normal controls prove Standard refusal, exact profile upgrade costs, Lined tank 38/64, discovered processor output, loaded line 2/4 after save/restore, stopped-feed gravity drain into recovery tank 2/64 at zero fuel, exact pipe downgrade/upgrade refund, empty east reroute and closed/reopened restored factory. Console warning/error logs []. See acceptance evidence; fuel limitation is recorded truthfully.

Review-fix focused repeat: factory-throughput + Studio workbench, 2 files / 30 PASS. Typecheck/lint/diff check PASS after all source fixes. Production build PASS and static export verification excludes Studio. Concurrent build/full-suite run hit the existing 5000ms assistance timeout (331 PASS, one timeout, 2 skipped); no timeout/configuration was changed. A final full suite runs alone after build completion.

Final gate: full suite alone after build, **51 files / 332 PASS / 2 skipped**, 86.22 seconds. Typecheck, lint, production build/static-export verification and diff check PASS. Live main remains dd67f42f5e391c425cbbc2188618a4366b4e6821; live #110/#100 OPEN and no competing PR. Source changes are complete and locally reviewed; deliver one scoped PR, then request the explicitly required final merge approval.

Ruling: self-review instead of independent reviewer — user explicitly prohibits agents. No review dispatch or remote-agent work will occur.
