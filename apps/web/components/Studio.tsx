"use client";

import { useState } from "react";
import {
  enCatalog,
  fixture,
  type Content,
} from "@site/content";
import {
  createContentStore,
  parseStudioBundle,
  referencesTo,
  serializeStudioBundle,
  studioBundleFromStore,
} from "@site/content/studio";
import {
  createStudioEntity,
  deleteStudioEntity,
  setMachineUnlock,
  setReactionHazard,
  setStudioLocaleText,
  studioEntityIds,
  studioEntityLabel,
  studioLocaleText,
  studioRow,
  type StudioKind,
} from "../game/studio-workbench";

const tableFor: Record<StudioKind, string> = {
  material: "materials",
  operation: "operations",
  machine: "machines",
  reaction: "reactions",
};

const plural: Record<StudioKind, string> = {
  material: "Materials",
  operation: "Operations",
  machine: "Machines",
  reaction: "Reactions",
};

const kinds: StudioKind[] = ["material", "operation", "machine", "reaction"];

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Invalid Studio content";
}

function commaList(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.join(", ") : "";
  } catch {
    return "";
  }
}

export default function Studio() {
  const [base, setBase] = useState<Content>(() => structuredClone(fixture));
  const [store, setStore] = useState(() =>
    createContentStore(fixture, enCatalog),
  );
  const [revision, setRevision] = useState(0);
  const [kind, setKind] = useState<StudioKind>("material");
  const [selectedId, setSelectedId] = useState(fixture.materials[0].id);
  const [newId, setNewId] = useState("");
  const [search, setSearch] = useState("");
  const [json, setJson] = useState("");
  const [message, setMessage] = useState(
    "Development authoring surface — canonical spoilers are visible here.",
  );

  let currentContent = base;
  let validationError = "";
  try {
    currentContent = studioBundleFromStore(store, base).content;
  } catch (error) {
    validationError = errorText(error);
  }

  const ids = studioEntityIds(store, kind).filter((id) => {
    if (!search.trim()) return true;
    const needle = search.toLowerCase();
    return (
      id.toLowerCase().includes(needle) ||
      studioEntityLabel(store, kind, id).toLowerCase().includes(needle)
    );
  });
  const selected =
    selectedId && store.hasRow(tableFor[kind], selectedId)
      ? selectedId
      : ids[0] ?? "";
  const row = selected ? studioRow(store, kind, selected) : null;
  const refs =
    selected && !validationError
      ? referencesTo(currentContent, kind, selected)
      : [];

  const touch = (action: () => void) => {
    action();
    setRevision((value) => value + 1);
  };
  const perform = (action: () => void) => {
    try {
      action();
    } catch (error) {
      setMessage(errorText(error));
    }
  };
  const chooseKind = (next: StudioKind) => {
    setKind(next);
    const nextIds = studioEntityIds(store, next);
    setSelectedId(nextIds[0] ?? "");
    setSearch("");
  };
  const localeEditor = (
    key: string,
    label: string,
    multiline = false,
  ) => (
    <label className="studio-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={studioLocaleText(store, key)}
          onChange={(event) =>
            touch(() => setStudioLocaleText(store, key, event.target.value))
          }
          rows={4}
        />
      ) : (
        <input
          value={studioLocaleText(store, key)}
          onChange={(event) =>
            touch(() => setStudioLocaleText(store, key, event.target.value))
          }
        />
      )}
      <small>{key}</small>
    </label>
  );

  const editMaterial = () => {
    if (!row || !selected) return null;
    return (
      <>
        {localeEditor(String(row.nameKey), "English name")}
        <div className="studio-field-row">
          <label className="studio-field">
            <span>Color</span>
            <input
              value={String(row.color)}
              onChange={(event) =>
                touch(() =>
                  store.setCell(
                    "materials",
                    selected,
                    "color",
                    event.target.value,
                  ),
                )
              }
            />
          </label>
          <label className="studio-field">
            <span>Export fuel / unit</span>
            <input
              type="number"
              min={0}
              value={Number(row.exportValue)}
              onChange={(event) =>
                touch(() =>
                  store.setCell(
                    "materials",
                    selected,
                    "exportValue",
                    Number(event.target.value),
                  ),
                )
              }
            />
          </label>
        </div>
        <label className="studio-check">
          <input
            type="checkbox"
            checked={Boolean(row.known)}
            onChange={(event) =>
              touch(() =>
                store.setCell(
                  "materials",
                  selected,
                  "known",
                  event.target.checked,
                ),
              )
            }
          />
          Initially known to the expedition
        </label>
      </>
    );
  };

  const editOperation = () => {
    if (!row) return null;
    return localeEditor(String(row.nameKey), "English name");
  };

  const editMachine = () => {
    if (!row || !selected) return null;
    const unlockHintKey = String(row.unlockHintKey ?? "");
    return (
      <>
        {localeEditor(String(row.nameKey), "English name")}
        <div className="studio-field-row">
          <label className="studio-field">
            <span>Role</span>
            <select
              value={String(row.role)}
              onChange={(event) =>
                touch(() => {
                  store.setCell(
                    "machines",
                    selected,
                    "role",
                    event.target.value,
                  );
                  if (event.target.value === "extractor") {
                    store.setCell(
                      "machines",
                      selected,
                      "operationsJson",
                      "[]",
                    );
                    store.setCell(
                      "machines",
                      selected,
                      "processConditionId",
                      "",
                    );
                  }
                })
              }
            >
              <option value="extractor">Extractor</option>
              <option value="processor">Processor</option>
            </select>
          </label>
          <label className="studio-field">
            <span>Process condition ID</span>
            <input
              value={String(row.processConditionId ?? "")}
              onChange={(event) =>
                touch(() =>
                  store.setCell(
                    "machines",
                    selected,
                    "processConditionId",
                    event.target.value,
                  ),
                )
              }
              placeholder="ambient / sealed / ..."
            />
          </label>
        </div>
        <label className="studio-field">
          <span>Operations</span>
          <input
            value={commaList(row.operationsJson)}
            onChange={(event) =>
              touch(() => {
                const values = event.target.value
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean);
                store.setCell(
                  "machines",
                  selected,
                  "operationsJson",
                  JSON.stringify(values),
                );
              })
            }
            placeholder="crush, heat"
          />
          <small>Stable operation IDs, comma-separated</small>
        </label>
        <div className="studio-number-grid">
          {[
            ["capacity", "Capacity"],
            ["fuel", "Fuel / batch"],
            ["durationTicks", "Duration ticks"],
            ["width", "Width"],
            ["height", "Height"],
            ["cost", "Construction cost"],
          ].map(([field, label]) => (
            <label className="studio-field" key={field}>
              <span>{label}</span>
              <input
                type="number"
                min={1}
                value={Number(row[field])}
                onChange={(event) =>
                  touch(() =>
                    store.setCell(
                      "machines",
                      selected,
                      field,
                      Number(event.target.value),
                    ),
                  )
                }
              />
            </label>
          ))}
        </div>
        <label className="studio-field">
          <span>Unlock reaction</span>
          <select
            value={String(row.unlockReactionId ?? "")}
            onChange={(event) =>
              touch(() =>
                setMachineUnlock(store, selected, event.target.value),
              )
            }
          >
            <option value="">Always available</option>
            {studioEntityIds(store, "reaction").map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        {unlockHintKey &&
          localeEditor(unlockHintKey, "Unlock hint", true)}
      </>
    );
  };

  const editReaction = () => {
    if (!row || !selected) return null;
    const observationKey = String(row.observationKey);
    const hazardId = String(row.hazardId ?? "");
    const hazardNameKey = String(row.hazardNameKey ?? "");
    const hazardObservationKey = String(row.hazardObservationKey ?? "");
    return (
      <>
        {localeEditor(observationKey, "Observation", true)}
        <div className="studio-field-row">
          <label className="studio-field">
            <span>Operation</span>
            <select
              value={String(row.operation)}
              onChange={(event) =>
                touch(() =>
                  store.setCell(
                    "reactions",
                    selected,
                    "operation",
                    event.target.value,
                  ),
                )
              }
            >
              <option value="">Choose operation…</option>
              {studioEntityIds(store, "operation").map((id) => (
                <option key={id} value={id}>
                  {studioEntityLabel(store, "operation", id)} · {id}
                </option>
              ))}
            </select>
          </label>
          <label className="studio-field">
            <span>Process condition ID</span>
            <input
              value={String(row.processConditionId ?? "")}
              onChange={(event) =>
                touch(() =>
                  store.setCell(
                    "reactions",
                    selected,
                    "processConditionId",
                    event.target.value,
                  ),
                )
              }
              placeholder="blank = unconditioned"
            />
          </label>
        </div>
        <div className="studio-reaction-flow">
          <label className="studio-field">
            <span>Input material</span>
            <select
              value={String(row.input)}
              onChange={(event) =>
                touch(() =>
                  store.setCell(
                    "reactions",
                    selected,
                    "input",
                    event.target.value,
                  ),
                )
              }
            >
              <option value="">Choose…</option>
              {studioEntityIds(store, "material").map((id) => (
                <option key={id} value={id}>
                  {studioEntityLabel(store, "material", id)} · {id}
                </option>
              ))}
            </select>
          </label>
          <label className="studio-field studio-amount">
            <span>Units</span>
            <input
              type="number"
              min={1}
              value={Number(row.inputAmount)}
              onChange={(event) =>
                touch(() =>
                  store.setCell(
                    "reactions",
                    selected,
                    "inputAmount",
                    Number(event.target.value),
                  ),
                )
              }
            />
          </label>
          <span className="studio-arrow">→</span>
          <label className="studio-field">
            <span>Output material</span>
            <select
              value={String(row.output)}
              onChange={(event) =>
                touch(() =>
                  store.setCell(
                    "reactions",
                    selected,
                    "output",
                    event.target.value,
                  ),
                )
              }
            >
              <option value="">Choose…</option>
              {studioEntityIds(store, "material").map((id) => (
                <option key={id} value={id}>
                  {studioEntityLabel(store, "material", id)} · {id}
                </option>
              ))}
            </select>
          </label>
          <label className="studio-field studio-amount">
            <span>Units</span>
            <input
              type="number"
              min={1}
              value={Number(row.outputAmount)}
              onChange={(event) =>
                touch(() =>
                  store.setCell(
                    "reactions",
                    selected,
                    "outputAmount",
                    Number(event.target.value),
                  ),
                )
              }
            />
          </label>
        </div>
        <label className="studio-check">
          <input
            type="checkbox"
            checked={Boolean(row.known)}
            onChange={(event) =>
              touch(() =>
                store.setCell(
                  "reactions",
                  selected,
                  "known",
                  event.target.checked,
                ),
              )
            }
          />
          Initially known reaction
        </label>
        <div className="studio-section-title">Optional hazard</div>
        <label className="studio-field">
          <span>Hazard ID</span>
          <input
            value={hazardId}
            onChange={(event) =>
              touch(() =>
                store.setCell(
                  "reactions",
                  selected,
                  "hazardId",
                  event.target.value,
                ),
              )
            }
            onBlur={(event) =>
              touch(() =>
                setReactionHazard(store, selected, event.target.value),
              )
            }
            placeholder="blank = no hazard"
          />
          <small>Blur the field to derive stable hazard localization keys.</small>
        </label>
        {hazardNameKey && localeEditor(hazardNameKey, "Hazard name")}
        {hazardObservationKey &&
          localeEditor(hazardObservationKey, "Hazard observation", true)}
      </>
    );
  };

  return (
    <main className="studio-page studio-workbench" data-revision={revision}>
      <header className="studio-topbar">
        <div>
          <a href="/">← Expedition</a>
          <div className="eyebrow">DEVELOPMENT ONLY / CONTENT STUDIO</div>
          <h1>Content Workbench</h1>
        </div>
        <div className="studio-meta">
          <label>
            <span>Content version</span>
            <input
              value={String(store.getCell("meta", "content", "version") ?? "")}
              onChange={(event) =>
                touch(() =>
                  store.setCell(
                    "meta",
                    "content",
                    "version",
                    event.target.value,
                  ),
                )
              }
            />
          </label>
          <div className={validationError ? "studio-invalid" : "studio-valid"}>
            {validationError ? "INVALID DRAFT" : "VALID SNAPSHOT"}
          </div>
        </div>
      </header>

      <nav className="studio-tabs" aria-label="Content types">
        {kinds.map((entry) => (
          <button
            key={entry}
            className={kind === entry ? "active" : ""}
            onClick={() => chooseKind(entry)}
          >
            {plural[entry]}
            <small>{studioEntityIds(store, entry).length}</small>
          </button>
        ))}
      </nav>

      <div className="studio-shell">
        <aside className="studio-list-panel">
          <input
            className="studio-search"
            aria-label="Filter content"
            placeholder={"Filter " + plural[kind].toLowerCase()}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="studio-entity-list">
            {ids.map((id) => (
              <button
                key={id}
                className={selected === id ? "active" : ""}
                onClick={() => setSelectedId(id)}
              >
                <strong>{studioEntityLabel(store, kind, id)}</strong>
                <small>{id}</small>
              </button>
            ))}
            {!ids.length && <p className="muted">No matching records.</p>}
          </div>
          <div className="studio-create">
            <input
              aria-label={"New " + kind + " ID"}
              placeholder={"new-" + kind + "-id"}
              value={newId}
              onChange={(event) => setNewId(event.target.value)}
            />
            <button
              className="primary"
              onClick={() =>
                perform(() => {
                  const id = createStudioEntity(store, kind, newId);
                  setSelectedId(id);
                  setNewId("");
                  setRevision((value) => value + 1);
                  setMessage(
                    "Created draft " +
                      kind +
                      ". Complete required references before export.",
                  );
                })
              }
            >
              Add {kind}
            </button>
          </div>
        </aside>

        <section className="studio-editor-panel">
          {selected && row ? (
            <>
              <div className="studio-editor-header">
                <div>
                  <div className="eyebrow">{kind.toUpperCase()}</div>
                  <h2>{studioEntityLabel(store, kind, selected)}</h2>
                  <code>{selected}</code>
                </div>
                <button
                  className="danger"
                  onClick={() =>
                    perform(() => {
                      deleteStudioEntity(store, kind, selected);
                      const remaining = studioEntityIds(store, kind);
                      setSelectedId(remaining[0] ?? "");
                      setRevision((value) => value + 1);
                      setMessage(
                        "Deleted draft record. Validation will report any remaining references.",
                      );
                    })
                  }
                >
                  Delete
                </button>
              </div>
              <div className="studio-form">
                {kind === "material" && editMaterial()}
                {kind === "operation" && editOperation()}
                {kind === "machine" && editMachine()}
                {kind === "reaction" && editReaction()}
              </div>
            </>
          ) : (
            <div className="studio-empty">
              <h2>No {kind} selected</h2>
              <p>Create a record or choose one from the list.</p>
            </div>
          )}
        </section>

        <aside className="studio-inspector-panel">
          <section>
            <div className="studio-section-title">Validation</div>
            {validationError ? (
              <p className="studio-validation-error">{validationError}</p>
            ) : (
              <p className="studio-validation-ok">
                Complete content + locale bundle validates.
              </p>
            )}
          </section>

          <section>
            <div className="studio-section-title">Reverse references</div>
            {validationError ? (
              <p className="muted">
                Fix validation to refresh semantic reverse references.
              </p>
            ) : refs.length ? (
              <ul className="studio-reference-list">
                {refs.map((ref) => (
                  <li key={ref.sourceType + ref.sourceId + ref.field}>
                    <strong>{ref.sourceId}</strong>
                    <span>
                      {ref.sourceType} · {ref.field}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No current references.</p>
            )}
          </section>

          <section>
            <div className="studio-section-title">Bundle</div>
            <div className="studio-bundle-actions">
              <button
                className="primary"
                onClick={() =>
                  perform(() => {
                    const serialized = serializeStudioBundle(store, base);
                    setJson(
                      JSON.stringify(JSON.parse(serialized) as unknown, null, 2),
                    );
                    setMessage("Validated versioned Studio bundle exported.");
                  })
                }
              >
                Validate & export
              </button>
              <button
                className="secondary"
                onClick={() =>
                  perform(() => {
                    const bundle = parseStudioBundle(json);
                    const nextStore = createContentStore(
                      bundle.content,
                      bundle.locale,
                    );
                    setBase(bundle.content);
                    setStore(nextStore);
                    setKind("material");
                    setSelectedId(bundle.content.materials[0]?.id ?? "");
                    setRevision((value) => value + 1);
                    setMessage("Validated Studio bundle imported.");
                  })
                }
              >
                Import bundle
              </button>
            </div>
            <textarea
              aria-label="Versioned Studio bundle"
              value={json}
              onChange={(event) => setJson(event.target.value)}
              placeholder="Exported bundle JSON appears here…"
              spellCheck={false}
            />
          </section>
        </aside>
      </div>

      <footer className="studio-status">
        <span>{message}</span>
        <span>
          {validationError
            ? "Draft may be incomplete; player runtime is unaffected."
            : "Ready for isolated preview/export."}
        </span>
      </footer>
    </main>
  );
}
