# Browser acceptance — spatial game

Use `npm run dev` and http://127.0.0.1:3000. All gameplay actions below use the UI; do not inject simulation commands through the console.

## Phase 1.5 exit gate — Issue #8

**Status:** required on current `main`; not yet recorded as observed.

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

Do not mark this gate observed until the full path is run on the exact #8 PR head. The domain companion is `packages/sim-core/test/phase15-exit.test.ts`.

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
