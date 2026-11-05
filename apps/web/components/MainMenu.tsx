"use client";

import { useState, type ReactNode } from "react";
import type { CommandResult } from "@site/sim-core";
import type { ArchiveListing } from "../game/save-archive";
import {
  CAMERA_TUNING_BOUNDS,
  type GamePreferences,
} from "../game/preferences";
import type { RuntimePack } from "../game/runtime-content";
import MainMenuBackdrop from "./MainMenuBackdrop";

type MenuView = "home" | "new" | "archives" | "content" | "settings" | "credits";

type Props = {
  ready: boolean;
  listing: ArchiveListing | null;
  archiveError: string | null;
  loadableSlotIds: readonly string[];
  resumeSlotId: string | null;
  activeSlotId: string | null;
  activeFingerprint: string | null;
  activePack: RuntimePack | null;
  pendingPack: RuntimePack | null;
  preferences: GamePreferences;
  onResume: () => CommandResult;
  onStartNew: (name: string) => CommandResult;
  onLoad: (id: string) => CommandResult;
  onRename: (id: string, name: string) => CommandResult;
  onDelete: (id: string) => CommandResult;
  onImportLegacy: (key: string, name: string) => CommandResult;
  onRecover: () => CommandResult;
  onImportPack: (file: File | undefined) => void;
  onUsePack: (pack: RuntimePack | null) => void;
  onPreferencesChange: (next: GamePreferences) => void;
};

function ActionButton({
  children,
  detail,
  disabled = false,
  onClick,
  primary = false,
}: {
  children: ReactNode;
  detail?: string;
  disabled?: boolean;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={primary ? "menu-action menu-action-primary" : "menu-action"}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="menu-action-mark" aria-hidden="true">{primary ? "▶" : "◇"}</span>
      <span className="menu-action-copy">
        <strong>{children}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <span className="menu-action-arrow" aria-hidden="true">›</span>
    </button>
  );
}

