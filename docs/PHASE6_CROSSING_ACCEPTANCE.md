# #83 controlled crossing acceptance

Recorded 2026-10-01. [PR #88](https://github.com/MohamedXIV/unknown-yield/pull/88). Implementation: c35eaf143d591b6dff0ebb88397c9d86d077b9f0.

## Implementation and checks

Two independent directed routes share one physical belt cargo slot. The held axis selects only its original opposite outlet. Authored transport-step windows alternate admissions, including full empty-axis windows. Expiry stops old-axis admissions; the next empty-start update opens the requested full window. Remaining is decremented at update end. Loaded geometry/removal/reclaim are refused; same-definition empty rotation preserves signal state and changing definition starts its authored initial window.

Save schema 13 migrates schemas 4–12 without changing ordinary/manual belts, cargo/IDs, T fairness or company state. Invalid counters, held/cargo disagreement, T/crossing state mismatch and legacy crossing payloads are rejected before replacing live state. Blueprint v2 generic topology carries crossing definitions without runtime state; v1 remains compatible. Internal and connected factory throughput fingerprints include scheduling and cargo.

Final local gate on the implementation SHA (all exit 0):

- Focused 7 files / 82 tests PASS: crossing, T, blueprint, throughput, content, belt presentation, i18n.
- Full 34 files / 240 tests PASS.
- Typecheck, lint, production build and static-export verification PASS.
- git diff --check PASS.
- Domain tests cover exact windows/clearance, one-slot admission, blocked pending save/load future equivalence, all rotations/branches with different materials and conservation, invalid saves, schema 12 T migration, loaded edits/refunds, transport-only timing, positive authored intervals, definition-change counter reset, topology-only blueprint compatibility and phase/countdown/pending recurrence.
- A suitable ferrite feeder through the crossing certifies and recertifies identically after load. The faster post-crusher plates route overloads shared capacity and stays un-certified under the existing output-full rule. No throughput policy was weakened.

## Normal-controls browser acceptance

At http://127.0.0.1:3030/, continued the saved #82 T world without session/save/runtime injection. Existing splitter/merger and full ferrite depot survived. Added ferrite extractor (16,28), raw extractor (18,35), crossing (24,35), east-facing raw depot (28,34), and south-facing ferrite depot (23,38).

- Set crossing east/south routes by empty rotation. West Veined ore feed reached only the east depot; north Ferrite feed reached only the south depot. First run showed 18 Veined ore and 17 Ferrite rubble in separate depots.
- A missing south outlet held Ferrite on Vertical, remaining 0, pending Horizontal, held south. Save/load retained that state; adding the outlet cleared it and resumed windows.
- Reloaded on final implementation SHA, then repeated actual occupied-outlet blockage: switched south outlet belt west toward an unconnected cell. Crossing again held Vertical Ferrite, remaining 0, pending Horizontal. Rotate/remove/reclaim refused loaded cargo. Save/load preserved the visible phase and held route. Restoring the ordinary outlet belt's main south exit cleared the center and resumed windows (Horizontal, remaining 3, empty center).
- Suspended sources and drained physical buffers. A repeat drained world showed S45 with 15 Veined ore only and S46 with 18 Ferrite rubble only. Later blockage verification added ferrite to its same destination.
- Spare empty belt refund proof: 386 → 385 (belt) → 373 (12-plate crossing) → 385 (remove upgrade) → 386 (reclaim base belt).
- Final implementation reload restored 386 plates, 20 fuel and Horizontal / 1 remaining before the repeated blockage path.
- Console warn/error entries: [].
- Left the same world saved and paused after final clearance; sources suspended, crossing empty, Horizontal / 3 steps, 386 plates and 10 fuel.

External Vercel deployment status was FAILURE, outside the user's requested local/GitHub scope. Local production/static-export gates above passed. No deployment workaround or check override was used.

Tracked screenshots:

- [Final-SHA blocked pending switch after restore](evidence/83-crossing-pending.jpg)
- [Veined ore destination](evidence/83-crossing-raw.jpg)
- [Ferrite destination](evidence/83-crossing-ferrite.jpg)
- [Final-SHA clearance and resumed phase](evidence/83-crossing-recovery.jpg)

## Remaining gate

#83 is scoped to controlled crossings. #84 still owes the complete continuous-factory Phase 6 exit review, including earlier L/manual/T behavior, company/discovery regression evidence and final integration closeout. #80 remains open. No underground transport or deployment work.
