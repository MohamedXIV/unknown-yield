# Runtime Content Packs (Phase 19 #251)

## Contract

- Production web client **does not include** Content Studio or TinyBase editing UI. The runtime imports only `@site/content/bundle`, the shared strict parser/validator.
- Supported format: exact Studio schema-1 JSON: `{ "schemaVersion": 1, "content": ..., "locale": ... }`.
- Choose **Expedition controls → Offline content packs → Choose Studio JSON content pack** in an already-built client. Import validates the whole object before creating any simulation. The UI requires an explicit **Play new expedition with imported pack** action; there is no live hot swap of the existing world.
- Existing built-in fixture stays the default. **Start new expedition with built-in content** clears pack selection; it does not erase any worlds.
- Pack selection is persisted on this browser origin using localStorage key `unknown-yield-active-pack-v1`, with a SHA-256 fingerprint over the normalized validated content AND locale. Imported JSON is bounded to 2 MiB including the stored wrapper. An invalid/mutated stored pack fails closed and the app starts with built-in content, reporting the error.
- Content pack and legacy fixture saves are isolated. Built-in games continue to use `industrial-site-save-v15` and the existing compatibility fallbacks. Pack games use `industrial-site-save-v15-pack-<full sha256>`, containing `{fingerprint,save}`; the loader verifies the fingerprint before calling the same authoritative sim-core save loader. A pack with the same `content.version` but edited material/recipe/locale does not match.
- Import is file-only, no remote fetch, script execution, content hot-swap, backend, service worker or Vercel redeploy. Exports are inspectable JSON and are **not cryptographic protection against viewing authored recipes**; recipe secrecy remains a player UI/snapshot boundary.

## Author workflow

1. Run `npm run dev:studio` locally (developer-only `/studio-entry/`).
2. Author/modify entries, ensure the locale entries and references are valid, and use **Validate & export**.
3. In an existing development or static-export player build, open **Expedition controls** and import the resulting JSON file. Invalid and oversized files are rejected without affecting the running site.
4. Inspect the short pack fingerprint, then choose **Play new expedition with imported pack**. This resets only the running site; already-saved worlds are untouched.
5. Build/operate using the newly validated content, **Save world**, refresh, then **Load saved world**. The browser restores the selected pack first and only then opens its matching save.
6. To compare the baseline, choose **Start new expedition with built-in content**. The imported pack's save remains available if the same exact pack is imported/selected again.

No `npm run build`, GitHub push or Vercel deploy is required **between authoring and running a content change in the prebuilt player**.

## Boundaries and acceptance

- No new save schema or material-flow logic. Every placed/processed entity is still handled by the same `Simulation`, conservation ledger and existing save validator.
- The new bundle parser is pure content/locale validation and deliberately independent of `@site/content/studio`'s TinyBase authoring import.
- Production browser acceptance uses an actual Studio-export JSON `File` input, selects it, saves, reloads, restores and returns to the built-in game.
- Test gates: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and production browser. Manual visual/gameplay review remains independent of automated checks.
- Subsequent #252 may streamline the author-to-playtest handoff and save Studio drafts. #254 separately audits missing site/deposit authoring; neither requires a new runtime format.
