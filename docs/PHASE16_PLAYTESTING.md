# Phase 16 #160 — Structured production-slice playtesting

## Automated execution result

The production-export playthrough passed on 2026-10-07 using normal browser/game controls on the Codex VM. It exercised onboarding, the hidden-knowledge boundary, a market opportunity and fuel directive, two running production lines, an observed output blockage, terminal routing, factory persistence/reconfiguration, physical cargo staging, a manifest dispatch, local save, page reload, save restoration and a second dispatch.

The browser run was an execution gate for observable behaviors. It did not claim that a human player understands the systems or that the pacing is subjectively right.

### Playthrough evidence

- Fresh landing loaded the static export and showed the first onboarding beat. The initial notebook withheld the unknown thermal outcome; after the Furnace trial, the notebook recorded the observed Magnetic ceramic result while authored, still-hidden outcomes remained absent.
- The terminal showed one active company opportunity, a Sealed thermal study directive worth `+18 fuel`, and the rule that exports repay obligations before allocating fuel.
- Two Extractors, a 10×10 factory, two wall inputs, a Crusher, a Furnace and their belts were placed with visible build tools. After production, the Crusher inspector showed `OUTPUT FULL`, `12 / 12` Ferrite rubble input, `12 / 12` Structural plates output and `No connected destination`.
- Closing and reopening the factory preserved its two machines. Expanding and trimming the east wall also preserved the Crusher and Furnace.
- A wall port and belts routed Structural plates back to construction stock and Magnetic ceramic into the terminal. Setting the terminal policy to `Keep` through the UI preserved 12 exportable Ceramic units for a manifest. The browser saved with those physical units staged, dispatched two, reloaded, restored the saved 12 units, and dispatched two again.
- All nine structured browser stages passed. Chromium reported no uncaught page errors, failed requests or HTTP responses of 400 or greater.

## Evidence files

- [Structured browser report](evidence/phase16-160/phase16-160-browser-evidence.json) — run metadata, steps, UI observations and browser events.
- [Verification summary](evidence/phase16-160/verification.log) and [production build log](evidence/phase16-160/production-build.log).
- Screenshots: `01-landing-onboarding.jpg`, `02-notebook-before-experiment.jpg`, `03-terminal-before-production.jpg`, `04-two-lines-assembled.jpg`, `05-crusher-under-production.jpg`, `06-notebook-after-thermal-trial.jpg`, `07-factory-closed.jpg`, `08-factory-reopened-reconfigured.jpg`, `09-output-buffer-before-outbound-route.jpg`, `10-routed-production-diagnostics.jpg`, `11-cargo-staged-at-terminal.jpg`, `11-saved-running-production.jpg`, `12-manifest-dispatched.jpg`, `13-loaded-production-save.jpg` and `14-production-export-result.jpg` in `evidence/phase16-160/`.

## Evidence-backed defects fixed

1. A fresh production export requested `/favicon.ico` and received a 404. Added `apps/web/app/icon.svg`; the rebuilt app advertises that icon and the final browser run had no bad HTTP responses.
2. At a 1365×900 viewport, the build toolbar measured 2267px inside a 1337px area, placing Inspect at x=-444 and Extractor at x=-380. The toolbar now scrolls horizontally and its buttons keep their width. After the fix, Inspect began at x=21 and Extractor at x=85 within the visible toolbar.
3. The first Vercel preview stopped in Next's TypeScript phase because React and Node types were available only at the monorepo root. After declaring them directly in `apps/web`, a second preview exposed the same scope issue for test files: Vitest and React DOM types were root-only. All four existing locked packages are now direct web-workspace development dependencies; the next preview is the online confirmation.

No other product defect was supported by the completed browser run. During setup, a test route initially missed a valid terminal row and default auto-export consumed cargo before manifest selection; correcting the playthrough geometry and explicitly choosing `Keep` resolved those setup issues without gameplay changes.

## Verification

The repository baseline passed: `npm test` (111 files passed, 1 skipped; 532 tests passed, 3 skipped), `npm run typecheck`, `npm run lint` and `npm run build`. The build was a static export and `scripts/verify-export.mjs` confirmed that no Studio route or authoring component was included. In this VM, Next's spawned TypeScript `--showConfig` process returns empty stdout; the build therefore used `experimental.useTypeScriptCli: false` temporarily and restored `next.config.ts` afterward. The web workspace now declares its own locked React/Node type and Vitest dependencies to support deployment builds that typecheck the workspace tests.

The headless browser logged four WebGL `GPU stall due to ReadPixels` performance warnings. There were no JavaScript errors or failed/4xx requests. The run used Chromium 151 on x86_64 Linux, 1365×900 at DPR 1, with software WebGL. Physical-device/GPU performance validation remains deferred and non-blocking under #159.

## DEFERRED HUMAN REVIEW

Player comprehension, subjective pacing, visual taste and physical-device/hardware-GPU judgment are deferred to the user's consolidated human playthrough. These judgments are non-blocking for #160's automated execution gate and do not change accepted systems or add tutorial text.

## Dependency order

With #160 complete and prior Phase 16 children accepted, #161 is dependency-ready. Its integrated human comprehension and hardware/device judgments remain for the later consolidated review as directed.
