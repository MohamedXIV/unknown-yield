# Browser acceptance — spatial game

Use `npm run dev` and http://127.0.0.1:3000. All gameplay actions below use the UI; do not inject simulation commands through the console.

## Phase 1.5 exit gate — Issue #8

**Status:** Phase 1.5 browser acceptance complete. Runtime behavior was verified from the static export produced by behavioral head `96cb821a3503e1b9e45ef64e75176cff758376cf`; subsequent PR commits are documentation-only evidence recording.

This is the closure path for the physical-inventory/rerouting foundation:

1. Build two production lines that share or compete for one input feed, with a player-controlled belt diverter before the split.
2. Run the primary line until processed material exists in a physical depot; confirm produced non-construction material never appears in global site stock.
3. Suspend that line while it still owns buffered material. Switch the diverter immediately, before old-route cargo has fully cleared.
4. Verify cargo already past the diverter remains on the old route and reaches/remains accounted for at the suspended line, while future feed reaches the second line.
5. Keep an exportable product at the terminal long enough to observe non-empty terminal staging, then switch to export and verify staged material leaves only through the terminal and export/fuel totals advance.
6. Return the policy to Keep and save while material simultaneously exists across belt cargo, physical storage, a suspended factory buffer and terminal staging.
7. Reload through the UI. Verify those physical holdings, disabled state, diverter state and identities return; continue long enough to confirm no loss/duplication or unexpected reset.
8. Restore the original feed and resume the suspended line without rebuilding it. Verify the same factory/machine continues producing into its existing logistics destination.
9. During the run, confirm conservative reclaim still refuses a loaded non-construction belt / buffered machine rather than deleting or teleporting contents.
10. Check the browser console/page errors and raw localization keys. Then run the repository baseline: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

The domain companion is `packages/sim-core/test/phase15-exit.test.ts`.

## Phase 1.5 observed on 2026-09-26

Behavioral head: `96cb821a3503e1b9e45ef64e75176cff758376cf` on `review/8-phase15-exit`. The worktree was clean on that exact head.

- Local gate: `npm ci` succeeded with 0 vulnerabilities; focused Phase 1.5 exit test 1/1; full suite 97/97 across 13 files; typecheck, lint and production build/static export all exited 0.
- Browser/UI: two production lines, a shared extractor feed, diverter, wall ports and a physical depot were built through the game UI. No console/page errors were reported and no raw localization-key candidates were visible.
- Physical storage: line B produced Conductive granules into depot S45, reaching 25/40. Non-construction material remained in physical locations/buffers; the top bar continued to expose only construction plates and fuel.
- Suspend/reroute: M5 was disabled with `12/12 Veined ore` in its input. A `Veined ore ×1` belt cargo was observed during the reroute. Switching the diverter north redirected future feed to line A while M5 remained suspended.
- Terminal/export: policy Keep accumulated 5 staged granules. Auto-export shipped them; a 36-fuel emergency obligation was repaid in full and fuel recovered from 0 to 20. Returning to Keep produced the saved terminal state: Exported 7, Obligation 0, 6 Conductive granules staged.
- Save/load: after UI Save then Load, terminal policy/staging stayed Keep + 6 staged, Exported stayed 7, depot S45 stayed 25/40 Conductive granules, M5 stayed Disabled with 12/12 Veined ore, and the diverter retained north as its active alternate. Restoring the east route and enabling the same M5 returned it to Processing without rebuilding.
- Conservative reclaim: a loaded Veined-ore belt refused reclaim with `Route the cargo out first`; buffered M5 refused reclaim with `Empty the machine buffers through belts first`; contents remained present.
- Fuel note: the UI-built route exhausted starting fuel, so the in-game emergency-fuel action was used. Subsequent exports repaid the obligation fully; this exercised, rather than bypassed, the designed recovery loop.

### Focused four-holdings Save/Load proof

The remaining browser gap was closed with the simulation paused, using the existing static export built from behavioral head `96cb821a3503e1b9e45ef64e75176cff758376cf`.

