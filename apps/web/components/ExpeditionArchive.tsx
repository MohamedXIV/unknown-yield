"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CommandResult } from "@site/sim-core";
import type { ArchiveListing } from "../game/save-archive";

/** The P0 archive controls live inside the existing game menu.
 * The art-directed boot/main menu is a separate P1 issue. */
type Props = {
  listing: ArchiveListing | null;
  error: string | null;
  activeSlotId: string | null;
  activeFingerprint: string | null;
  onSave: () => CommandResult;
  onRecover: () => CommandResult;
  onCreate: (name: string) => CommandResult;
  onLoad: (id: string) => CommandResult;
  onRename: (id: string, name: string) => CommandResult;
  onDelete: (id: string) => CommandResult;
  onImportLegacy: (key: string, name: string) => CommandResult;
};

export default function ExpeditionArchive(props: Props) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState("");
  const [legacyName, setLegacyName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmRecovery, setConfirmRecovery] = useState(false);

  return (
    <section className="configuration-section" aria-label={t("ui.archive.heading")}>
      <h3>{t("ui.archive.heading")}</h3>
      <p className="hint">{t("ui.archive.local-only")}</p>
      {props.error && (
        <div className="reset-confirm" role="alert">
          <p>{props.error}</p>
          {confirmRecovery ? (
            <>
              <p>{t("ui.archive.recover-warning")}</p>
              <button className="danger" onClick={() => {
                if (props.onRecover().ok) setConfirmRecovery(false);
              }}>{t("ui.archive.confirm-recover")}</button>
              <button className="secondary" onClick={() => setConfirmRecovery(false)}>
                {t("ui.archive.cancel")}
              </button>
            </>
          ) : (
            <button className="secondary" onClick={() => setConfirmRecovery(true)}>
              {t("ui.archive.recover")}
            </button>
          )}
        </div>
      )}
      <p className="hint">
        {t("ui.archive.active")}: {props.listing?.slots.find(
          (slot) => slot.id === props.activeSlotId,
        )?.name ?? t("ui.archive.unsaved")}
      </p>
      <button className="primary" disabled={!!props.error} onClick={props.onSave}>
        {t("ui.archive.save")}
      </button>

      <div className="reset-confirm">
        <h3>{t("ui.archive.new")}</h3>
        <p className="hint">{t("ui.archive.new-warning")}</p>
        <input type="text" maxLength={80} value={newName}
          placeholder={t("ui.archive.new-placeholder")}
          aria-label={t("ui.archive.new-name")}
          onChange={(event) => setNewName(event.currentTarget.value)} />
        <button className="primary" disabled={!newName.trim() || !!props.error}
          onClick={() => {
            if (props.onCreate(newName).ok) setNewName("");
          }}>{t("ui.archive.create")}</button>
      </div>

      {props.listing?.slots.length === 0 && (
        <p className="hint">{t("ui.archive.empty")}</p>
      )}
      {props.listing?.slots.map((slot) => {
        const compatible = slot.fingerprint === props.activeFingerprint;
        return (
          <div className="reset-confirm" key={slot.id}>
            <strong>{slot.name}{slot.id === props.activeSlotId
              ? " · " + t("ui.archive.current") : ""}</strong>
            <p className="hint">
              {new Date(slot.savedAt).toLocaleString()} · {t("ui.archive.exported")}: {slot.exported}
              {" · "}{slot.fingerprint
                ? t("ui.archive.imported-pack") + " " + slot.fingerprint.slice(0, 12)
                : t("ui.archive.built-in")}
              {!compatible && " · " + t("ui.archive.incompatible")}
            </p>
            <button className="secondary" disabled={!compatible || !!props.error}
              onClick={() => props.onLoad(slot.id)}>{t("ui.archive.load")}</button>
            {renameId === slot.id ? (
              <>
                <input type="text" maxLength={80} value={renameName}
                  aria-label={t("ui.archive.rename")}
                  onChange={(event) => setRenameName(event.currentTarget.value)} />
                <button className="secondary" disabled={!renameName.trim()}
                  onClick={() => {
                    if (props.onRename(slot.id, renameName).ok) setRenameId(null);
                  }}>{t("ui.archive.confirm-rename")}</button>
                <button className="secondary" onClick={() => setRenameId(null)}>
                  {t("ui.archive.cancel")}
                </button>
              </>
            ) : (
              <button className="secondary" onClick={() => {
                setRenameId(slot.id);
                setRenameName(slot.name);
              }}>{t("ui.archive.rename")}</button>
            )}
            {deleteId === slot.id ? (
              <div role="group" aria-label={t("ui.archive.confirm-delete")}>
                <p>{t("ui.archive.delete-warning")}</p>
                <button className="danger" onClick={() => {
                  if (props.onDelete(slot.id).ok) setDeleteId(null);
                }}>{t("ui.archive.confirm-delete")}</button>
                <button className="secondary" onClick={() => setDeleteId(null)}>
                  {t("ui.archive.cancel")}
                </button>
              </div>
            ) : (
              <button className="secondary" onClick={() => setDeleteId(slot.id)}>
                {t("ui.archive.delete")}
              </button>
            )}
          </div>
        );
      })}

      {!!props.listing?.legacy.length && (
        <div className="reset-confirm">
          <h3>{t("ui.archive.legacy-heading")}</h3>
          <p className="hint">{t("ui.archive.legacy-explainer")}</p>
          <input type="text" maxLength={80} value={legacyName}
            aria-label={t("ui.archive.legacy-name")}
            placeholder={t("ui.archive.legacy-placeholder")}
            onChange={(event) => setLegacyName(event.currentTarget.value)} />
          {props.listing.legacy.map((legacy) => (
            <div key={legacy.key} className="configuration-section">
              <span>{legacy.label}</span>
              <button className="secondary"
                disabled={!legacy.supported || !legacyName.trim() || !!props.error}
                onClick={() => {
                  if (props.onImportLegacy(legacy.key, legacyName).ok) setLegacyName("");
                }}>
                {legacy.supported
                  ? t("ui.archive.import-legacy")
                  : t("ui.archive.unsupported")}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
