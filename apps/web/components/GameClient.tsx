"use client";
import { useEffect, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { i18n } from "../game/i18n";
import { machineStatusLabel } from "../game/machine-status";
import { factoryContractPresentation } from "../game/factory-presentation";
import { beltArms } from "@site/sim-core";
import type {
  GameCommand,
  CommandResult,
  Inventory,
  MachineStatus,
} from "@site/sim-core";
import { Session } from "../game/session";
import {
  DEFAULT_MODE,
  TOOL_HOTKEYS,
  toggleFactoryOpen,
  type WorldMode,
  type Tool,
} from "../game/interaction";
import GameHost from "./GameHost";
function Glyph({ type, size = 20 }: { type: string; size?: number }) {
  const paths: Record<string, string> = {
    select: "M5 3l14 10-7 1-3 7z",
    extractor: "M5 21V4h13 M6 7h10 M15 4v14 M12 10l6 3-6 3 6 3",
    factory: "M3 21V9l6 4V7l6 5V4h5v17z M7 17h2 M12 17h2 M17 17h1",
    crusher: "M3 4h18l-5 8v8H8v-8z M9 7l3 3 3-3",
    furnace:
      "M5 21V8h14v13z M8 4h8 M12 10c0 4-3 3-3 6a3 3 0 0 0 6 0c0-2-2-3-3-6z",
    depot: "M4 9h16v11H4z M4 13h16 M9 9v11 M15 9v11",
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
const genericNames: Record<string, string> = {
  select: "Inspect",
  factory: "Factory",
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
  furnace: "Place inside a factory.",
  "sealed-furnace": "Place inside a factory.",
  "oversealed-furnace":
    "Place inside a factory. This setup is intentionally experimental.",
  depot:
    "Place on clear ground. Belts move any material in and out until full.",
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
  const unlockFor = (tool: Tool) =>
    snapshot.definitions.find((definition) => definition.id === tool)?.unlock;
  const toolLocked = (tool: Tool) => unlockFor(tool)?.unlocked === false;
  const setTool = (tool: Tool) => {
    const unlock = unlockFor(tool);
    if (unlock && !unlock.unlocked) {
      setNotice({ ok: false, message: t(unlock.hintKey) });
      return;
    }
    setMode((m) => ({ ...m, tool, selected: null }));
    setPanel(null);
  };
  const select = (id: string | null) => {
    setMode((m) => ({ ...m, selected: id }));
    setPanel(id === "terminal" ? "terminal" : id ? "selection" : null);
  };
  const toggleFactory = (id: string) =>
    setMode((mode) => toggleFactoryOpen(mode, id));
  const act = (cmd: GameCommand) => {
    const result = session.command(cmd);
    setNotice(
      result.messageKey ? { ...result, message: t(result.messageKey) } : result,
    );
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
    storage = snapshot.storages.find((t) => t.id === mode.selected),
    portFactory = snapshot.factories.find((f) =>
      f.ports.some((p) => p.id === mode.selected),
    ),
    deposit = snapshot.deposits.find((d) => d.id === mode.selected);
  const materialName = (id: string) => {
    const key = snapshot.materials.find((m) => m.id === id)?.nameKey;
    return key ? t(key) : "Unidentified material";
  };
  const exchangeFor = (id: string) =>
    snapshot.exchange.find((listing) => listing.materialId === id);
  const factoryPresentation = factory
      ? factoryContractPresentation(factory, materialName)
      : null,
    factoryOpen = factory ? mode.openFactories.includes(factory.id) : false;
  // Machine-tool labels resolve from content definitions so a catalog rename
  // updates the toolbar and inspector together. Generic tools stay English.
  const toolName = (tool: Tool) => {
    const key =
      snapshot.definitions.find((d) => d.id === tool)?.nameKey ??
      snapshot.storageDefinitions.find((d) => d.id === tool)?.nameKey;
    return key ? t(key) : (genericNames[tool] ?? tool);
  };
  // Furnace descriptions name their operation, which is content data.
  const toolDescription = (tool: Tool) => {
    const unlock = unlockFor(tool);
    if (unlock && !unlock.unlocked)
      return "Locked · Requires " + t(unlock.hintKey) + ".";
    if (
      tool !== "furnace" &&
      tool !== "sealed-furnace" &&
      tool !== "oversealed-furnace"
    )
      return descriptions[tool];
    const key = snapshot.operations.find((o) => o.id === "heat")?.nameKey;
    const base =
      descriptions[tool] +
      " Operation: " +
      (key ? t(key) : "heat") +
      ". Outcomes require observation.";
    return unlock ? "Unlocked by " + t(unlock.hintKey) + ". " + base : base;
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
  const fresh = snapshot.knowledgeEntries.filter(
    (entry) => !entry.initial,
  ).length;
  const toolCost = (tool: Tool) =>
    tool === "factory"
      ? snapshot.map.factoryCellCost
      : tool === "belt"
        ? snapshot.map.beltCost
        : tool === "port"
          ? snapshot.map.portCost
          : (snapshot.definitions.find((d) => d.id === tool)?.cost ??
            snapshot.storageDefinitions.find((d) => d.id === tool)?.cost);
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
              Place an extractor over {materialName("ferrite").toLowerCase()}.
            </li>
            <li className={snapshot.factories.length ? "done" : ""}>
              Draw a factory. Put a {toolName("crusher").toLowerCase()} inside.
            </li>
            <li className={snapshot.belts.length ? "done" : ""}>
              Route belts through wall ports to the{" "}
              {toolName("crusher").toLowerCase()}, then the terminal.
            </li>
            <li className={snapshot.milestone ? "done" : ""}>
              Expand with local {materialName("plates").toLowerCase()}.
              Experiment with {materialName("raw").toLowerCase()}.
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
                        (machine.status === "processing" ? "running" : "")
                      }
                    >
                      {machineStatusLabel(machine.status)}
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
                    {machine.incident && (
                      <div className="milestone">
                        <small>INCIDENT LOCKOUT</small>
                        <h3>{t(machine.incident.nameKey)}</h3>
                        <p>{t(machine.incident.textKey)}</p>
                      </div>
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
                      {machine.incident
                        ? "Acknowledge incident & re-enable"
                        : machine.enabled
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
                    <p className="hint">
                      Cyan arrow: incoming belt. Gold arrow: outgoing belt.
                      Unfamiliar outcomes are recorded after processing. Buffers
                      survive disable and save/load. Dismantling needs empty
                      buffers: drain output through belts first.
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
                      {factoryOpen
                        ? "Close roof"
                        : factoryPresentation?.certified
                          ? "Open interior"
                          : "Open interior for diagnosis"}{" "}
                      <kbd>F</kbd>
                    </button>
                    <p className="hint">
                      Roof state is presentation-only. Every machine, belt,
                      buffer and cargo slot continues in the detailed
                      simulation.
                    </p>
                    <h3>External contract</h3>
                    {factoryPresentation && (
                      <div
                        className={
                          "status-line " +
                          (factoryPresentation.certified ? "running" : "")
                        }
                      >
                        {factoryPresentation.status}
                      </div>
                    )}
                    <div className="facts">
                      <span>
                        Machines<b>{factory.contract.machineCount}</b>
                      </span>
                      <span>
                        Input ports
                        <b>
                          {
                            factory.ports.filter(
                              (port) => port.role === "input",
                            ).length
                          }
                        </b>
                      </span>
                      <span>
                        Output ports
                        <b>
                          {
                            factory.ports.filter(
                              (port) => port.role === "output",
                            ).length
                          }
                        </b>
                      </span>
                    </div>
                    <div className="inventory">
                      {(
                        Object.entries(factory.contract.statusCounts) as [
                          MachineStatus,
                          number,
                        ][]
                      )
                        .filter(([, count]) => count > 0)
                        .map(([status, count]) => (
                          <div key={status}>
                            <span>{machineStatusLabel(status)}</span>
                            <b>{count}</b>
                          </div>
                        ))}
                      {factory.contract.machineCount === 0 && (
                        <span className="muted">No internal equipment</span>
                      )}
                    </div>
                    <h3>Measured throughput</h3>
                    {factoryPresentation?.certified ? (
                      <>
                        <p className="hint">{factoryPresentation.detail}</p>
                        <h4>Inputs</h4>
                        <div className="inventory">
                          {factoryPresentation.inputs.map((rate) => (
                            <div key={"in-" + rate.materialId}>
                              <span>{rate.name}</span>
                              <b>{rate.unitsPerMinute}/min</b>
                            </div>
                          ))}
                        </div>
                        <h4>Outputs</h4>
                        <div className="inventory">
                          {factoryPresentation.outputs.map((rate) => (
                            <div key={"out-" + rate.materialId}>
                              <span>{rate.name}</span>
                              <b>{rate.unitsPerMinute}/min</b>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="hint">
                        {factoryPresentation?.detail ??
                          "Contract presentation unavailable."}
                      </p>
                    )}
                    <p className="hint">
                      This is a read-only view of detailed simulation. Closing
                      the roof never replaces it with aggregate execution.
                    </p>
                    <h3>
                      {factoryOpen ? "Diagnostic buffers" : "Observed buffers"}
                    </h3>
                    {buffer(
                      snapshot.machines
                        .filter((m) => m.factoryId === factory.id)
                        .reduce<Inventory>((sum, m) => {
                          for (const [id, n] of Object.entries(m.output))
                            sum[id] = (sum[id] ?? 0) + n;
                          return sum;
                        }, {}),
                    )}
                    <h3>
                      {factoryOpen ? "Diagnostic equipment" : "Equipment"}
                    </h3>
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
                          <small>{machineStatusLabel(m.status)}</small>
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
                    {!belt.junction && (
                      <>
                        <h3>Diverter</h3>
                        <p className="hint">
                          {belt.alternate === null
                            ? "No alternate exit."
                            : "Alternate exit: " +
                              ["east", "south", "west", "north"][
                                belt.alternate
                              ] +
                              (belt.switched ? " (active)." : " (standby).")}
                        </p>
                        <button
                          className="secondary"
                          onClick={() =>
                            act({ type: "rotateDivert", beltId: belt.id })
                          }
                        >
                          Cycle alternate exit
                        </button>
                        <button
                          className="secondary"
                          disabled={belt.alternate === null}
                          onClick={() =>
                            act({ type: "switchDivert", beltId: belt.id })
                          }
                        >
                          {belt.switched ? "Restore main exit" : "Switch exit"}
                        </button>
                      </>
                    )}
                    <h3>
                      {belt.junction
                        ? t(
                            snapshot.junctionDefinitions.find(
                              (d) => d.id === belt.junction!.definitionId,
                            )?.nameKey ?? "ui.junction.upgrade",
                          )
                        : t("ui.junction.upgrade")}
                    </h3>
                    <p className="hint">{t("ui.junction.rule")}</p>
                    {snapshot.junctionDefinitions
                      .filter((d) => d.id !== belt.junction?.definitionId)
                      .map((d) => (
                        <button
                          className="secondary"
                          key={d.id}
                          onClick={() =>
                            act({
                              type: "configureJunction",
                              beltId: belt.id,
                              definitionId: d.id,
                              direction: belt.direction,
                              branch: belt.junction?.branch ?? 1,
                            })
                          }
                        >
                          {t(d.nameKey)} ·{" "}
                          {t("ui.junction.cost-label", {
                            cost:
                              d.cost -
                              (snapshot.junctionDefinitions.find(
                                (old) => old.id === belt.junction?.definitionId,
                              )?.cost ?? 0),
                          })}
                        </button>
                      ))}
                    {belt.junction && (
                      <>
                        <p className="hint">
                          {t("ui.junction.preferred")}:{" "}
                          {t(
                            "ui.direction." +
                              ["east", "south", "west", "north"][
                                (snapshot.junctionDefinitions.find(
                                  (d) => d.id === belt.junction!.definitionId,
                                )?.kind === "merger"
                                  ? beltArms(
                                      {
                                        junctions: snapshot.junctionDefinitions,
                                      },
                                      belt,
                                    ).inlets
                                  : beltArms(
                                      {
                                        junctions: snapshot.junctionDefinitions,
                                      },
                                      belt,
                                    ).outlets)[belt.junction.cursor]
                              ],
                          )}
                        </p>
                        <button
                          className="secondary"
                          onClick={() =>
                            act({
                              type: "configureJunction",
                              beltId: belt.id,
                              definitionId: belt.junction!.definitionId,
                              direction: (belt.direction + 1) % 4,
                              branch: belt.junction!.branch,
                            })
                          }
                        >
                          {t("ui.junction.rotate")}
                        </button>
                        <button
                          className="secondary"
                          onClick={() =>
                            act({
                              type: "configureJunction",
                              beltId: belt.id,
                              definitionId: belt.junction!.definitionId,
                              direction: belt.direction,
                              branch: belt.junction!.branch === 1 ? -1 : 1,
                            })
                          }
                        >
                          {t("ui.junction.mirror")}
                        </button>
                        <button
                          className="secondary"
                          onClick={() =>
                            act({
                              type: "configureJunction",
                              beltId: belt.id,
                              definitionId: null,
                              direction: belt.direction,
                              branch: 1,
                            })
                          }
                        >
                          {t("ui.junction.remove")}
                        </button>
                      </>
                    )}
                    <button
                      className="danger"
                      onClick={() => act({ type: "dismantle", id: belt.id })}
                    >
                      {belt.junction
                        ? t("ui.junction.reclaim")
                        : "Reclaim belt & cargo"}
                    </button>
                  </>
                )}
                {storage && (
                  <>
                    <small className="eyebrow">
                      {storage.id.toUpperCase()} · BULK STORAGE
                    </small>
                    <h2>
                      {t(
                        snapshot.storageDefinitions.find(
                          (d) => d.id === storage.definitionId,
                        )?.nameKey ?? storage.definitionId,
                      )}
                    </h2>
                    <div className="facts">
                      <span>
                        Stored
                        <b>
                          {Object.values(storage.inventory).reduce(
                            (a, b) => a + b,
                            0,
                          )}{" "}
                          / {storage.capacity}
                        </b>
                      </span>
                    </div>
                    {buffer(storage.inventory)}
                    <p className="hint">
                      Belts move any material in and out. Empty storage before
                      dismantling.
                    </p>
                    <button
                      className="danger"
                      onClick={() => act({ type: "dismantle", id: storage.id })}
                    >
                      Dismantle empty storage
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
                      Place {toolName("extractor").toLowerCase()}
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
                {snapshot.knowledgeEntries.map((entry) => {
                  const operationKey = snapshot.operations.find(
                    (op) => op.id === entry.operationId,
                  )?.nameKey;
                  const operationName = operationKey
                    ? t(operationKey)
                    : "Unknown operation";
                  const setupName = entry.setupNameKey
                    ? t(entry.setupNameKey)
                    : null;
                  return (
                    <article className="observation" key={entry.id}>
                      <small>
                        {entry.state === "hinted"
                          ? "UNCONFIRMED"
                          : entry.initial
                            ? "KNOWN METHOD"
                            : "OBSERVED"}{" "}
                        · {operationName.toUpperCase()}
                      </small>
                      <h3>
                        {entry.state === "hinted"
                          ? "Outcome unconfirmed"
                          : materialName(entry.outputId!)}
                      </h3>
                      <p>
                        {entry.state === "hinted"
                          ? "This setup has been tried. Its result is not confirmed yet."
                          : t(entry.textKey!)}
                      </p>
                      <span>
                        {materialName(entry.inputId)} → {operationName}
                        {setupName ? " · " + setupName : ""}
                      </span>
                    </article>
                  );
                })}
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
                <h3>{t("ui.terminal.milestones.heading")}</h3>
                {snapshot.milestones.map((milestone) => (
                  <article className="observation" key={milestone.id}>
                    <small>
                      {t(
                        milestone.completed
                          ? "ui.terminal.milestone.completed"
                          : "ui.terminal.milestone.pending",
                      )}
                    </small>
                    <h3>{t(milestone.nameKey)}</h3>
                    <p>{t(milestone.hintKey)}</p>
                  </article>
                ))}
                <h3>{t("ui.terminal.opportunities.heading")}</h3>
                <p className="hint">{t("ui.terminal.opportunities.hint")}</p>
                {snapshot.opportunities.length ? (
                  snapshot.opportunities.map((opportunity) => {
                    const operation =
                        opportunity.kind === "directive"
                          ? snapshot.operations.find(
                              (entry) => entry.id === opportunity.operationId,
                            )
                          : null,
                      operationName = operation
                        ? t(operation.nameKey)
                        : t("ui.terminal.opportunity.experiment-fallback");
                    return (
                      <article className="observation" key={opportunity.id}>
                        <small>
                          {t(
                            opportunity.kind === "order"
                              ? "ui.terminal.opportunity.order-meta"
                              : "ui.terminal.opportunity.directive-meta",
                            { reward: opportunity.rewardFuel },
                          )}
                        </small>
                        <h3>{t(opportunity.nameKey)}</h3>
                        <p>{t(opportunity.briefKey)}</p>
                        <span>
                          {opportunity.kind === "order"
                            ? t("ui.terminal.opportunity.order-progress", {
                                material: materialName(opportunity.materialId),
                                progress: opportunity.progress,
                                quantity: opportunity.quantity,
                              })
                            : opportunity.setupNameKey
                              ? t(
                                  "ui.terminal.opportunity.directive-progress-setup",
                                  {
                                    material: materialName(
                                      opportunity.inputMaterialId,
                                    ),
                                    operation: operationName,
                                    setup: t(opportunity.setupNameKey),
                                  },
                                )
                              : t(
                                  "ui.terminal.opportunity.directive-progress",
                                  {
                                    material: materialName(
                                      opportunity.inputMaterialId,
                                    ),
                                    operation: operationName,
                                  },
                                )}
                        </span>
                      </article>
                    );
                  })
                ) : (
                  <p className="hint">{t("ui.terminal.opportunities.empty")}</p>
                )}
                <h3>Terminal staging & policies</h3>
                <p className="hint">
                  Exportable cargo stages at the terminal and ships per policy.
                  Reserved{" "}
                  {materialName(snapshot.map.buildMaterial).toLowerCase()} fund
                  construction. Staged exports repay obligations before
                  allocating fuel.
                </p>
                {snapshot.materials.map((m) => (
                  <div className="policy" key={m.id}>
                    <div>
                      <i style={{ background: m.color }} />
                      <span>
                        {t(m.nameKey)}
                        <small>
                          {(m.id === snapshot.map.buildMaterial
                            ? snapshot.stock[m.id]
                            : snapshot.staging[m.id]) ?? 0}{" "}
                          {m.id === snapshot.map.buildMaterial
                            ? "reserved"
                            : "staged"}{" "}
                          {exchangeFor(m.id)
                            ? "· " +
                              exchangeFor(m.id)!.compensationPerUnit +
                              " fuel/unit · " +
                              Math.round(
                                exchangeFor(m.id)!.saturationBps / 100,
                              ) +
                              "% saturated"
                            : ""}
                          {exchangeFor(m.id)?.handling
                            ? " · " +
                              t(
                                exchangeFor(m.id)!.handling!.unlocked
                                  ? "ui.terminal.handling.ready"
                                  : "ui.terminal.handling.locked",
                                {
                                  capability: t(
                                    exchangeFor(m.id)!.handling!.nameKey,
                                  ),
                                },
                              )
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
                      {exchangeFor(m.id) && (
                        <option value="export">Auto-export</option>
                      )}
                    </select>
                  </div>
                ))}
                <h3>{t("ui.terminal.assistance.heading")}</h3>
                <p className="hint">
                  {t(
                    snapshot.company.standing === "clear"
                      ? "ui.terminal.assistance.clear"
                      : "ui.terminal.assistance.recovery",
                  )}
                  {snapshot.company.standing === "recovery"
                    ? " · " +
                      t("ui.terminal.assistance.progress", {
                        progress: snapshot.company.recoveryNetFuel,
                        target: snapshot.company.recoveryTargetNetFuel,
                      })
                    : ""}
                </p>
                {snapshot.assistance.map((assistance) => (
                  <article className="observation" key={assistance.id}>
                    <small>
                      {t("ui.terminal.assistance.package-meta", {
                        grant: assistance.grantFuel,
                        obligation: assistance.nextObligationFuel,
                      })}
                    </small>
                    <h3>{t(assistance.nameKey)}</h3>
                    <p>{t(assistance.briefKey)}</p>
                    <button
                      className="secondary"
                      disabled={!assistance.eligible}
                      onClick={() =>
                        act({
                          type: "assistance",
                          packageId: assistance.id,
                        })
                      }
                    >
                      {t("ui.terminal.assistance.request")}
                    </button>
                    {!assistance.eligible && assistance.reason && (
                      <span>
                        {t(
                          assistance.reason === "obligation-open"
                            ? "ui.terminal.assistance.unavailable-obligation"
                            : "ui.terminal.assistance.unavailable-fuel",
                        )}
                      </span>
                    )}
                  </article>
                ))}
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
                  <dd>1–9</dd>
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
            <strong>{toolName(mode.tool)}</strong>
            <span>{toolDescription(mode.tool)}</span>
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
              "sealed-furnace",
              "oversealed-furnace",
              "belt",
              "port",
              "depot",
              "demolish",
            ] as Tool[]
          ).map((tool) => (
            <button
              key={tool}
              className={
                (mode.tool === tool ? "active " : "") +
                (toolLocked(tool) ? "locked" : "")
              }
              aria-label={toolName(tool)}
              aria-pressed={mode.tool === tool}
              aria-disabled={toolLocked(tool)}
              title={toolDescription(tool)}
              onClick={() => setTool(tool)}
            >
              <small>{TOOL_HOTKEYS[tool]}</small>
              <Glyph
                type={
                  tool === "sealed-furnace" || tool === "oversealed-furnace"
                    ? "furnace"
                    : tool
                }
                size={25}
              />
              <span>{toolName(tool)}</span>
              {toolLocked(tool) ? (
                <em>LOCKED</em>
              ) : toolCost(tool) ? (
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
