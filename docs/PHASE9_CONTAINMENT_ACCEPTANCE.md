# #110 — containment compatibility acceptance

Implemented locally on 2026-10-04 in the existing checkout, branch `codex/110-containment-compatibility`, based on merged #109 / PR #163 / main `dd67f42f5e391c425cbbc2188618a4366b4e6821`. Live #110 and #100 are OPEN; no competing open PR was present. Design and implementation plan were explicitly approved. No worktree, agents, dependencies, Vercel or remote deployment was used.

## Contract

Material requirements are stable capability IDs matched all-of, independently of `solid` / `liquid` / `gas` handling. Content validation protects every executable machine input/output and extractor output. sim-core checks receiving belts, machines, depots, stock/staging, liquid/gas locations and source pump/compressor admission before reservations, mutation or fuel spending. Failed transfers retain their exact material location.

The existing unknown liquid fixture requires `corrosion-resistant`. Its machine interfaces are protected. Liquid infrastructure offers Standard and Lined profiles; Lined totals are pipe **4**, tank **34**, pump **16** structural plates. Empty infrastructure changes profiles for the exact cost difference; pumps must be disabled. Loaded edits/reclaim refuse. The ledger includes the full current embodied cost and refunds it on legal reclaim.

Save schema **16**, content **world-01-v9**, browser slot **v10**, profiled liquid blueprint **v5**. Matching-content schema 15 defaults to Standard, subject to current inventory validation. Older content is explicitly incompatible and rejected atomically. Blueprint versions 1–4 retain strict legacy serialized fields; gas-only export stays v4. No contents, jobs, discoveries or certificates are copied.

No pressure physics, temperature simulation, leaks, destruction, new hazard reactions, cylinders, terminal modules or new production chains. #111 and later issues remain outside this PR.

## Domain evidence

- `containment-content.test.ts`: all-of requirements independent of state; catalogue/profile/reference/locale validation; executable machine buffers and extractor protection; Studio JSON-array cells and deterministic roundtrip.
- `containment-construction.test.ts`: preview/live costs, exact delta/refund, enabled pump guards, invalid profile and genuinely unaffordable in-bounds build without mutation.
- `containment-transport.test.ts`: independent pump/pipe/tank protection, solid belt and terminal protection, gas line/compressor protection, two required capabilities and machine interface refusal. Failed transfer consumes no fuel or source inventory.
- `containment-persistence.test.ts`: protected holding roundtrip; forged Standard/unknown profile rejection despite corrected construction accounting; loaded profile guards; dry stock/staging/depot/belt, machine input and gas vessel protection; matching-content migration and old-content atomic refusal.
- `containment-knowledge.test.ts`: public equipment capabilities without undiscovered material association; unknown diagnostics omit material/requirements; known current cargo explains missing protection; snapshot mutation cannot alter runtime records or diagnostics. No next reaction output is exposed.
- Existing liquid/gas chain tests now build Lined liquid routes through normal commands, discover outcomes, audit every tick and compare uninterrupted/restored complete saves for 60 steps. Liquid feed stop/drain and empty profile downgrade/upgrade retain exact accounting.
- Blueprint, interaction, session, localization and factory recurrence tests cover profile layout/settings, strict old fields, drag/rotate selection, v10/v9 fallback, localized requirements/reasons, internal/connected profile invalidation and unrelated profile independence. A live certified factory regression catches accidental global certificate reset.

Focused regressions were observed RED before implementation. Self-review was local; no independent agent review was performed. Core construction/transport/persistence/diagnostics/layout/UI changes are delivered together because the required physical profile field crosses those boundaries.

## Browser evidence

Local app `http://127.0.0.1:3030`, normal player controls only; no state injection. Factory `(23,32)` 20×9 contains Liquefier `(25,35)`, Standard source pump `(27,36)`, pipe `(28,36)`, tank `(29,35)`, then Lined drain pump `(31,36)`, pipe `(32,36)` and Precipitator `(33,35)`.

1. Discovered Vein liquor from ordinary solid feed. Standard source pump refused with **Missing containment: Corrosion-resistant containment**, retaining liquid upstream. [Refusal](evidence/phase9-containment-refusal.jpg).
2. Disabled pump, upgraded pump/empty pipe/tank via inspectors. Costs changed by exactly **4/2/10** plates. Protected transfer reached **38/64** in the tank; loaded profile controls were disabled. [Lined tank](evidence/phase9-containment-lined-tank.jpg).
3. Used existing obligation-backed assistance normally, stopped extraction/Liquefier and source feed, connected a Lined downstream route to Precipitator. Conductive granules were discovered; final restored factory reports **5** in observed machine buffers.
4. Empty pipe outlet changed south to no destination. After admission it retained **2/4** and refused profile/routing/reclaim edits. Saved/reloaded/restored this blocked state; latest runtime correctly reports **No connected destination**. [Loaded line](evidence/phase9-containment-loaded-line.jpg).
5. Added a south-facing Lined recovery tank `(27,37)`. With source feed disabled and **0 fuel**, both units drained by gravity into that real tank (**2/64**). Empty pipe controls became available. Downgrade refunded **2** plates (220→222); upgrade cost **2** (222→220). Outlet returned east. [Recovery tank](evidence/phase9-containment-recovery.jpg), [empty reroute](evidence/phase9-containment-empty-reroute.jpg).
6. Saved/reloaded/restored the recovered layout. Closed factory reports **18** physical liquid units separately from observed buffers; reopening retains Lined recovery tank **2/64** and its exact **34-plate** construction cost. [Restored factory](evidence/phase9-containment-restored-factory.jpg).

Fuel depletion is truthful: the browser proves blocked-line retention, real storage/processor admission, gravity drainage, profile cost recovery and persistence. It does not prove a full 64-unit tank or continued production after the final reroute at zero fuel; deterministic domain tests cover capacity, successful-only fuel and route recovery. Console warning/error logs: `[]`. The initial refusal screenshot includes the old broad status wording; review corrected that wording to source/destination containment incompatibility, while the precise diagnostic already identified the missing capability.

## Integration gate

Final repeat after Studio editor and live-certificate review fixes: `npm test -- --maxWorkers=4` — **51 files, 332 PASS, 2 skipped**, 86.22 seconds. Typecheck, lint, production build and `git diff --check` PASS. A previous run concurrent with build hit the existing 5000ms assistance-test timeout; the unchanged suite passed alone after build completion. No timeout/configuration workaround was added. Static export excludes Studio. No absent remote CI or excluded deployment is claimed green. #100 remains open; merge approval is a separate final action.