At the exact UI **Save world** boundary, all four required holdings existed simultaneously:
- **belt cargo:** visible cargo remained on the conveyor feeding M5;
- **physical storage:** depot S45 held 25/40 Conductive granules;
- **factory buffer:** M5 was Disabled with 12/12 Veined ore input;
- **terminal staging:** policy Keep with 10 Conductive granules staged, Exported 7 and Obligation 0.

The UI confirmed the save with `Field record saved on this device.`. After **Load saved world**, the UI confirmed `Site restored` and the same four categories remained present:
- belt cargo was still visible on the conveyor;
- S45 remained 25/40 Conductive granules;
- M5 remained Disabled with 12/12 Veined ore;
- terminal remained Keep with 10 staged, Exported 7 and Obligation 0.

This closes Issue #8's explicit browser requirement to save/reload while material exists simultaneously across belts, storage, factory buffers and terminal staging. No repo edits or test reruns were performed during this focused follow-up because no runtime code changed.

### Issue #30 process-condition selection — observed on 2026-09-26

The rebuilt local static export was opened in the in-app browser. Its accessible build toolbar showed separate **Furnace** and **Sealed furnace** controls, both labeled for the **Heat** operation; the sealed variant displayed hotkey `8` and cost `26`. This confirms the authored condition choice is available through the existing machine-selection flow. This focused browser check verified the visible control only; `apps/web/test/interaction.test.ts` verifies its placement command, and `packages/sim-core/test/simulation.test.ts` verifies the two outcomes, hidden knowledge, deterministic save/load and material conservation. No browser-console assertion is claimed here.

Phase 1.5 environment note: the sandbox could not start Next dev mode because ACLs denied writing the `.next/dev` lockfile. Rather than changing repository permissions/config, the already-built static export from the verified behavioral head was served locally for that focused UI proof.

1. Pause and close the guide. Home centers the site. A new expedition has 600 plates, 120 fuel, no placed machines and no alien outcomes in the notebook. (Observed.)
2. Build a factory, extractor and crusher. Place matching eastward wall ports and route belts through the factory to the terminal. (Observed with real mouse input; the standard 10×10 first line cost left 438 plates.)
3. Build a second line from veined ore using a crusher, wall ports and directed belts to the terminal. A tested 10×7 factory fits. At corners, place a single belt with its desired outgoing direction; do not overlap an existing cell.
4. Resume. Watch cargo, machine activity and construction stock. Verify the notebook discovers conductive granules only after a physical batch, and the terminal automatically exports them for fuel.
5. Add another extractor using newly produced plates. Select a factory, press F, and close/open its roof while production continues.
6. Save with jobs/cargo present; reload the page and use Load saved world. Verify all construction and knowledge return and processing continues. The saved roof-independent world can be reopened immediately.
7. Set conductive granules policy to Keep, verify accumulation, then Auto-export and verify stock leaves and fuel rises. A fuel-starved line resumes automatically.
8. Resize with a contextual panel open; verify one canvas, preserved world state, working selection and continuing production. Check browser error logs.
9. For code changes, run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. The completed production export contains no Studio route or authoring component.

## Observed on 2026-09-22

- Mouse-built both lines from a fresh site. First run: 267 plates after construction, then 304 after automatic production; discovery and export appeared without manual run actions.
- Final run used a 10×7 second factory after reclaiming misplaced belts. Saved with 382 plates / 32 fuel and cargo/jobs present, reloaded the page, and restored the saved site before ticks resumed. After continuing the live session and adding another extractor, the delivered paused save held 656 plates / 260 fuel.
- Built an additional extractor, opened Factory 1's roof and observed ongoing production. Closed roofs showed running count and known output names.
- At 900×650, the contextual panel remained usable and the existing canvas resized to 900×650; there was exactly one canvas. Returned to the default viewport afterward. Selection and an open contextual panel coexisted with the running world.
- Keep policy accumulated 15 conductive granules and fuel reached zero. Switching back to Auto-export cleared that stock, raised exports from 13 to 28 and fuel to 174 after restarted batches charged their costs.
- Browser error log was empty during acceptance. Manual fuel assistance, discard removal/conservative reclaim and deterministic conservation are covered by domain checks. The regression for dragging across UI overlays was followed by a successful production build. No claim is made about performance or playtest enjoyment.
