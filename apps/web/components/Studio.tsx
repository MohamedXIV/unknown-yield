"use client";

import { useEffect, useState } from "react";
import { clearStudioDraft, restoreStudioDraft, saveStudioDraft } from "../game/studio-draft";
import { enCatalog, fixture, type Content } from "@site/content";
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
import {
  previewStudioReaction,
  type StudioReactionPreview,
} from "../game/studio-preview";

const tableFor: Record<StudioKind, string> = {
  material: "materials",
  operation: "operations",
  machine: "machines",
  reaction: "reactions",
  exchange: "exchange",
  import: "imports",
  order: "orders",
  "property-directive": "propertyDirectives",
};

const plural: Record<StudioKind, string> = {
  material: "Materials",
  operation: "Operations",
  machine: "Machines",
  reaction: "Reactions",
  exchange: "Exchange",
  import: "Imports",
  order: "Orders",
  "property-directive": "Property directives",
};

const kinds: StudioKind[] = [
  "material",
  "operation",
  "machine",
  "reaction",
  "exchange",
  "import",
  "order",
  "property-directive",
];

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
  const [preview, setPreview] = useState<StudioReactionPreview | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    try {
      const saved = restoreStudioDraft(window.localStorage);
      if (saved) {
        setBase(saved.base);
        setStore(saved.store);
        setKind("material");
        setSelectedId(saved.store.getRowIds("materials")[0] ?? "");
        setRevision((n) => n + 1);
        setMessage("Recovered local Studio draft. Validate & export when ready; the game is unchanged.");
      }
    } catch (error) {
      setMessage("Local Studio draft could not be restored: " + errorText(error));
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    const timer = window.setTimeout(() => {
      try {
        saveStudioDraft(window.localStorage, base, store);
      } catch (error) {
        setMessage("Draft could not be autosaved: " + errorText(error));
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [base, store, revision, draftReady]);

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
      : (ids[0] ?? "");
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
    setPreview(null);
  };
  const localeEditor = (key: string, label: string, multiline = false) => (
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
                    store.setCell("machines", selected, "operationsJson", "[]");
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
              touch(() => setMachineUnlock(store, selected, event.target.value))
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
        {unlockHintKey && localeEditor(unlockHintKey, "Unlock hint", true)}
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
          <small>
            Blur the field to derive stable hazard localization keys.
          </small>
        </label>
        {hazardNameKey && localeEditor(hazardNameKey, "Hazard name")}
        {hazardObservationKey &&
          localeEditor(hazardObservationKey, "Hazard observation", true)}
      </>
    );
  };


  const materialSelect = (
    value: string,
    onChange: (value: string) => void,
  ) => (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Choose material…</option>
      {studioEntityIds(store, "material").map((id) => (
        <option key={id} value={id}>
          {studioEntityLabel(store, "material", id)} · {id}
        </option>
      ))}
    </select>
  );

  const editExchange = () => {
    if (!row || !selected) return null;
    return (
      <>
        <p className="muted">
          Listing for {studioEntityLabel(store, "material", selected)} · {selected}
        </p>
        <div className="studio-number-grid">
          {[
            ["baseCompensation", "Base compensation"],
            ["floorCompensation", "Floor compensation"],
            ["baseDemandBps", "Base demand bps"],
            ["saturationPerUnitBps", "Saturation / unit bps"],
            ["recoveryPerMarketTickBps", "Saturation recovery / market tick"],
            ["demandRecoveryPerMarketTickBps", "Demand recovery / market tick"],
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
                      "exchange",
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
          <span>Required terminal capability ID</span>
          <input
            value={String(row.requiredTerminalCapabilityId ?? "")}
            onChange={(event) =>
              touch(() =>
                store.setCell(
                  "exchange",
                  selected,
                  "requiredTerminalCapabilityId",
                  event.target.value,
                ),
              )
            }
            placeholder="blank = ordinary outbound handling"
          />
        </label>
      </>
    );
  };

  const editImport = () => {
    if (!row || !selected) return null;
    return (
      <>
        {localeEditor(String(row.nameKey), "English name")}
        {localeEditor(String(row.briefKey), "Company brief", true)}
        <label className="studio-field">
          <span>Imported material</span>
          {materialSelect(String(row.materialId ?? ""), (value) =>
            touch(() => store.setCell("imports", selected, "materialId", value)),
          )}
        </label>
        <div className="studio-number-grid">
          {[
            ["quantity", "Quantity"],
            ["fuelCost", "Fuel cost"],
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
                      "imports",
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
          <span>Terminal module ID</span>
          <input
            value={String(row.terminalModuleId ?? "")}
            onChange={(event) =>
              touch(() =>
                store.setCell(
                  "imports",
                  selected,
                  "terminalModuleId",
                  event.target.value,
                ),
              )
            }
            placeholder="blank = dry import staging"
          />
        </label>
        <label className="studio-field">
          <span>Required opportunity ID</span>
          <input
            value={String(row.requiredOpportunityId ?? "")}
            onChange={(event) =>
              touch(() =>
                store.setCell(
                  "imports",
                  selected,
                  "requiredOpportunityId",
                  event.target.value,
                ),
              )
            }
            placeholder="blank = company-known supply"
          />
        </label>
      </>
    );
  };

  const editOrder = () => {
    if (!row || !selected) return null;
    return (
      <>
        {localeEditor(String(row.nameKey), "English name")}
        {localeEditor(String(row.briefKey), "Company brief", true)}
        <label className="studio-field">
          <span>Requested material</span>
          {materialSelect(String(row.materialId ?? ""), (value) =>
            touch(() => store.setCell("orders", selected, "materialId", value)),
          )}
        </label>
        <div className="studio-number-grid">
          {[
            ["quantity", "Quantity"],
            ["durationTicks", "Duration ticks"],
            ["rewardFuel", "Fuel reward"],
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
                      "orders",
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
      </>
    );
  };

  const editPropertyDirective = () => {
    if (!row || !selected) return null;
    return (
      <>
        {localeEditor(String(row.nameKey), "English name")}
        {localeEditor(String(row.briefKey), "Company brief", true)}
        {localeEditor(String(row.propertyKey), "Requested property", true)}
        <label className="studio-field">
          <span>Target material</span>
          {materialSelect(String(row.targetMaterialId ?? ""), (value) =>
            touch(() =>
              store.setCell(
                "propertyDirectives",
                selected,
                "targetMaterialId",
                value,
              ),
            ),
          )}
        </label>
        <label className="studio-field">
          <span>Accepted solution reactions</span>
          <input
            value={commaList(row.solutionReactionIdsJson)}
            onChange={(event) =>
              touch(() => {
                const values = event.target.value
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean);
                store.setCell(
                  "propertyDirectives",
                  selected,
                  "solutionReactionIdsJson",
                  JSON.stringify(values),
                );
              })
            }
            placeholder="reaction-id, another-reaction"
          />
          <small>Stable reaction IDs, comma-separated. These remain developer-only spoilers.</small>
        </label>
        <div className="studio-number-grid">
          {[
            ["durationTicks", "Duration ticks"],
            ["rewardFuel", "Fuel reward"],
          ].map(([field, label]) => (
            <label className="studio-field" key={field}>
              <span>{label}</span>
              <input
                type="number"
                min={field === "rewardFuel" ? 0 : 1}
                value={Number(row[field])}
                onChange={(event) =>
                  touch(() =>
                    store.setCell(
                      "propertyDirectives",
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
          <span>Import reward</span>
          <select
            value={String(row.rewardImportSupplyId ?? "")}
            onChange={(event) =>
              touch(() =>
                store.setCell(
                  "propertyDirectives",
                  selected,
                  "rewardImportSupplyId",
                  event.target.value,
                ),
              )
            }
          >
            <option value="">No physical import reward</option>
            {studioEntityIds(store, "import").map((id) => (
              <option key={id} value={id}>
                {studioEntityLabel(store, "import", id)} · {id}
              </option>
            ))}
          </select>
        </label>
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
                onClick={() => {
                  setSelectedId(id);
                  setPreview(null);
                }}
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
                  setPreview(null);
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
                      setPreview(null);
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
                {row &&
                  (kind === "material" || kind === "machine") &&
                  (kind === "material"
                    ? [
                        [
                          "requiredContainmentJson",
                          "Required containment (JSON array)",
                        ],
                      ]
                    : [
                        [
                          "inputContainmentJson",
                          "Input containment (JSON array)",
                        ],
                        [
                          "outputContainmentJson",
                          "Output containment (JSON array)",
                        ],
                      ]
                  ).map(([cell, label]) => (
                    <label key={cell} className="studio-field">
                      <span>{label}</span>
                      <input
                        value={String(row[cell] ?? "[]")}
                        onChange={(e) =>
                          touch(() =>
                            store.setCell(
                              tableFor[kind],
                              selected,
                              cell,
                              e.target.value,
                            ),
                          )
                        }
                      />
                      <small>
                        Use stable capability IDs from the bundle catalogue.
                        Invalid references block export and preview.
                      </small>
                    </label>
                  ))}
                {kind === "material" && editMaterial()}
                {kind === "operation" && editOperation()}
                {kind === "machine" && editMachine()}
                {kind === "reaction" && editReaction()}
                {kind === "exchange" && editExchange()}
                {kind === "import" && editImport()}
                {kind === "order" && editOrder()}
                {kind === "property-directive" && editPropertyDirective()}
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
            <div className="studio-section-title">Simulation preview</div>
            {kind === "reaction" && selected ? (
              <>
                <button
                  className="secondary studio-preview-button"
                  disabled={Boolean(validationError)}
                  onClick={() =>
                    perform(() => {
                      const bundle = studioBundleFromStore(store, base);
                      const result = previewStudioReaction(
                        bundle.content,
                        selected,
                      );
                      setPreview(result);
                      setMessage(
                        "Fresh isolated simulation preview completed for " +
                          selected +
                          ".",
                      );
                    })
                  }
                >
                  Preview selected reaction
                </button>
                {validationError && (
                  <p className="muted">
                    Fix bundle validation before starting a preview.
                  </p>
                )}
                {preview && preview.reactionId === selected && (
                  <dl className="studio-preview-result">
                    <div>
                      <dt>Processor</dt>
                      <dd>{preview.machineDefinitionId}</dd>
                    </div>
                    <div>
                      <dt>Operation</dt>
                      <dd>{preview.operationId}</dd>
                    </div>
                    <div>
                      <dt>Condition</dt>
                      <dd>{preview.processConditionId ?? "default"}</dd>
                    </div>
                    <div>
                      <dt>Result</dt>
                      <dd>
                        {preview.outputAmount} × {preview.outputId}
                      </dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{preview.machineStatus}</dd>
                    </div>
                    <div>
                      <dt>Incident</dt>
                      <dd>{preview.incidentId ?? "none"}</dd>
                    </div>
                    <div>
                      <dt>Ticks</dt>
                      <dd>{preview.ticks}</dd>
                    </div>
                    <div>
                      <dt>Fuel left</dt>
                      <dd>{preview.fuelRemaining}</dd>
                    </div>
                  </dl>
                )}
              </>
            ) : (
              <p className="muted">
                Select a reaction to run it in a fresh isolated simulation.
              </p>
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
                      JSON.stringify(
                        JSON.parse(serialized) as unknown,
                        null,
                        2,
                      ),
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
                    const serialized = serializeStudioBundle(store, base);
                    const bundle = parseStudioBundle(serialized);
                    const blob = new Blob([serialized], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "unknown-yield-" +
                      bundle.content.version.replace(/[^a-zA-Z0-9_-]/g, "-") + ".json";
                    document.body.append(link);
                    link.click();
                    link.remove();
                    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
                    setMessage("Validated pack downloaded. Open the game → Expedition controls → Offline content packs → import this JSON → start a new test expedition. No rebuild needed.");
                  })
                }
              >
                Download validated playtest pack
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
                    setPreview(null);
                    setRevision((value) => value + 1);
                    setMessage("Validated Studio bundle imported.");
                  })
                }
              >
                Import bundle
              </button>
            </div>
            <p className="hint">The Studio draft autosaves separately from game saves. Only validated bundles can be downloaded or imported into a new expedition; broken drafts stay editable here.</p>
            <button className="secondary" onClick={() => {
              if (!window.confirm("Discard your Studio draft and return to the built-in authoring baseline? Game saves and published packs are not affected.")) return;
              clearStudioDraft(window.localStorage);
              setBase(structuredClone(fixture));
              setStore(createContentStore(fixture, enCatalog));
              setKind("material");
              setSelectedId(fixture.materials[0].id);
              setJson("");
              setPreview(null);
              setRevision((n) => n + 1);
              setMessage("Studio draft reset. Existing game saves were not modified.");
            }}>
              Reset Studio draft to built-in content
            </button>
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
