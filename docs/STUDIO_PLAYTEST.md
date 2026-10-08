# Content Studio → Playtest workflow (Phase 19 #252)

## Development-only authoring

Run `npm run dev:studio` and open `http://127.0.0.1:3000/studio-entry/`. Content Studio contains the canonical hidden reaction and hazard truth, so it is excluded from the production static export. It remains an authoring tool, **never a dashboard wrapped around the game**.

Your local draft autosaves to `unknown-yield-studio-draft-v1` in local browser storage after edits. It stores **TinyBase working tables**, even if reactions, references or locale keys are currently invalid, along with the last validated base. On editor reload the draft is restored without attempting to start a game or publish anything. A corrupt or unavailable local draft reports an error; it does not replace the game save. **Reset Studio draft to built-in content** explicitly discards it; that action does not delete player saves or published content packs.

## Edit → validate → export → playtest

1. Select an entity and edit it or use **Create** with a stable ID. Machine costs/operations and reaction inputs/outputs have dedicated fields. Add any required locale keys.
2. Observe the validation diagnostic in Studio. Draft changes remain editable even when invalid; neither **Validate & export** nor **Download validated playtest pack** publishes an invalid bundle.
3. Change the bundle content `version` appropriately for authoring provenance and click **Download validated playtest pack**. This downloads JSON `unknown-yield-<version>.json` with canonical schema-1 `{schemaVersion,content,locale}`.
4. Open the already-running or previously built web game, **Expedition controls → Offline content packs → Choose Studio JSON**. Select the downloaded file.
5. Check its SHA-256 fingerprint and deliberately **start a new expedition with imported pack**. In-world build tools expose author-created machine IDs under the Processing submenu. Existing active game and other saved worlds are not mutated by merely editing or exporting.
6. Save, reload, restore the matching pack world. To compare with vanilla, choose **Start new expedition with built-in content**. Pack-scoped saves stay stored, and an exact original pack can be re-imported later.
7. Iterate: revise the Studio draft, download a new validated pack and start a **new** test expedition. This never edits or hot-swaps the active world. No Next.js rebuild, code edit, GitHub push or Vercel deployment is required for the new content data.

## Guardrails

- The runtime loader is implemented in #251 and validated independently of draft work.
- Source-of-truth reactions remain invisible in the player knowledge UI; anyone inspecting client-side JSON can read data, so this is **gameplay secrecy**, not cryptographic DRM.
- Unknown validation fields, missing references, invalid localization and malformed packs fail validation before a new `Simulation` is created.
- Browser/runtime imports are file-only, same browser origin. Different browser origins or private browsing sessions have separate local drafts and expedition saves.
- A universal world editor, in-place save migrations and automatic remote publishing are deliberately out of scope; #254 audits the highest-friction missing authoring tables.

## Phase 19 targeted authoring additions (#254)

Content Studio now has a **Surface deposits** tab. Create/edit finite exposed resource fields `id`, `material`, `x`, `y`, `width`, `height`, `units`. The selector shows authored **solid** material IDs; an exposed deposit must use an **initially known** material, or the shared content validator blocks export. Geometry must fit the site and cannot overlap the orbital terminal or another exposed deposit. Create a new material, mark it initially known, then create and position its deposit to playtest a genuinely new extraction chain. Initial unknown ores are still governed by the existing hidden-deposit/site-sensing data and are **not** silently exposed as new surface deposits.

Other world authoring tables (deep deposits, survey signal graph, atmospheric source relations, terminal placement) are intentionally unchanged until they have a dedicated validation/editor contract. The canonical bundle format remains schema-1, and runtime imports need no rebuild.

### Authoring gap audit (P19 P5)

| Real author workflow | Pre-P19 surface | P19 decision | Runtime behavior |
| --- | --- | --- | --- |
| New ore/material ID, initial knowledge and color | Materials in TinyBase Studio | **Already editable** | Validated bundle includes material; no source rebuild |
| New exposed ore field / world spawn rectangle / finite units | `site.deposits` passed straight through from base fixture | **Added Surface deposits table/UI** | Full validated site geometry+known-solid reference consumed by new authoritative world |
| New processing operation + machine + reaction + locales | Existing Operations, Machines, Reactions, locale and isolated reaction preview | **Reuse**; #251 adds build-palette dynamic IDs | Available in same prebuilt player via imported pack |
| Change existing machine construction cost, processing duration/throughput, machine unlock | Existing Machines fields | **Already editable** | Pack identity changes; prior save remains separate |
| Change global factory-cell construction cost, map dimensions, terminal location | `site.*` passed from base, not exposed as Studio entity | **Deferred**: not required for tested material/deposit/processor loop | Source fixture stays canonical baseline |
| Add hidden/deep deposit and sensing signal/capability graph | `site.hiddenDeposits` and `site.surveySignals` passthrough | **Deferred**: needs consistent discovery+secrecy authoring contract | Existing discovery remains unchanged |
| Change storage/logistics catalog, late-game terminal module | Storage, transport and terminal-module tables currently passthrough | **Deferred**: choose based on an actual blocked content-author session | Existing definitions remain byte-equivalent |
| Set construction delays/jobs | No persistent construction job schema | **No-go** in #250; #253 not planned | No save/sim timing changes |

**Preservation rule:** only `site.deposits` is reconstructed from its TinyBase authoring table. The rest of `site` and untouched content tables are inherited from the unchanged validated base, and the versioned schema-1 pack parser remains the same. Art assets, CDN packs, and a general-purpose world editor are out of scope.
