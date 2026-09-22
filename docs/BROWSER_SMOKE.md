# Browser acceptance — spatial game

Use `npm run dev` and http://127.0.0.1:3000. All gameplay actions below use the UI; do not inject simulation commands through the console.

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
- Browser error log was empty during acceptance. Manual fuel assistance, explicit waste discard and deterministic conservation are covered by domain checks. The regression for dragging across UI overlays was followed by a successful production build. No claim is made about performance or playtest enjoyment.
