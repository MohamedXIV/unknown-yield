"use client";
import { useState } from "react";
import { fixture, validateContent, type Content } from "@site/content";
import { createContentStore, contentFromStore } from "@site/content/studio";
import { Simulation } from "@site/sim-core";
export default function Studio() {
  const [base, setBase] = useState<Content>(() => structuredClone(fixture));
  const [store, setStore] = useState(() => createContentStore(fixture));
  const [revision, setRevision] = useState(0),
    [json, setJson] = useState(""),
    [message, setMessage] = useState(
      "Development authoring surface — contains canonical spoilers.",
    );
  const [preview, setPreview] = useState("");
  const perform = (action: () => void) => {
    try {
      action();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Invalid content");
    }
  };
  const rows = store.getTable("materials");
  return (
    <main className="studio-page" data-revision={revision}>
      <a href="/">← Back to expedition</a>
      <div className="eyebrow">DEVELOPMENT ONLY / CONTENT STUDIO</div>
      <h1>Material workbench</h1>
      <p>
        Edits live in TinyBase. Export validates the complete content snapshot.
        Preview always creates a fresh simulation.
      </p>
      <table>
        <thead>
            <tr>
              <th>ID</th>
              <th>Name key</th>
              <th>Export fuel / unit</th>
            </tr>
        </thead>
        <tbody>
          {Object.entries(rows).map(([id, row]) => (
            <tr key={id}>
              <td>{id}</td>
              <td>
                <input
                  aria-label={`${id} name key`}
                  value={String(row.nameKey)}
                  onChange={(e) => {
                    store.setCell("materials", id, "nameKey", e.target.value);
                    setRevision((n) => n + 1);
                  }}
                />
              </td>
              <td>
                <input
                  type="number"
                  aria-label={`${id} export value`}
                  value={Number(row.exportValue)}
                  onChange={(e) => {
                    store.setCell(
                      "materials",
                      id,
                      "exportValue",
                      Number(e.target.value),
                    );
                    setRevision((n) => n + 1);
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="studio-actions">
        <button
          className="primary-button"
          onClick={() =>
            perform(() => {
              const next = contentFromStore(store, base);
              setJson(JSON.stringify(next, null, 2));
              setMessage("Valid snapshot exported to JSON below.");
            })
          }
        >
          Validate & export
        </button>
        <button
          className="secondary-button"
          onClick={() =>
            perform(() => {
              const next = validateContent(JSON.parse(json));
              setBase(next);
              setStore(createContentStore(next));
              setMessage("Validated content imported.");
            })
          }
        >
          Import JSON
        </button>
        <button
          className="secondary-button"
          onClick={() =>
            perform(() => {
              const c = contentFromStore(store, base);
              const sim = new Simulation(c);
              const deposit = c.site.deposits[0];
              sim.command({
                type: "placeMachine",
                definitionId: c.machines.find((m) => m.role === "extractor")!
                  .id,
                x: deposit.x,
                y: deposit.y,
                direction: 0,
              });
              sim.step(3000);
              setPreview(JSON.stringify(sim.snapshot(), null, 2));
              setMessage(
                "Fresh simulation preview completed. Existing game saves are untouched.",
              );
            })
          }
        >
          Fresh preview
        </button>
      </div>
      <p role="status">{message}</p>
      <label htmlFor="content-json">Versioned content snapshot</label>
      <textarea
        id="content-json"
        value={json}
        onChange={(e) => setJson(e.target.value)}
        spellCheck={false}
      />
      {preview && (
        <details open>
          <summary>Fresh simulation result</summary>
          <pre>{preview}</pre>
        </details>
      )}
    </main>
  );
}
