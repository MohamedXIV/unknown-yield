"use client";

import { useMemo, useState } from "react";
import type { VoiceNote } from "@site/content";
import { voiceRuleLabels } from "@site/content";
import {
  addStudioCopyKey,
  copyEntries,
  filterCopy,
} from "../game/studio-copy";
import {
  setStudioLocaleText,
  type ContentStore,
} from "../game/studio-workbench";

type Props = {
  store: ContentStore;
  revision: number;
  contentKeys: ReadonlySet<string>;
  voiceNotes: readonly VoiceNote[];
  onEdit: (action: () => void) => void;
  onMessage: (message: string) => void;
  /** Present only under `npm run dev:studio`. */
  repo: { save: () => void; reload: () => void } | null;
};

/**
 * Every player-facing string in one place: names, briefs, hints, UI copy.
 * Keys are never deleted here (UI code may still refer to them); a key that
 * content refers to is marked so nobody renames it by accident.
 */
export default function StudioCopy({
  store,
  revision,
  contentKeys,
  voiceNotes,
  onEdit,
  onMessage,
  repo,
}: Props) {
  const [query, setQuery] = useState("");
  const [namespace, setNamespace] = useState("");
  const [picked, setPicked] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newText, setNewText] = useState("");

  // `revision` changes whenever the store is edited.
  const entries = useMemo(
    () => copyEntries(store, contentKeys),
    [store, revision, contentKeys],
  );
  const namespaces = useMemo(
    () => [...new Set(entries.map((entry) => entry.namespace))],
    [entries],
  );
  const shown = useMemo(
    () => filterCopy(entries, query, namespace),
    [entries, query, namespace],
  );
  const selected =
    entries.find((entry) => entry.key === picked) ?? shown[0] ?? null;
  const notes = voiceNotes.filter((note) => note.key === selected?.key);

  return (
    <div className="studio-shell" data-testid="studio-copy">
      <aside className="studio-list-panel">
        <input
          className="studio-search"
          aria-label="Filter copy"
          placeholder="Filter by key or wording"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Copy namespace"
          value={namespace}
          onChange={(event) => setNamespace(event.target.value)}
        >
          <option value="">All namespaces ({entries.length})</option>
          {namespaces.map((entry) => (
            <option key={entry} value={entry}>
              {entry} ({entries.filter((e) => e.namespace === entry).length})
            </option>
          ))}
        </select>
        <div className="studio-entity-list">
          {shown.slice(0, 200).map((entry) => (
            <button
              key={entry.key}
              className={selected?.key === entry.key ? "active" : ""}
              onClick={() => setPicked(entry.key)}
            >
              <strong>{entry.text.slice(0, 60) || entry.key}</strong>
              <small>{entry.key}</small>
            </button>
          ))}
          {shown.length > 200 && (
            <p className="muted">
              {shown.length - 200} more. Narrow the filter to see them.
            </p>
          )}
          {!shown.length && <p className="muted">No matching copy.</p>}
        </div>
        <div className="studio-create">
          <input
            aria-label="New copy key"
            placeholder="ui.area.thing.title"
            value={newKey}
            onChange={(event) => setNewKey(event.target.value)}
          />
          <input
            aria-label="New copy text"
            placeholder="Wording"
            value={newText}
            onChange={(event) => setNewText(event.target.value)}
          />
          <button
            className="primary"
            onClick={() => {
              try {
                const key = addStudioCopyKey(store, newKey, newText);
                onEdit(() => undefined);
                setPicked(key);
                setQuery("");
                setNamespace("");
                setNewKey("");
                setNewText("");
                onMessage("Added copy " + key + ".");
              } catch (error) {
                onMessage(error instanceof Error ? error.message : String(error));
              }
            }}
          >
            Add copy
          </button>
        </div>
      </aside>

      <section className="studio-editor-panel">
        {selected ? (
          <>
            <div className="studio-editor-header">
              <h2>{selected.key}</h2>
              <span>
                {selected.inContent
                  ? "Used by content: keep the key, change the wording"
                  : "Not referenced by content (UI or free copy)"}
              </span>
            </div>
            <label className="studio-field">
              <span>Wording</span>
              <textarea
                aria-label={"Wording for " + selected.key}
                value={selected.text}
                rows={8}
                onChange={(event) =>
                  onEdit(() =>
                    setStudioLocaleText(store, selected.key, event.target.value),
                  )
                }
              />
            </label>
            <p className="hint">
              Placeholders such as {"{{count}}"} are filled in by the game; keep
              them exactly as written.
            </p>
          </>
        ) : (
          <div className="studio-empty">
            <h2>No copy selected</h2>
          </div>
        )}
      </section>

      <aside className="studio-inspector-panel">
        <section>
          <div className="studio-section-title">Voice notes · this key</div>
          {notes.length ? (
            <ul className="studio-reference-list">
              {notes.map((note) => (
                <li key={note.rule}>
                  <strong>{voiceRuleLabels[note.rule]}</strong>
                  <span>
                    {note.message} {note.excerpt}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No notes for this wording.</p>
          )}
        </section>
        {repo && (
          <section data-testid="studio-repo-files">
            <div className="studio-section-title">Repo files</div>
            <div className="studio-bundle-actions">
              <button className="primary" onClick={repo.save}>
                Save draft to repo files
              </button>
              <button className="secondary" onClick={repo.reload}>
                Reload from repo files
              </button>
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}
