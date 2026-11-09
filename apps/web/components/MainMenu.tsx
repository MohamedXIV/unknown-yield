"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { CommandResult } from "@site/sim-core";
import type { ArchiveListing } from "../game/save-archive";
import {
  CAMERA_TUNING_BOUNDS,
  type GamePreferences,
} from "../game/preferences";
import type { RuntimePack } from "../game/runtime-content";
import MainMenuBackdrop from "./MainMenuBackdrop";
import IndustrialPanelFrame from "./IndustrialPanelFrame";

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
  notice: CommandResult | null;
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
  const { t } = useTranslation();
  // React already escapes text nodes, so i18next must not HTML-escape values
  // (player-chosen expedition names would otherwise show entities).
  const tx = (key: string, vars?: Record<string, string | number>) =>
    t(key, { ...vars, interpolation: { escapeValue: false } });
  const [view, setView] = useState<MenuView>("home");
  const plaqueRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const designationLabel = t("ui.menu.new.designation");
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const target = plaqueRef.current?.querySelector<HTMLElement>(
      'input[aria-label="' + designationLabel + '"], .menu-back, .menu-action:not(:disabled), input:not(:disabled), button:not(:disabled)',
    );
    target?.focus({ preventScroll: true });
  }, [view, designationLabel]);
  const [newName, setNewName] = useState("");
  const [legacyName, setLegacyName] = useState(() => t("ui.menu.archives.legacy-default"));
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmRecovery, setConfirmRecovery] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const resumeSlot = props.listing?.slots.find((slot) => slot.id === props.resumeSlotId);
  const activePackLabel = props.activeFingerprint
    ? tx("ui.menu.pack.imported", { fingerprint: props.activeFingerprint.slice(0, 12).toUpperCase() })
    : t("ui.menu.pack.builtin");

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
      <div className="main-menu-layout" ref={plaqueRef}>
        <IndustrialPanelFrame
          kind="menu"
          className="main-menu-plaque"
          ariaLabel={t("ui.menu.aria-main")}
          bodyClassName="menu-board-body"
          header={<header className="main-menu-brand">
            <div className="directorate-seal" aria-hidden="true">
              <svg viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="19" />
                <circle cx="24" cy="24" r="12" />
                <path d="M24 7v34M7 24h34M14 14l20 20M34 14 14 34" />
                <path d="m24 12 4 8-4 16-4-16z" />
              </svg>
            </div>
            <div className="main-menu-brand-copy">
              <small>{t("ui.menu.brand.authority")}</small>
              <h1>UNKNOWN <span>YIELD</span></h1>
              <p>{t("ui.menu.brand.tagline")}</p>
            </div>
          </header>}
        >

          <div className="main-menu-rule"><span>{t("ui.menu.rule")}</span><i /></div>

          {!props.ready ? (
            <section className="menu-loading" role="status">
              <span className="menu-status-light" />
              <strong>{t("ui.menu.loading.title")}</strong>
              <p>{t("ui.menu.loading.body")}</p>
            </section>
          ) : (
            <>
              {view === "home" && (
                <div className="menu-view menu-home" id="main-menu-actions">
                  <div className="menu-appointment">
                    <small>{t("ui.menu.home.notice-eyebrow")}</small>
                    <h2>{t("ui.menu.home.notice-title")}</h2>
                    <p>{t("ui.menu.home.notice-body")}</p>
                  </div>
                  <div className="menu-home-actions">
                    {props.resumeSlotId ? (
                      <ActionButton
                        primary
                        disabled={!props.ready || !!props.archiveError}
                        detail={resumeSlot
                          ? tx("ui.menu.home.resume-detail", { name: resumeSlot.name, date: new Date(resumeSlot.savedAt).toLocaleString() })
                          : t("ui.menu.home.resume-detail-fallback")}
                        onClick={() => report(props.onResume())}
                      >
                        {t("ui.menu.home.resume")}
                      </ActionButton>
                    ) : (
                      <ActionButton
                        primary
                        disabled={!props.ready || !!props.archiveError}
                        detail={props.archiveError ? t("ui.menu.home.begin-detail-repair") : t("ui.menu.home.begin-detail-first")}
                        onClick={() => { setFeedback(null); setView("new"); }}
                      >
                        {t("ui.menu.home.begin")}
                      </ActionButton>
                    )}
                    {props.resumeSlotId ? (
                      <ActionButton
                        disabled={!props.ready || !!props.archiveError}
                        detail={t("ui.menu.home.begin-detail-new")}
                        onClick={() => { setFeedback(null); setView("new"); }}
                      >
                        {t("ui.menu.home.begin")}
                      </ActionButton>
                    ) : (
                      <ActionButton
                        disabled
                        detail={t("ui.menu.home.resume-detail-none")}
                        onClick={() => setView("archives")}
                      >
                        {t("ui.menu.home.resume")}
                      </ActionButton>
                    )}
                    <ActionButton
                      detail={t("ui.menu.home.archives-detail")}
                      onClick={() => { setFeedback(null); setView("archives"); }}
                    >
                      {t("ui.menu.home.archives")}
                    </ActionButton>
                    <ActionButton
                      detail={t("ui.menu.home.content-detail")}
                      onClick={() => { setFeedback(null); setView("content"); }}
                    >
                      {t("ui.menu.home.content")}
                    </ActionButton>
                    <ActionButton
                      detail={t("ui.menu.home.settings-detail")}
                      onClick={() => { setFeedback(null); setView("settings"); }}
                    >
                      {t("ui.menu.home.settings")}
                    </ActionButton>
                    <ActionButton
                      detail={t("ui.menu.home.credits-detail")}
                      onClick={() => { setFeedback(null); setView("credits"); }}
                    >
                      {t("ui.menu.home.credits")}
                    </ActionButton>
                  </div>
                  {props.archiveError && (
                    <p className="menu-warning" role="alert">
                      {t("ui.menu.home.archive-warning")}
                    </p>
                  )}
                  {resumeSlot && (
                    <div className="menu-current-record">
                      <span>{t("ui.menu.home.last-valid")}</span>
                      <strong>{resumeSlot.name}</strong>
                      <small>{tx("ui.menu.home.record-meta", {
                        content: resumeSlot.fingerprint ? t("ui.menu.home.content-imported") : t("ui.menu.home.content-standard"),
                        exported: resumeSlot.exported,
                      })}</small>
                    </div>
                  )}
                </div>
              )}

              {view === "new" && (
                <div className="menu-view">
                  <button className="menu-back" onClick={() => setView("home")}>{t("ui.menu.back-menu")}</button>
                  <div className="menu-section-heading">
                    <small>{t("ui.menu.new.eyebrow")}</small>
                    <div className="menu-operator-title">{t("ui.menu.new.role")}</div>
                    <h2>{t("ui.menu.new.title")}</h2>
                    <p>{t("ui.menu.new.body")}</p>
                  </div>
                  <blockquote className="menu-official-dispatch">
                    {t("ui.menu.new.dispatch")}
                    <small>{t("ui.menu.new.dispatch-source")}</small>
                  </blockquote>
                  <label className="menu-field">
                    <span>{t("ui.menu.new.designation")}</span>
                    <input
                      autoFocus
                      type="text"
                      maxLength={80}
                      value={newName}
                      placeholder={t("ui.menu.new.placeholder")}
                      aria-label={t("ui.menu.new.designation")}
                      onChange={(event) => setNewName(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && newName.trim())
                          report(props.onStartNew(newName));
                      }}
                    />
                    <small>{t("ui.menu.new.hint")}</small>
                  </label>
                  <div className="menu-pack-summary">
                    <span>{t("ui.menu.new.active-content")}</span>
                    <strong>{activePackLabel}</strong>
                    <button type="button" onClick={() => setView("content")}>{t("ui.menu.new.change-pack")}</button>
                  </div>
                  <div className="menu-inline-actions">
                    <button className="menu-secondary" onClick={() => setView("home")}>{t("ui.menu.cancel")}</button>
                    <button className="menu-primary" disabled={!newName.trim() || !!props.archiveError} onClick={() => report(props.onStartNew(newName))}>
                      {t("ui.menu.new.create")} <span>→</span>
                    </button>
                  </div>
                </div>
              )}

              {view === "archives" && (
                <div className="menu-view menu-archives">
                  <button className="menu-back" onClick={() => setView("home")}>{t("ui.menu.back-menu")}</button>
                  <div className="menu-section-heading">
                    <small>{t("ui.menu.archives.eyebrow")}</small>
                    <h2>{t("ui.menu.archives.title")}</h2>
                    <p>{t("ui.menu.archives.body")}</p>
                  </div>
                  {props.archiveError && (
                    <div className="menu-warning" role="alert">
                      <p>{props.archiveError}</p>
                      {confirmRecovery ? (
                        <>
                          <p>{t("ui.menu.archives.recover-confirm")}</p>
                          <div className="menu-inline-actions">
                            <button className="menu-secondary" onClick={() => setConfirmRecovery(false)}>{t("ui.menu.cancel")}</button>
                            <button className="menu-primary" onClick={() => {
                              const result = report(props.onRecover());
                              if (result.ok) setConfirmRecovery(false);
                            }}>{t("ui.menu.archives.recover-restore")}</button>
                          </div>
                        </>
                      ) : (
                        <button className="menu-secondary" onClick={() => setConfirmRecovery(true)}>{t("ui.menu.archives.recover")}</button>
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
                              <strong>{slot.name}{slot.id === props.activeSlotId ? " · " + t("ui.menu.archives.last-opened") : ""}</strong>
                              <small>{tx("ui.menu.archives.record-meta", {
                                date: new Date(slot.savedAt).toLocaleString(),
                                exported: slot.exported,
                                schema: slot.schemaVersion,
                              })}</small>
                              <small>{slot.fingerprint ? tx("ui.menu.archives.pack", { fingerprint: slot.fingerprint.slice(0, 12) }) : t("ui.menu.archives.builtin")}</small>
                              {!compatible && <small>{t("ui.menu.archives.other-pack-note")}</small>}
                              {compatible && !loadable && <small>{t("ui.menu.archives.unreadable-note")}</small>}
                            </div>
                            <span className={loadable ? "menu-record-status ready" : "menu-record-status"}>
                              {loadable ? t("ui.menu.archives.status-valid") : compatible ? t("ui.menu.archives.status-unreadable") : t("ui.menu.archives.status-other-pack")}
                            </span>
                          </div>
                          <div className="menu-archive-actions">
                            <button className="menu-primary" disabled={!loadable || !!props.archiveError}
                              onClick={() => report(props.onLoad(slot.id))}>{t("ui.menu.archives.load")}</button>
                            {renameId === slot.id ? (
                              <div className="menu-edit-row">
                                <input aria-label={t("ui.menu.archives.rename-label")} maxLength={80} value={renameName}
                                  onChange={(event) => setRenameName(event.currentTarget.value)} />
                                <button className="menu-secondary" disabled={!renameName.trim()} onClick={() => {
                                  const result = report(props.onRename(slot.id, renameName));
                                  if (result.ok) setRenameId(null);
                                }}>{t("ui.menu.archives.save-name")}</button>
                                <button className="menu-secondary" onClick={() => setRenameId(null)}>{t("ui.menu.cancel")}</button>
                              </div>
                            ) : (
                              <button className="menu-secondary" onClick={() => {
                                setRenameId(slot.id);
                                setRenameName(slot.name);
                              }}>{t("ui.menu.archives.rename")}</button>
                            )}
                            {deleteId === slot.id ? (
                              <div className="menu-delete-confirm" role="group" aria-label={tx("ui.menu.archives.confirm-delete-label", { name: slot.name })}>
                                <span>{t("ui.menu.archives.confirm-delete")}</span>
                                <button className="menu-danger" onClick={() => report(props.onDelete(slot.id))}>{t("ui.menu.archives.delete-expedition")}</button>
                                <button className="menu-secondary" onClick={() => setDeleteId(null)}>{t("ui.menu.archives.keep")}</button>
                              </div>
                            ) : (
                              <button className="menu-secondary" disabled={!!props.archiveError} onClick={() => setDeleteId(slot.id)}>{t("ui.menu.archives.delete")}</button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                    {props.ready && props.listing && props.listing.slots.length === 0 && (
                      <p className="menu-empty">{t("ui.menu.archives.empty")}</p>
                    )}
                  </div>
                  {!!props.listing?.legacy.length && (
                    <section className="menu-legacy">
                      <small>{t("ui.menu.archives.legacy-eyebrow")}</small>
                      <p>{t("ui.menu.archives.legacy-body")}</p>
                      <label className="menu-field">
                        <span>{t("ui.menu.archives.legacy-name")}</span>
                        <input value={legacyName} maxLength={80} onChange={(event) => setLegacyName(event.currentTarget.value)} />
                      </label>
                      {props.listing.legacy.map((legacy) => (
                        <div className="menu-legacy-row" key={legacy.key}>
                          <span>{legacy.label}</span>
                          <button className="menu-secondary" disabled={!legacy.supported || !legacyName.trim() || !!props.archiveError}
                            onClick={() => report(props.onImportLegacy(legacy.key, legacyName))}>
                            {legacy.supported ? t("ui.menu.archives.legacy-import") : t("ui.menu.archives.legacy-incompatible")}
                          </button>
                        </div>
                      ))}
                    </section>
                  )}
                  <div className="menu-inline-actions">
                    <button className="menu-secondary" onClick={() => setView("new")}>{t("ui.menu.archives.new")}</button>
                    <button className="menu-secondary" onClick={() => setView("home")}>{t("ui.menu.back")}</button>
                  </div>
                </div>
              )}

              {view === "content" && (
                <div className="menu-view">
                  <button className="menu-back" onClick={() => setView("home")}>{t("ui.menu.back-menu")}</button>
                  <div className="menu-section-heading">
                    <small>{t("ui.menu.content.eyebrow")}</small>
                    <h2>{t("ui.menu.content.title")}</h2>
                    <p>{t("ui.menu.content.body")}</p>
                  </div>
                  <div className="menu-pack-summary">
                    <span>{t("ui.menu.content.current")}</span>
                    <strong>{activePackLabel}</strong>
                    {props.activeFingerprint && <small>{tx("ui.menu.content.sha", { fingerprint: props.activeFingerprint })}</small>}
                    {!props.activeFingerprint && <small>{t("ui.menu.content.builtin-note")}</small>}
                  </div>
                  <label className="menu-file-field">
                    <span>{t("ui.menu.content.import-label")}</span>
                    <input type="file" accept=".json,application/json" aria-label={t("ui.menu.content.import-aria")}
                      onChange={(event) => {
                        props.onImportPack(event.currentTarget.files?.[0]);
                        event.currentTarget.value = "";
                      }} />
                    <small>{t("ui.menu.content.import-hint")}</small>
                  </label>
                  {props.pendingPack && (
                    <div className="menu-pack-pending">
                      <small>{t("ui.menu.content.pending-eyebrow")}</small>
                      <strong>{props.pendingPack.fingerprint}</strong>
                      <button className="menu-primary" onClick={() => {
                        props.onUsePack(props.pendingPack);
                        setFeedback(t("ui.menu.content.selected-feedback"));
                        setView("new");
                      }}>{t("ui.menu.content.use")}</button>
                    </div>
                  )}
                  {props.activePack && (
                    <button className="menu-secondary menu-full" onClick={() => {
                      props.onUsePack(null);
                      setFeedback(t("ui.menu.content.builtin-feedback"));
                    }}>{t("ui.menu.content.switch-builtin")}</button>
                  )}
                  <div className="menu-inline-actions">
                    <button className="menu-secondary" onClick={() => setView("home")}>{t("ui.menu.back")}</button>
                    <button className="menu-primary" onClick={() => setView("new")}>{t("ui.menu.content.continue")}</button>
                  </div>
                </div>
              )}

              {view === "settings" && (
                <div className="menu-view menu-settings">
                  <button className="menu-back" onClick={() => setView("home")}>{t("ui.menu.back-menu")}</button>
                  <div className="menu-section-heading">
                    <small>{t("ui.menu.settings.eyebrow")}</small>
                    <h2>{t("ui.menu.settings.title")}</h2>
                    <p>{t("ui.menu.settings.body")}</p>
                  </div>
                  <section className="menu-settings-group">
                    <h3>{t("ui.menu.settings.display-group")}</h3>
                    <label className="menu-toggle">
                      <span>{t("ui.menu.settings.fps")}<small>{t("ui.menu.settings.fps-hint")}</small></span>
                      <input type="checkbox" aria-label={t("ui.menu.settings.fps")} checked={props.preferences.interface.showFps}
                        onChange={(event) => updateInterface({ showFps: event.currentTarget.checked })} />
                    </label>
                    <label className="menu-toggle">
                      <span>{t("ui.menu.settings.sound")}<small>{t("ui.menu.settings.sound-hint")}</small></span>
                      <input type="checkbox" aria-label={t("ui.menu.settings.sound")} checked={props.preferences.interface.soundEffects}
                        onChange={(event) => updateInterface({ soundEffects: event.currentTarget.checked })} />
                    </label>
                  </section>
                  <section className="menu-settings-group">
                    <h3>{t("ui.menu.settings.camera-group")}</h3>
                    <label className="menu-toggle">
                      <span>{t("ui.menu.settings.smooth")}<small>{t("ui.menu.settings.smooth-hint")}</small></span>
                      <input type="checkbox" aria-label={t("ui.menu.settings.smooth")} checked={props.preferences.camera.smooth}
                        onChange={(event) => updateCamera({ smooth: event.currentTarget.checked })} />
                    </label>
                    <label className="menu-toggle">
                      <span>{t("ui.menu.settings.invert")}</span>
                      <input type="checkbox" aria-label={t("ui.menu.settings.invert")} checked={props.preferences.controls.invertWheelZoom}
                        onChange={(event) => updateControls({ invertWheelZoom: event.currentTarget.checked })} />
                    </label>
                    <label className="menu-range">
                      <span>{t("ui.menu.settings.pan-speed")}</span>
                      <input type="range" aria-label={t("ui.menu.settings.pan-speed")} min={CAMERA_TUNING_BOUNDS.panSpeed.min}
                        max={CAMERA_TUNING_BOUNDS.panSpeed.max} step={CAMERA_TUNING_BOUNDS.panSpeed.step}
                        value={props.preferences.camera.panSpeed}
                        onChange={(event) => updateCamera({ panSpeed: Number(event.currentTarget.value) })} />
                      <output>{props.preferences.camera.panSpeed.toFixed(1)}×</output>
                    </label>
                    <label className="menu-range">
                      <span>{t("ui.menu.settings.zoom-sensitivity")}</span>
                      <input type="range" aria-label={t("ui.menu.settings.zoom-sensitivity")} min={CAMERA_TUNING_BOUNDS.zoomSensitivity.min}
                        max={CAMERA_TUNING_BOUNDS.zoomSensitivity.max} step={CAMERA_TUNING_BOUNDS.zoomSensitivity.step}
                        value={props.preferences.camera.zoomSensitivity}
                        onChange={(event) => updateCamera({ zoomSensitivity: Number(event.currentTarget.value) })} />
                      <output>{props.preferences.camera.zoomSensitivity.toFixed(1)}×</output>
                    </label>
                  </section>
                  <section className="menu-settings-group">
                    <h3>{t("ui.menu.settings.access-group")}</h3>
                    <label className="menu-select">
                      <span>{t("ui.menu.settings.motion")}</span>
                      <select aria-label={t("ui.menu.settings.motion")} value={props.preferences.accessibility.reducedMotion}
                        onChange={(event) => updateAccessibility({ reducedMotion: event.currentTarget.value as GamePreferences["accessibility"]["reducedMotion"] })}>
                        <option value="system">{t("ui.menu.settings.motion-system")}</option>
                        <option value="on">{t("ui.menu.settings.motion-on")}</option>
                        <option value="off">{t("ui.menu.settings.motion-off")}</option>
                      </select>
                    </label>
                  </section>
                  <section className="menu-settings-group">
                    <h3>{t("ui.menu.settings.controls-group")}</h3>
                    <dl className="menu-controls-list">
                      <dt>{t("ui.menu.settings.control-pan")}</dt><dd>{t("ui.menu.settings.control-pan-keys")}</dd>
                      <dt>{t("ui.menu.settings.control-zoom")}</dt><dd>{t("ui.menu.settings.control-zoom-keys")}</dd>
                      <dt>{t("ui.menu.settings.control-rotate")}</dt><dd>{t("ui.menu.settings.control-rotate-keys")}</dd>
                      <dt>{t("ui.menu.settings.control-cancel")}</dt><dd>{t("ui.menu.settings.control-cancel-keys")}</dd>
                      <dt>{t("ui.menu.settings.control-center")}</dt><dd>{t("ui.menu.settings.control-center-keys")}</dd>
                      <dt>{t("ui.menu.settings.control-roof")}</dt><dd>{t("ui.menu.settings.control-roof-keys")}</dd>
                      <dt>{t("ui.menu.settings.control-touch")}</dt><dd>{t("ui.menu.settings.control-touch-keys")}</dd>
                    </dl>
                  </section>
                  <button className="menu-secondary menu-full" onClick={() => props.onPreferencesChange({
                    version: 2,
                    buildPalette: { promoteLastUsed: true, lastUsedByGroup: {} },
                    camera: { smooth: true, panSpeed: 1, zoomSensitivity: 1, inertia: 0.4 },
                    controls: { invertWheelZoom: false },
                    interface: { showFps: false, soundEffects: true },
                    accessibility: { reducedMotion: "system" },
                  })}>{t("ui.menu.settings.restore")}</button>
                </div>
              )}

              {view === "credits" && (
                <div className="menu-view menu-credits">
                  <button className="menu-back" onClick={() => setView("home")}>{t("ui.menu.back-menu")}</button>
                  <div className="menu-section-heading">
                    <small>{t("ui.menu.credits.eyebrow")}</small>
                    <h2>{t("ui.menu.credits.title")}</h2>
                  </div>
                  <div className="menu-credit-mark" aria-hidden="true">✦</div>
                  <p><strong>UNKNOWN YIELD</strong></p>
                  <p>{t("ui.menu.credits.line-1")}</p>
                  <p>{t("ui.menu.credits.line-2")}</p>
                  <small className="menu-credit-note">{t("ui.menu.credits.note")}</small>
                </div>
              )}
            </>
          )}

          {(feedback || (props.notice && !props.notice.ok ? props.notice.message : null)) && (
            <p className="menu-feedback" role="status">{feedback ?? props.notice?.message}</p>
          )}
          <footer className="main-menu-footer">
            <span>{t("ui.menu.footer.local")}</span>
            <span>{activePackLabel}</span>
          </footer>
        </IndustrialPanelFrame>
        <aside className="main-menu-scene-caption" aria-label={t("ui.menu.scene.aria")}>
          <span className="scene-caption-rule" />
          <small>{t("ui.menu.scene.eyebrow")}</small>
          <strong>{t("ui.menu.scene.slogan")}</strong>
          <span className="scene-caption-sub">{t("ui.menu.scene.sub")}</span>
        </aside>
      </div>
    </main>
  );
}
