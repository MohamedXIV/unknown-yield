# Content data

- `content.json`: the built-in world (materials, machines, reactions, deposits, economy, milestones). Validated by `validateContent` in `../src/schema.ts`.
- `locale.en.json`: every player-facing string, keyed by stable dotted keys. Validated by `localeCatalogSchema`; `validateContent` checks that every key content refers to exists.

Edit either file directly, or use the development Studio (`npm run dev:studio`, **Repo files** section). The Studio writes both files in a canonical form (two-space indent, locale keys sorted), so a save with no real change produces no diff. Change IDs never; rename the wording instead. Bump `content.json`'s `version` when gameplay data changes.

`fixture.ts` and `locale.ts` only parse these files. Do not add content there.

## Design notes that used to be comments

These sat beside the TypeScript literals before the move. They describe intent, not structure. Exact placement is in the git history of `src/fixture.ts`.

- Hazard `pressure-expansion`: the shockwave reaches nearby machine shells without moving their cargo.
- Hazard `instability`: a real slag jam deposits abrasive residue on the chamber lining.
- Material `catalyst` (provisional P1c): fracture-resistant, very abrasive mineral. Load = 2 * 6 + 4 - 1 = 15; the ordinary cutter maxes at 10/12.
- Machine `extractor` (provisional P1b): steady is P1a-equivalent; force trades fuel for higher usable pressure/capacity and quicker ordinary batches.
- Extractor `force` mode (P1a balance): ferrite load 3 nominal; raw load 7 strained.
- Extractor wear (P2a): completion-only, visible and deterministic. Eight undrained batches physically fill the extractor output at 88 wear. Sustained physically transported production leads to damage, rather than the first eight isolated output-buffer batches. The replacement cutter is supplied from nearby, physically tracked stock.
- Machine `deep-extractor`: a real high-capability cutter. The abrasive catalyst slows batches and exposes stress for P2. Preserve the imported propellant economy so existing Phase-lattice expeditions still have physical fuel. Keep the late-game imported fuel budget viable: mode stress is a separate input to P2 wear, not extra special fuel.
- Machine `oversealed-furnace`: a pressure blowout damages the vessel and requires local repair parts. No passive processor fatigue is authored for this first hazard slice. The shell contains this isolation-rated output until dedicated recovery.
- Deposit `veined-field`: the surface trace is deliberately reachable but too hard for the starter extractor; the larger seam stays gated by resonance surveying.
