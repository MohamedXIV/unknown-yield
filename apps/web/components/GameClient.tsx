"use client";
import { useEffect, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { i18n } from "../game/i18n";
import type { GameCommand, CommandResult, Inventory } from "@site/sim-core";
import { Session } from "../game/session";
import { DEFAULT_MODE, type WorldMode, type Tool } from "../game/interaction";
import GameHost from "./GameHost";
function Glyph({ type, size = 20 }: { type: string; size?: number }) {
  const paths: Record<string, string> = {
    select: "M5 3l14 10-7 1-3 7z",
    extractor: "M5 21V4h13 M6 7h10 M15 4v14 M12 10l6 3-6 3 6 3",
    factory: "M3 21V9l6 4V7l6 5V4h5v17z M7 17h2 M12 17h2 M17 17h1",
    crusher: "M3 4h18l-5 8v8H8v-8z M9 7l3 3 3-3",
    furnace:
      "M5 21V8h14v13z M8 4h8 M12 10c0 4-3 3-3 6a3 3 0 0 0 6 0c0-2-2-3-3-6z",
    belt: "M3 6h18v12H3z M6 9l4 3-4 3 M13 9l4 3-4 3",
    port: "M3 4v16 M21 4v16 M5 12h14 M13 7l6 5-6 5",
    demolish: "M5 4l15 15 M15 3l6 6-7 7-6-6z M3 21l6-6",
    book: "M3 4h6l3 2 3-2h6v16h-6l-3 2-3-2H3z M12 6v16",
    terminal: "M4 5h16v12H4z M8 21h8 M12 17v4 M7 8l3 3-3 3 M12 14h5",
    menu: "M4 6h16 M4 12h16 M4 18h16",
    save: "M3 3h15l3 3v15H3z M7 3v6h10V3 M7 21v-8h10v8",
    home: "M3 11l9-8 9 8 M5 10v11h14V10 M9 21v-7h6v7",
    pause: "M8 4v16 M16 4v16",
    play: "M6 3l15 9-15 9z",
    roof: "M2 12l10-9 10 9 M5 10v11h14V10",
    fuel: "M12 2c0 6-7 8-7 14a7 7 0 0 0 14 0c0-4-3-7-3-7s1 6-3 6c2-5-1-13-1-13z",
    plates: "M3 7l9-5 9 5-9 5z M3 12l9 5 9-5 M3 17l9 5 9-5",
    help: "M9 8a3 3 0 1 1 6 0c0 3-3 3-3 6 M12 18h.01",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[type] ?? paths.factory} />
    </svg>
  );
}
const names: Record<Tool, string> = {
  select: "Inspect",
  extractor: "Extractor",
  factory: "Factory",
  crusher: "Crusher",
  furnace: "Furnace",
  belt: "Belt",
  port: "Wall port",
  demolish: "Dismantle",
};
const descriptions: Record<Tool, string> = {
  select:
    "Click equipment to inspect. Drag with the right mouse button to pan.",
  extractor:
    "Place entirely on a deposit. The arrow marks its output belt cell.",
  factory: "Drag a rectangle, 6–20 cells per side. Click for a 6×6 factory.",
  crusher: "Place inside a factory. Cyan is input; gold is output.",
  furnace:
    "Place inside a factory. Operation: heat. Outcomes require observation.",
  belt: "Drag a ground path. Release to build. Click for one cell; R changes its direction.",
  port: "Place on a factory wall. R changes flow direction. Add a belt on the port.",
  demolish:
    "Click a structure to reclaim it and its contents. Stop active machines first.",
};
function GameClientInner() {
  const { t } = useTranslation();
  const [session] = useState(() => new Session()),
    [snapshot, setSnapshot] = useState(() => session.snapshot());
  const [mode, setMode] = useState<WorldMode>(DEFAULT_MODE),
    [panel, setPanel] = useState<
      "selection" | "knowledge" | "terminal" | "menu" | null
    >(null);
  const [notice, setNotice] = useState<CommandResult | null>(null),
    [paused, setPaused] = useState(false),
    [guide, setGuide] = useState(true),
    [homeToken, setHomeToken] = useState(0),
    [confirmReset, setConfirmReset] = useState(false);
  useEffect(
    () => session.subscribe(() => setSnapshot(session.snapshot())),
    [session],
  );
  useEffect(() => {
    const hide = () => session.suspend();
    document.addEventListener("visibilitychange", hide);
    const timer = setInterval(
      () => session.advance(performance.now(), document.hidden || paused),
      100,
    );
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [session, paused]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  const setTool = (tool: Tool) => {
    setMode((m) => ({ ...m, tool, selected: null }));
    setPanel(null);
  };
  const select = (id: string | null) => {
    setMode((m) => ({ ...m, selected: id }));
    setPanel(id === "terminal" ? "terminal" : id ? "selection" : null);
  };
  const toggleFactory = (id: string) =>
    setMode((m) => ({
      ...m,
      openFactories: m.openFactories.includes(id)
        ? m.openFactories.filter((a) => a !== id)
        : [...m.openFactories, id],
    }));
  const act = (cmd: GameCommand) => {
    const result = session.command(cmd);
    setNotice(result);
    if (result.ok && cmd.type === "placeFactory" && result.id)
      setMode((m) => ({
        ...m,
        openFactories: [...m.openFactories, result.id!],
      }));
    if (result.ok && cmd.type === "dismantle" && cmd.id === mode.selected) {
      setMode((m) => ({ ...m, selected: null }));
      setPanel(null);
    }
    return result;
  };
  const persist = (load: boolean) => {
    try {
      const result = load
        ? session.restore(localStorage)
        : session.save(localStorage);
      setNotice(result);
      if (load && result.ok) {
        setMode(DEFAULT_MODE);
        setPanel(null);
      }
    } catch {
      setNotice({
        ok: false,
        message: "Storage is unavailable. Your running site is unchanged.",
      });
    }
  };
  const machine = snapshot.machines.find((m) => m.id === mode.selected),
    factory = snapshot.factories.find((f) => f.id === mode.selected),
    belt = snapshot.belts.find((b) => b.id === mode.selected),
    portFactory = snapshot.factories.find((f) =>
      f.ports.some((p) => p.id === mode.selected),
    ),
    deposit = snapshot.deposits.find((d) => d.id === mode.selected);
  const materialName = (id: string) => {
    const key = snapshot.materials.find((m) => m.id === id)?.nameKey;
    return key ? t(key) : "Unidentified material";
  };
  const buffer = (inv: Inventory) => (
    <div className="inventory">
      {Object.entries(inv).length ? (
        Object.entries(inv).map(([id, n]) => (
          <div key={id}>
            <i
              style={{
                background: snapshot.materials.find((m) => m.id === id)?.color,
              }}
            />
            <span>{materialName(id)}</span>
            <b>{n}</b>
          </div>
        ))
      ) : (
        <span className="muted">Empty</span>
      )}
    </div>
  );
  const fresh = snapshot.observations.filter((o) => !o.initial).length;
  const toolCost = (tool: Tool) =>
    tool === "factory"
      ? snapshot.map.factoryCellCost
      : tool === "belt"
        ? snapshot.map.beltCost
        : tool === "port"
          ? snapshot.map.portCost
          : snapshot.definitions.find((d) => d.id === tool)?.cost;
  const close = () => {
    setPanel(null);
    setMode((m) => ({ ...m, selected: null }));
  };
  return (
    <main className="game">
      <GameHost
        session={session}
        mode={mode}
        homeToken={homeToken}
        actions={{
          select,
          command: act,
          preview: session.preview,
          mode: setTool,
          rotate: () =>
            setMode((m) => ({ ...m, direction: (m.direction + 1) % 4 })),
          toggleFactory,
        }}
      />
      <header className="hud-top">
        <div className="site-mark">
          <span className="brand-symbol">Y</span>
          <div>
            UNKNOWN YIELD<small>THE PALE REACH · SITE 01</small>
          </div>
        </div>
        <div className="resources">
          <span title="Construction stock">
            <Glyph type="plates" />
            <b data-testid="plates">{snapshot.stock.plates ?? 0}</b>
            <small>PLATES</small>
          </span>
          <span
            className={snapshot.fuel < 10 ? "low" : ""}
            title="Company fuel allocation"
          >
            <Glyph type="fuel" />
            <b data-testid="fuel">{snapshot.fuel}</b>
            <small>FUEL</small>
          </span>
        </div>
        <nav className="hud-actions" aria-label="Game controls">
          <button
            aria-label="Knowledge notebook"
            title="Knowledge"
            onClick={() => {
              setPanel(panel === "knowledge" ? null : "knowledge");
              setMode((m) => ({ ...m, tool: "select" }));
            }}
          >
            <Glyph type="book" />
            {fresh > 0 && <i>{fresh}</i>}
          </button>
          <button
            aria-label="Company terminal"
            title="Company terminal"
            onClick={() => {
              setPanel(panel === "terminal" ? null : "terminal");
              setMode((m) => ({ ...m, tool: "select", selected: "terminal" }));
            }}
          >
            <Glyph type="terminal" />
          </button>
          <button
            aria-label="Center camera"
            title="Center camera · Home"
            onClick={() => setHomeToken((n) => n + 1)}
          >
            <Glyph type="home" />
          </button>
          <button
            aria-label={paused ? "Resume simulation" : "Pause simulation"}
            title={paused ? "Resume" : "Pause"}
            onClick={() => {
              session.suspend();
              setPaused(!paused);
            }}
          >
            <Glyph type={paused ? "play" : "pause"} />
          </button>
          <button
            aria-label="Game menu"
            title="Save & settings"
            onClick={() => setPanel(panel === "menu" ? null : "menu")}
          >
            <Glyph type="menu" />
          </button>
        </nav>
      </header>
      {guide && (
        <aside className="field-guide">
          <button
            aria-label="Close build guide"
            onClick={() => setGuide(false)}
          >
            ×
          </button>
          <small>ESTABLISH YOUR OPERATION</small>
          <h2>
            {snapshot.milestone
              ? "The line is yours. Keep building."
              : "Build a process. Discover a possibility."}
          </h2>
          <ol>
            <li
              className={
                snapshot.machines.some((m) => m.role === "extractor")
                  ? "done"
                  : ""
              }
            >
              Place an extractor over ferrite rubble.
            </li>
            <li className={snapshot.factories.length ? "done" : ""}>
              Draw a factory. Put a crusher inside.
            </li>
            <li className={snapshot.belts.length ? "done" : ""}>
              Route belts through wall ports to the crusher, then the terminal.
            </li>
            <li className={snapshot.milestone ? "done" : ""}>
              Expand with local plates. Experiment with veined ore.
            </li>
          </ol>
          <p>
            Everything runs automatically. Follow the input and output arrows.
          </p>
        </aside>
      )}
      {!guide && (
        <button
          className="guide-toggle"
          aria-label="Open build guide"
          onClick={() => setGuide(true)}
        >
          <Glyph type="help" size={16} />
        </button>
      )}
      {notice && (
        <div role="status" className={"toast " + (notice.ok ? "" : "error")}>
          {notice.ok ? "◇" : "!"} <span>{notice.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}
      {paused && <div className="paused-label">PAUSED</div>}
      {panel && (
        <aside className="context-panel">
          <div className="context-header">
            <span>
              {panel === "knowledge"
                ? "FIELD NOTEBOOK"
                : panel === "terminal"
                  ? "COMPANY TERMINAL"
                  : panel === "menu"
                    ? "EXPEDITION MENU"
                    : "INSPECT"}
            </span>
            <button aria-label="Close panel" onClick={close}>
              ×
            </button>
          </div>
          <div className="context-body">
            {panel === "selection" && (
              <>
                {machine && (
                  <>
                    <small className="eyebrow">
                      {machine.id.toUpperCase()} · AUTOMATED EQUIPMENT
                    </small>
                    <h2>{t(machine.nameKey)}</h2>
                    <div
                      className={
                        "status-line " +
                        (machine.status === "Processing" ? "running" : "")
                      }
                    >
                      {machine.status}
                    </div>
                    <div className="progress-track">
                      <i style={{ width: machine.progress * 100 + "%" }} />
                    </div>
                    <div className="facts">
                      <span>
                        Fuel / batch<b>{machine.fuelCost}</b>
                      </span>
                      <span>
                        Batch time<b>{machine.durationMs / 1000}s</b>
                      </span>
                    </div>
                    {machine.operation && (
                      <label className="operation-label">
                        Operation
                        <select
                          aria-label="Machine operation"
                          value={machine.operation}
                          disabled={!!machine.job}
                          onChange={(e) =>
                            act({
                              type: "setOperation",
                              machineId: machine.id,
                              operation: e.target.value,
                            })
                          }
                        >
                          {snapshot.definitions
                            .find((d) => d.id === machine.definitionId)!
                            .operations.map((id) => (
                              <option value={id} key={id}>
                                {t(
                                  snapshot.operations.find((o) => o.id === id)
                                    ?.nameKey ?? id,
                                )}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                    <button
                      className="primary"
                      onClick={() =>
                        act({
                          type: "setEnabled",
                          machineId: machine.id,
                          enabled: !machine.enabled,
                        })
                      }
                    >
                      {machine.enabled
                        ? "Stop after this batch"
                        : "Enable automatic operation"}
                    </button>
                    {machine.role === "processor" && (
                      <>
                        <h3>
                          Input{" "}
                          <small>
                            {Object.values(machine.input).reduce(
                              (a, b) => a + b,
                              0,
                            )}{" "}
                            / {machine.capacity}
                          </small>
                        </h3>
                        {buffer(machine.input)}
                        {Object.keys(machine.input).length > 0 && (
                          <button
                            className="subtle"
                            onClick={() =>
                              act({
                                type: "discard",
                                machineId: machine.id,
                                buffer: "input",
                              })
                            }
                          >
                            Discard input
                          </button>
                        )}
                      </>
                    )}
                    <h3>
                      Output{" "}
                      <small>
                        {Object.values(machine.output).reduce(
                          (a, b) => a + b,
                          0,
                        )}{" "}
                        / {machine.capacity}
                      </small>
                    </h3>
                    {buffer(machine.output)}
                    {Object.keys(machine.output).length > 0 && (
                      <button
                        className="subtle"
                        onClick={() =>
                          act({
                            type: "discard",
                            machineId: machine.id,
                            buffer: "output",
                          })
                        }
                      >
                        Discard output
                      </button>
                    )}
                    <p className="hint">
                      Cyan arrow: incoming belt. Gold arrow: outgoing belt.
                      Unfamiliar outcomes are recorded after processing.
                    </p>
                    <button
                      className="danger"
                      onClick={() => act({ type: "dismantle", id: machine.id })}
                    >
                      Dismantle & reclaim
                    </button>
                  </>
                )}
                {factory && (
                  <>
                    <small className="eyebrow">
                      {factory.width} × {factory.height} CELLS
                    </small>
                    <h2>Factory {factory.id.slice(1)}</h2>
                    <button
                      className="primary"
                      onClick={() => toggleFactory(factory.id)}
                    >
                      <Glyph type="roof" size={16} />
                      {mode.openFactories.includes(factory.id)
                        ? "Close roof"
                        : "Open interior"}{" "}
                      <kbd>F</kbd>
                    </button>
                    <p className="hint">
                      Closing the roof keeps every machine and belt running.
                    </p>
                    <div className="facts">
                      <span>
                        Machines
                        <b>
                          {
                            snapshot.machines.filter(
                              (m) => m.factoryId === factory.id,
                            ).length
                          }
                        </b>
                      </span>
                      <span>
                        Wall ports<b>{factory.ports.length}</b>
                      </span>
                    </div>
                    <h3>Observed buffers</h3>
                    {buffer(
                      snapshot.machines
                        .filter((m) => m.factoryId === factory.id)
                        .reduce<Inventory>((sum, m) => {
                          for (const [id, n] of Object.entries(m.output))
                            sum[id] = (sum[id] ?? 0) + n;
                          return sum;
                        }, {}),
                    )}
                    <h3>Equipment</h3>
                    {snapshot.machines
                      .filter((m) => m.factoryId === factory.id)
                      .map((m) => (
                        <button
                          className="entity-row"
                          key={m.id}
                          onClick={() => {
                            if (!mode.openFactories.includes(factory.id))
                              toggleFactory(factory.id);
                            select(m.id);
                          }}
                        >
                          <span>{t(m.nameKey)}</span>
                          <small>{m.status}</small>
                        </button>
                      ))}
                    <button
                      className="secondary"
                      onClick={() => setTool("port")}
                    >
                      Add a wall port
                    </button>
                    <button
                      className="danger"
                      onClick={() => act({ type: "dismantle", id: factory.id })}
                    >
                      Dismantle empty factory
                    </button>
                  </>
                )}
                {belt && (
                  <>
                    <h2>Ground belt</h2>
                    <p className="hint">
                      Direction:{" "}
                      {["east", "south", "west", "north"][belt.direction]}. One
                      cargo slot; stops when the next cell is occupied.
                    </p>
                    {belt.cargo ? (
                      buffer({ [belt.cargo]: 1 })
                    ) : (
                      <p className="muted">No cargo</p>
                    )}
                    <button
                      className="danger"
                      onClick={() => act({ type: "dismantle", id: belt.id })}
                    >
                      Reclaim belt & cargo
                    </button>
                  </>
                )}
                {portFactory && !belt && !machine && (
                  <>
                    <h2>Wall port</h2>
                    <p className="hint">
                      Place a belt on this cell with the same flow direction.
                      Remove that belt before reclaiming the port.
                    </p>
                    <button
                      className="danger"
                      onClick={() =>
                        act({ type: "dismantle", id: mode.selected! })
                      }
                    >
                      Reclaim port
                    </button>
                  </>
                )}
                {deposit && (
                  <>
                    <small className="eyebrow">SURFACE DEPOSIT</small>
                    <h2>{materialName(deposit.material)}</h2>
                    <div className="facts">
                      <span>
                        Remaining<b>{deposit.remaining}</b>
                      </span>
                    </div>
                    <p className="hint">
                      Place an extractor entirely inside this field. Route its
                      output to a processor.
                    </p>
                    <button
                      className="primary"
                      onClick={() => setTool("extractor")}
                    >
                      Place extractor
                    </button>
                  </>
                )}
              </>
            )}
            {panel === "knowledge" && (
              <>
                <h2>Learn by doing.</h2>
                <p className="hint">
                  Known construction methods and your observed discoveries.
                  There is no complete recipe book.
                </p>
                {snapshot.observations.map((o) => (
                  <article
                    className="observation"
                    key={o.operationId + o.inputId}
                  >
                    <small>
                      {o.initial ? "KNOWN METHOD" : "OBSERVED"} ·{" "}
                      {t(
                        snapshot.operations.find(
                          (op) => op.id === o.operationId,
                        )?.nameKey ?? o.operationId,
                      ).toUpperCase()}
                    </small>
                    <h3>{materialName(o.outputId)}</h3>
                    <p>{t(o.textKey)}</p>
                    <span>
                      {materialName(o.inputId)} →{" "}
                      {t(
                        snapshot.operations.find(
                          (op) => op.id === o.operationId,
                        )?.nameKey ?? o.operationId,
                      )}
                    </span>
                  </article>
                ))}
              </>
            )}
            {panel === "terminal" && (
              <>
                <small className="eyebrow">ORBITAL UPLINK · CONNECTED</small>
                <h2>Keep the expedition moving.</h2>
                <div className="facts">
                  <span>
                    Exported<b data-testid="exported">{snapshot.exported}</b>
                  </span>
                  <span>
                    Obligation<b>{snapshot.debt} fuel</b>
                  </span>
                </div>
                {snapshot.milestone && (
                  <div className="milestone">◇ FIRST EXPORT CONFIRMED</div>
                )}
                <h3>Site stock & policies</h3>
                <p className="hint">
                  Incoming cargo joins site stock. Reserved plates fund
                  construction. Exported materials repay obligations before
                  allocating fuel.
                </p>
                {snapshot.materials.map((m) => (
                  <div className="policy" key={m.id}>
                    <div>
                      <i style={{ background: m.color }} />
                      <span>
                        {t(m.nameKey)}
                        <small>
                          {snapshot.stock[m.id] ?? 0} stored{" "}
                          {m.exportValue
                            ? "· " + m.exportValue + " fuel/unit"
                            : ""}
                        </small>
                      </span>
                    </div>
                    <select
                      aria-label={t(m.nameKey) + " policy"}
                      value={snapshot.policies[m.id] ?? "keep"}
                      onChange={(e) =>
                        act({
                          type: "setPolicy",
                          materialId: m.id,
                          policy: e.target.value as "keep" | "export",
                        })
                      }
                    >
                      <option value="keep">Keep</option>
                      {m.exportValue > 0 && (
                        <option value="export">Auto-export</option>
                      )}
                    </select>
                  </div>
                ))}
                <button
                  className="secondary"
                  onClick={() => act({ type: "assistance" })}
                >
                  Request emergency fuel
                </button>
                <p className="hint">
                  Available when fuel is depleted. Assistance becomes an
                  obligation repaid by future exports.
                </p>
              </>
            )}
            {panel === "menu" && (
              <>
                <h2>Expedition controls</h2>
                <button className="primary" onClick={() => persist(false)}>
                  <Glyph type="save" size={17} />
                  Save world
                </button>
                <button className="secondary" onClick={() => persist(true)}>
                  Load saved world
                </button>
                <p className="hint">
                  Saved locally on this device. Worlds pause while the tab is
                  hidden. Old fixed-site saves are incompatible.
                </p>
                <h3>Controls</h3>
                <dl className="controls-list">
                  <dt>Pan</dt>
                  <dd>WASD / arrows / right-drag</dd>
                  <dt>Zoom</dt>
                  <dd>Mouse wheel</dd>
                  <dt>Rotate</dt>
                  <dd>R</dd>
                  <dt>Cancel / close</dt>
                  <dd>Esc</dd>
                  <dt>Center site</dt>
                  <dd>Home</dd>
                  <dt>Factory roof</dt>
                  <dd>Select factory + F</dd>
                  <dt>Build tools</dt>
                  <dd>1–6</dd>
                  <dt>Dismantle</dt>
                  <dd>X</dd>
                </dl>
                {confirmReset ? (
                  <div className="reset-confirm">
                    <p>
                      Start a new expedition? Unsaved progress will be lost;
                      your saved world stays available.
                    </p>
                    <button
                      className="danger"
                      onClick={() => {
                        session.reset();
                        setMode(DEFAULT_MODE);
                        setPanel(null);
                        setConfirmReset(false);
                        setGuide(true);
                        setHomeToken((n) => n + 1);
                      }}
                    >
                      Start new expedition
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setConfirmReset(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="danger"
                    onClick={() => setConfirmReset(true)}
                  >
                    New expedition
                  </button>
                )}
              </>
            )}
          </div>
        </aside>
      )}
      <div className="build-zone">
        {mode.tool !== "select" && (
          <div className="build-hint">
            <strong>{names[mode.tool]}</strong>
            <span>{descriptions[mode.tool]}</span>
            <button
              aria-label="Rotate build direction"
              onClick={() =>
                setMode((m) => ({ ...m, direction: (m.direction + 1) % 4 }))
              }
            >
              <kbd>R</kbd> {["→", "↓", "←", "↑"][mode.direction]}
            </button>
            <button
              aria-label="Cancel building"
              onClick={() => setTool("select")}
            >
              <kbd>Esc</kbd>
            </button>
          </div>
        )}
        <nav className="build-bar" aria-label="Build tools">
          {(
            [
              "select",
              "extractor",
              "factory",
              "crusher",
              "furnace",
              "belt",
              "port",
              "demolish",
            ] as Tool[]
          ).map((tool, i) => (
            <button
              key={tool}
              className={mode.tool === tool ? "active" : ""}
              aria-label={names[tool]}
              aria-pressed={mode.tool === tool}
              title={descriptions[tool]}
              onClick={() => setTool(tool)}
            >
              <small>{i === 0 ? "↖" : i === 7 ? "X" : i}</small>
              <Glyph type={tool} size={25} />
              <span>{names[tool]}</span>
              {toolCost(tool) ? (
                <em>
                  {toolCost(tool)}
                  {tool === "factory" ? "/cell" : ""}
                </em>
              ) : (
                <em>—</em>
              )}
            </button>
          ))}
        </nav>
        <div className="bottom-caption">
          <span>NO CREW. JUST MACHINES.</span>
          <span>R rotate · Esc cancel · Home center</span>
        </div>
      </div>
    </main>
  );
}

export default function GameClient() {
  return (
    <I18nextProvider i18n={i18n}>
      <GameClientInner />
    </I18nextProvider>
  );
}