export default function MainMenu(props: Props) {
  const [view, setView] = useState<MenuView>("home");
  const [newName, setNewName] = useState("");
  const [legacyName, setLegacyName] = useState("Recovered expedition");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmRecovery, setConfirmRecovery] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const resumeSlot = props.listing?.slots.find((slot) => slot.id === props.resumeSlotId);
  const activePackLabel = props.activeFingerprint
    ? "IMPORTED CONTENT · " + props.activeFingerprint.slice(0, 12).toUpperCase()
    : "BUILT-IN DIRECTORATE CONTENT";

  const report = (result: CommandResult) => {
    setFeedback(result.message);
    if (result.ok) {
      setRenameId(null);
      setDeleteId(null);
    }
    return result;
  };
  const updateInterface = (change: Partial<GamePreferences["interface"]>) =>
    props.onPreferencesChange({
      ...props.preferences,
      interface: { ...props.preferences.interface, ...change },
    });
  const updateCamera = (change: Partial<GamePreferences["camera"]>) =>
    props.onPreferencesChange({
      ...props.preferences,
      camera: { ...props.preferences.camera, ...change },
    });
  const updateControls = (change: Partial<GamePreferences["controls"]>) =>
    props.onPreferencesChange({
      ...props.preferences,
      controls: { ...props.preferences.controls, ...change },
    });
  const updateAccessibility = (
    change: Partial<GamePreferences["accessibility"]>,
  ) =>
    props.onPreferencesChange({
      ...props.preferences,
      accessibility: { ...props.preferences.accessibility, ...change },
    });

  return (
    <main className="main-menu" data-motion-mode={props.preferences.accessibility.reducedMotion}>
      <div className="main-menu-art" aria-hidden="true">
        <MainMenuBackdrop />
      </div>
      <div className="main-menu-atmosphere" aria-hidden="true" />
      <div className="main-menu-layout">
        <section className="main-menu-plaque" aria-label="Unknown Yield main menu">
          <header className="main-menu-brand">
            <div className="directorate-seal" aria-hidden="true">
              <svg viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="19" />
                <circle cx="24" cy="24" r="12" />
                <path d="M24 7v34M7 24h34M14 14l20 20M34 14 14 34" />
                <path d="m24 12 4 8-4 16-4-16z" />
              </svg>
            </div>
            <div className="main-menu-brand-copy">
              <small>EXTRAPLANETARY INDUSTRIAL DIRECTORATE</small>
              <h1>UNKNOWN <span>YIELD</span></h1>
              <p>DISCOVERY IS A DUTY. PRODUCTION IS A VICTORY.</p>
            </div>
          </header>

          <div className="main-menu-rule"><span>OFFICIAL SITE OPERATIONS</span><i /></div>

          {!props.ready ? (
            <section className="menu-loading" role="status">
              <span className="menu-status-light" />
              <strong>Validating site records</strong>
              <p>The Directorate is checking the selected content and local archive.</p>
            </section>
          ) : (
            <>
              {view === "home" && (
                <div className="menu-view menu-home" id="main-menu-actions">
                  <div className="menu-appointment">
                    <small>APPOINTMENT NOTICE · PALE REACH</small>
                    <h2>Your assignment is a historic honor.</h2>
                    <p>
                      The Directorate has entrusted you with an industrial site.
                      Its official promises are ceremonial; its machines, materials
                      and measured results are not.
                    </p>
                  </div>
                  <div className="menu-home-actions">
                    <ActionButton
                      primary
                      disabled={!props.resumeSlotId || !!props.archiveError}
                      detail={resumeSlot
                        ? resumeSlot.name + " · saved " + new Date(resumeSlot.savedAt).toLocaleString()
                        : "No compatible saved assignment on this device"}
                      onClick={() => report(props.onResume())}
                    >
                      Resume Duty
                    </ActionButton>
                    <ActionButton
                      disabled={!props.ready || !!props.archiveError}
                      detail={props.archiveError ? "Repair Personnel Archives before creating a new record" : "Create a separate, named industrial expedition"}
                      onClick={() => { setFeedback(null); setView("new"); }}
                    >
                      Begin Assignment
                    </ActionButton>
                    <ActionButton
                      detail="Load, rename, import or remove local expeditions"
                      onClick={() => { setFeedback(null); setView("archives"); }}
                    >
                      Personnel Archives
                    </ActionButton>
                    <ActionButton
                      detail="Select or import an offline content pack"
                      onClick={() => { setFeedback(null); setView("content"); }}
                    >
                      Content Packs
                    </ActionButton>
                    <ActionButton
                      detail="Display, camera, input and accessibility"
                      onClick={() => { setFeedback(null); setView("settings"); }}
                    >
                      Operational Regulations
                    </ActionButton>
                    <ActionButton
                      detail="Project and technology acknowledgements"
                      onClick={() => { setFeedback(null); setView("credits"); }}
                    >
                      Credits
                    </ActionButton>
                  </div>
                  {props.archiveError && (
                    <p className="menu-warning" role="alert">
                      Personnel Archives need attention before a saved assignment can be resumed.
                    </p>
                  )}
                  {resumeSlot && (
                    <div className="menu-current-record">
                      <span>LAST VALID ASSIGNMENT</span>
                      <strong>{resumeSlot.name}</strong>
                      <small>{resumeSlot.fingerprint ? "IMPORTED CONTENT" : "STANDARD CONTENT"} · {resumeSlot.exported} exports recorded</small>
                    </div>
                  )}
                </div>
              )}

              {view === "new" && (
                <div className="menu-view">
                  <button className="menu-back" onClick={() => setView("home")}>← Main menu</button>
                  <div className="menu-section-heading">
                    <small>PERSONNEL ORDER · 001</small>
                    <h2>Begin Assignment</h2>
                    <p>Register a new expedition before entering the site. Existing assignments remain untouched.</p>
                  </div>
                  <blockquote className="menu-official-dispatch">
                    “You have been granted the honor of making our industrial destiny inevitable.”
                    <small>— Directorate appointment notice</small>
                  </blockquote>
                  <label className="menu-field">
                    <span>Expedition designation</span>
                    <input
                      autoFocus
                      type="text"
                      maxLength={80}
                      value={newName}
                      placeholder="Name this expedition"
                      onChange={(event) => setNewName(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && newName.trim())
                          report(props.onStartNew(newName));
                      }}
                    />
                    <small>1–80 characters. This name can be changed later in Personnel Archives.</small>
                  </label>
                  <div className="menu-pack-summary">
                    <span>ACTIVE CONTENT</span>
                    <strong>{activePackLabel}</strong>
                    <button type="button" onClick={() => setView("content")}>Change content pack</button>
                  </div>
                  <div className="menu-inline-actions">
                    <button className="menu-secondary" onClick={() => setView("home")}>Cancel</button>
                    <button className="menu-primary" disabled={!newName.trim() || !!props.archiveError} onClick={() => report(props.onStartNew(newName))}>
                      Create Expedition <span>→</span>
                    </button>
                  </div>
                </div>
              )}

              {view === "archives" && (
                <div className="menu-view menu-archives">
                  <button className="menu-back" onClick={() => setView("home")}>← Main menu</button>
                  <div className="menu-section-heading">
                    <small>LOCAL RECORDS · THIS DEVICE</small>
                    <h2>Personnel Archives</h2>
                    <p>Every expedition is an independent world. Only compatible, validated records can be loaded.</p>
                  </div>
                  {props.archiveError && (
                    <div className="menu-warning" role="alert">
                      <p>{props.archiveError}</p>
                      {confirmRecovery ? (
                        <>
                          <p>Restore the previous index? The most recent save or rename may not appear. A copy of the damaged index will be preserved.</p>
                          <div className="menu-inline-actions">
                            <button className="menu-secondary" onClick={() => setConfirmRecovery(false)}>Cancel</button>
                            <button className="menu-primary" onClick={() => {
                              const result = report(props.onRecover());
                              if (result.ok) setConfirmRecovery(false);
                            }}>Restore backup index</button>
                          </div>
                        </>
                      ) : (
                        <button className="menu-secondary" onClick={() => setConfirmRecovery(true)}>Recover archive index</button>
                      )}
                    </div>
                  )}
                  <div className="menu-archive-list">
                    {(props.listing?.slots ?? []).map((slot) => {
                      const compatible = slot.fingerprint === props.activeFingerprint;
                      const loadable = compatible && props.loadableSlotIds.includes(slot.id);
                      return (
                        <article className="menu-archive-card" key={slot.id}>
                          <div className="menu-archive-card-main">
                            <span className="menu-record-icon" aria-hidden="true">▤</span>
                            <div>
                              <strong>{slot.name}{slot.id === props.activeSlotId ? " · LAST OPENED" : ""}</strong>
                              <small>{new Date(slot.savedAt).toLocaleString()} · {slot.exported} exports · schema {slot.schemaVersion}</small>
                              <small>{slot.fingerprint ? "Pack " + slot.fingerprint.slice(0, 12) : "Built-in content"}</small>
                            </div>
                            <span className={loadable ? "menu-record-status ready" : "menu-record-status"}>
                              {loadable ? "VALID" : compatible ? "UNREADABLE" : "OTHER PACK"}
                            </span>
                          </div>
                          <div className="menu-archive-actions">
                            <button className="menu-primary" disabled={!loadable || !!props.archiveError}
                              onClick={() => report(props.onLoad(slot.id))}>Load expedition</button>
                            {renameId === slot.id ? (
                              <div className="menu-edit-row">
                                <input aria-label="New expedition name" maxLength={80} value={renameName}
                                  onChange={(event) => setRenameName(event.currentTarget.value)} />
                                <button className="menu-secondary" disabled={!renameName.trim()} onClick={() => {
                                  const result = report(props.onRename(slot.id, renameName));
                                  if (result.ok) setRenameId(null);
                                }}>Save name</button>
                                <button className="menu-secondary" onClick={() => setRenameId(null)}>Cancel</button>
                              </div>
                            ) : (
                              <button className="menu-secondary" onClick={() => {
                                setRenameId(slot.id);
                                setRenameName(slot.name);
                              }}>Rename</button>
                            )}
                            {deleteId === slot.id ? (
                              <div className="menu-delete-confirm" role="group" aria-label={"Confirm deletion of " + slot.name}>
                                <span>Delete this saved world permanently?</span>
                                <button className="menu-danger" onClick={() => report(props.onDelete(slot.id))}>Delete expedition</button>
                                <button className="menu-secondary" onClick={() => setDeleteId(null)}>Keep</button>
                              </div>
                            ) : (
                              <button className="menu-secondary" disabled={!!props.archiveError} onClick={() => setDeleteId(slot.id)}>Delete</button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                    {props.ready && props.listing && props.listing.slots.length === 0 && (
                      <p className="menu-empty">No archived expeditions have been recorded on this device.</p>
                    )}
                  </div>
                  {!!props.listing?.legacy.length && (
                    <section className="menu-legacy">
                      <small>HISTORICAL FIELD RECORDS</small>
                      <p>Import a validated copy. Original records are never overwritten or removed.</p>
                      <label className="menu-field">
                        <span>Name for imported expedition</span>
                        <input value={legacyName} maxLength={80} onChange={(event) => setLegacyName(event.currentTarget.value)} />
                      </label>
                      {props.listing.legacy.map((legacy) => (
                        <div className="menu-legacy-row" key={legacy.key}>
                          <span>{legacy.label}</span>
                          <button className="menu-secondary" disabled={!legacy.supported || !legacyName.trim() || !!props.archiveError}
                            onClick={() => report(props.onImportLegacy(legacy.key, legacyName))}>
                            {legacy.supported ? "Import & resume" : "Incompatible record"}
                          </button>
                        </div>
                      ))}
                    </section>
                  )}
                  <div className="menu-inline-actions">
                    <button className="menu-secondary" onClick={() => setView("new")}>+ New assignment</button>
                    <button className="menu-secondary" onClick={() => setView("home")}>Back</button>
                  </div>
                </div>
              )}

              {view === "content" && (
                <div className="menu-view">
                  <button className="menu-back" onClick={() => setView("home")}>← Main menu</button>
                  <div className="menu-section-heading">
                    <small>OFFLINE EXPEDITION CONTENT</small>
                    <h2>Content Packs</h2>
                    <p>Content identity is fixed when an expedition is created. A different pack cannot be loaded into an existing world.</p>
                  </div>
                  <div className="menu-pack-summary">
                    <span>CURRENT SELECTION</span>
                    <strong>{activePackLabel}</strong>
                    {props.activeFingerprint && <small>SHA-256 · {props.activeFingerprint}</small>}
                    {!props.activeFingerprint && <small>Standard built-in world definitions</small>}
                  </div>
                  <label className="menu-file-field">
                    <span>Import a validated Studio JSON bundle</span>
                    <input type="file" accept=".json,application/json" aria-label="Choose Studio JSON content pack"
                      onChange={(event) => {
                        props.onImportPack(event.currentTarget.files?.[0]);
                        event.currentTarget.value = "";
                      }} />
                    <small>Maximum 2 MiB. Import validates the bundle before it can be selected.</small>
                  </label>
                  {props.pendingPack && (
                    <div className="menu-pack-pending">
                      <small>VALIDATED · READY FOR A NEW EXPEDITION</small>
                      <strong>{props.pendingPack.fingerprint}</strong>
                      <button className="menu-primary" onClick={() => {
                        props.onUsePack(props.pendingPack);
                        setFeedback("Content pack selected for the next expedition.");
                        setView("new");
                      }}>Use this pack</button>
                    </div>
                  )}
                  {props.activePack && (
                    <button className="menu-secondary menu-full" onClick={() => {
                      props.onUsePack(null);
                      setFeedback("Built-in content selected for the next expedition.");
                    }}>Switch to built-in content</button>
                  )}
                  <div className="menu-inline-actions">
                    <button className="menu-secondary" onClick={() => setView("home")}>Back</button>
                    <button className="menu-primary" onClick={() => setView("new")}>Continue to new assignment</button>
                  </div>
                </div>
              )}

              {view === "settings" && (
                <div className="menu-view menu-settings">
                  <button className="menu-back" onClick={() => setView("home")}>← Main menu</button>
                  <div className="menu-section-heading">
                    <small>OPERATIONAL REGULATIONS</small>
                    <h2>Settings &amp; Help</h2>
                    <p>These preferences are stored separately from expedition records.</p>
                  </div>
                  <section className="menu-settings-group">
                    <h3>Display &amp; sound</h3>
                    <label className="menu-toggle">
                      <span>Show performance counter<small>Display live browser frame rate in the field.</small></span>
                      <input type="checkbox" checked={props.preferences.interface.showFps}
                        onChange={(event) => updateInterface({ showFps: event.currentTarget.checked })} />
                    </label>
                    <label className="menu-toggle">
                      <span>Sound effects<small>Allow industrial machine and interface sounds.</small></span>
                      <input type="checkbox" checked={props.preferences.interface.soundEffects}
                        onChange={(event) => updateInterface({ soundEffects: event.currentTarget.checked })} />
                    </label>
                  </section>
                  <section className="menu-settings-group">
                    <h3>Camera &amp; input</h3>
                    <label className="menu-toggle">
                      <span>Smooth camera movement<small>Use eased panning and camera transitions.</small></span>
                      <input type="checkbox" checked={props.preferences.camera.smooth}
                        onChange={(event) => updateCamera({ smooth: event.currentTarget.checked })} />
                    </label>
                    <label className="menu-toggle">
                      <span>Invert mouse-wheel zoom</span>
                      <input type="checkbox" checked={props.preferences.controls.invertWheelZoom}
                        onChange={(event) => updateControls({ invertWheelZoom: event.currentTarget.checked })} />
                    </label>
                    <label className="menu-range">
                      <span>Pan speed</span>
                      <input type="range" min={CAMERA_TUNING_BOUNDS.panSpeed.min}
                        max={CAMERA_TUNING_BOUNDS.panSpeed.max} step={CAMERA_TUNING_BOUNDS.panSpeed.step}
                        value={props.preferences.camera.panSpeed}
                        onChange={(event) => updateCamera({ panSpeed: Number(event.currentTarget.value) })} />
                      <output>{props.preferences.camera.panSpeed.toFixed(1)}×</output>
                    </label>
                    <label className="menu-range">
                      <span>Zoom sensitivity</span>
                      <input type="range" min={CAMERA_TUNING_BOUNDS.zoomSensitivity.min}
                        max={CAMERA_TUNING_BOUNDS.zoomSensitivity.max} step={CAMERA_TUNING_BOUNDS.zoomSensitivity.step}
                        value={props.preferences.camera.zoomSensitivity}
                        onChange={(event) => updateCamera({ zoomSensitivity: Number(event.currentTarget.value) })} />
                      <output>{props.preferences.camera.zoomSensitivity.toFixed(1)}×</output>
                    </label>
                  </section>
                  <section className="menu-settings-group">
                    <h3>Accessibility</h3>
                    <label className="menu-select">
                      <span>Reduced motion</span>
                      <select value={props.preferences.accessibility.reducedMotion}
                        onChange={(event) => updateAccessibility({ reducedMotion: event.currentTarget.value as GamePreferences["accessibility"]["reducedMotion"] })}>
                        <option value="system">Follow system</option>
                        <option value="on">Reduce motion</option>
                        <option value="off">Allow motion</option>
                      </select>
                    </label>
                  </section>
                  <section className="menu-settings-group">
                    <h3>Field controls</h3>
                    <dl className="menu-controls-list">
                      <dt>Pan</dt><dd>WASD · Arrow keys · Right-drag</dd>
                      <dt>Zoom</dt><dd>Mouse wheel · Pinch</dd>
                      <dt>Rotate</dt><dd>R</dd>
                      <dt>Cancel / close</dt><dd>Esc</dd>
                      <dt>Center site</dt><dd>Home</dd>
                      <dt>Factory roof</dt><dd>Select factory · F</dd>
                      <dt>Touch</dt><dd>Drag to pan · Pinch to zoom</dd>
                    </dl>
                  </section>
                  <button className="menu-secondary menu-full" onClick={() => props.onPreferencesChange({
                    version: 2,
                    buildPalette: { promoteLastUsed: true, lastUsedByGroup: {} },
                    camera: { smooth: true, panSpeed: 1, zoomSensitivity: 1, inertia: 0.4 },
                    controls: { invertWheelZoom: false },
                    interface: { showFps: false, soundEffects: true },
                    accessibility: { reducedMotion: "system" },
                  })}>Restore default settings</button>
                </div>
              )}

              {view === "credits" && (
                <div className="menu-view menu-credits">
                  <button className="menu-back" onClick={() => setView("home")}>← Main menu</button>
                  <div className="menu-section-heading">
                    <small>DIRECTORATE PUBLICATIONS OFFICE</small>
                    <h2>Credits</h2>
                  </div>
                  <div className="menu-credit-mark" aria-hidden="true">✦</div>
                  <p><strong>UNKNOWN YIELD</strong></p>
                  <p>An independent industrial discovery game in active development.</p>
                  <p>Built with a 2D world-first experience. The simulation remains the authority; every machine, material and shipment must account for its physical state.</p>
                  <small className="menu-credit-note">Full production credits will accompany the public release.</small>
                </div>
              )}
            </>
          )}

          {feedback && <p className="menu-feedback" role="status">{feedback}</p>}
          <footer className="main-menu-footer">
            <span>LOCAL ARCHIVE · THIS DEVICE</span>
            <span>{activePackLabel}</span>
          </footer>
        </section>
        <aside className="main-menu-scene-caption" aria-label="Site identity">
          <span className="scene-caption-rule" />
          <small>THE PALE REACH · SITE 01</small>
          <strong>THE FUTURE IS FORGED BY LABOR.</strong>
          <span className="scene-caption-sub">A STATE-OPERATED INDUSTRIAL EXPEDITION</span>
        </aside>
      </div>
    </main>
  );
}
