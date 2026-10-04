# #111 terminal implementation ledger

Plan: `docs/superpowers/plans/2026-10-04-terminal-handling.md`; approved 2026-10-04. Spec: `docs/superpowers/specs/2026-10-04-terminal-handling-design.md`.

Native same-checkout execution, no agents/worktree. Base main `9a2f7be167f013454491d5781ee6370175b9170d`.

Pre-flight: Task 1 definitions feed Tasks 2/3/5; Task 2 Save holdings feed Tasks 3/4/5/6; Task 3 receiver uses native transport target shape; Task 4 settlement stays on existing transport cadence; Task 5 detached views feed Task 7. Interfaces consistent.

Ruling: use this committed project ledger rather than skill shell scratch scripts on Windows; use native self-review instead of an agent reviewer, honoring user constraints. No product behavior changes from this workflow choice.

Task 1: complete. New terminal content tests RED (missing modules), then 56 tests PASS across content/Studio/Phase4. Definitions, geometry/protection/reference/soft-lock validation, localized generic progression and base-content roundtrip delivered.

Ruling: preserve granules capability/listing/milestone array order while using stable IDs for new module identity; existing historical-content tests now explicitly omit modern terminal definitions.

Tasks 2–7: implemented. Installation/save tests RED then GREEN; transport/export tests RED for missing receiver/settlement then GREEN. Native transport admits through authored installed inlets; one settlement path owns dry and dock exports. Current schema 17 validates holdings and exact embodied costs. Detached snapshots, connected factory signatures, UI controls, directed Phaser markers and browser slot v11 are integrated.

Ruling: Tasks 2–7 share the Save/receiver/view contract and were integrated natively before one coherent runtime/UI commit. No shared presentation helper was needed: coordinate arithmetic stays small at each presentation boundary. Factory blueprint remains conditional v1–v5; terminal installations never promote a dry-only blueprint or enter its payload.

Focused regressions prove bounded final arrival, resumed capacity, identity/state/protection refusal, debt/market/order settlement without replay, simultaneous liquid/gas dock and upstream restoration, and blueprint exclusion. Added test fixtures initially failed for invalid zero order reward, missing custom locale coverage, clear standing with debt, and a wrong pipe ID prefix; corrected fixtures to obey existing content/save contracts, without relaxing validation. Self-review corrected the save rejection message from schema 16 to 17.

Historical non-module content continues its existing migration tests; current fixture saves older than schema 17 reject atomically. New module geometry/protection/progression validation does not weaken legacy migration coverage.

Task 8: in progress. First full suite: 58 files / 345 PASS, 2 skipped. Typecheck/lint PASS. Strengthened regressions passed focused checks; final full suite/build pending. Browser normal controls proved real liquid/gas discovery, missing-module refusal, installation, Keep holdings, gas 16/16 backpressure, loaded-removal disabled guard, Save/Load, liquid/gas export and obligation repayment. Console warnings/errors []. No state injection or agents used. Screenshots are in docs/evidence/phase9-terminal-*.png.

Task 8 final local gate: **58 files / 351 PASS, 2 skipped**, 102.09s, full suite alone; typecheck, lint, production build, static export verification and diff check PASS. Runtime/UI commit `94e5d5e1cfdb0fb5c162c516ea164edaf26b30a3`. Exact-commit fresh-tab restore returned gas 16/16, both installations, mixed policies and obligation 36. Export resumed, obligation became 0 and total exports 64; console warnings/errors []. Local helper server stopped. Canonical docs and D-036 updated. Scoped PR delivery follows; merge approval remains pending, #100 stays open.
