import type { Save } from "@site/sim-core";

/**
 * Browser-local expedition archive. This index is NOT authoritative game state:
 * each immutable payload contains an ordinary Simulation.serialize() snapshot.
 *
 * Commit order: write and verify the new payload, preserve the previous index,
 * then atomically replace the index pointer. Interrupted/quota-failed writes
 * cannot overwrite the only referenced world. The prior slot revision stays
 * available for recovery if the newest payload becomes corrupt.
 */
export const ARCHIVE_INDEX_KEY = "unknown-yield-expeditions-v1";
export const ARCHIVE_INDEX_BACKUP_KEY = "unknown-yield-expeditions-index-backup-v1";
const PAYLOAD_PREFIX = "unknown-yield-expedition-payload-v1:";
const LEGACY_PREFIX = "industrial-site-save-v";
const INDEX_VERSION = 1;

export type ArchiveStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};
export type ExpeditionSlot = {
  id: string;
  name: string;
  fingerprint: string | null;
  createdAt: number;
  savedAt: number;
  schemaVersion: number;
  contentVersion: string;
  tick: number;
  exported: number;
  current: string;
  previous: string | null;
  legacySource: string | null;
};
type ArchiveIndex = { version: 1; slots: ExpeditionSlot[] };
type SlotEnvelope = {
  version: 1;
  slotId: string;
  fingerprint: string | null;
  save: Save;
};
export type LegacyRecord = {
  key: string;
  label: string;
  supported: boolean;
};
export type ArchiveListing = { slots: ExpeditionSlot[]; legacy: LegacyRecord[] };
export type RevisionCandidate = { save: unknown; backup: boolean };

function validFingerprint(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && /^[a-f0-9]{64}$/.test(value));
}
function isSlot(value: unknown): value is ExpeditionSlot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  return typeof s.id === "string" && /^[a-f0-9-]{36}$/.test(s.id) &&
    typeof s.name === "string" && s.name.trim().length > 0 && s.name.length <= 80 &&
    validFingerprint(s.fingerprint) &&
    typeof s.createdAt === "number" && Number.isFinite(s.createdAt) &&
    typeof s.savedAt === "number" && Number.isFinite(s.savedAt) &&
    typeof s.schemaVersion === "number" && Number.isInteger(s.schemaVersion) &&
    typeof s.contentVersion === "string" &&
    typeof s.tick === "number" && Number.isFinite(s.tick) &&
    typeof s.exported === "number" && Number.isFinite(s.exported) &&
    typeof s.current === "string" && s.current.startsWith(PAYLOAD_PREFIX + s.id + ":") &&
    (s.previous === null || (typeof s.previous === "string" &&
      s.previous.startsWith(PAYLOAD_PREFIX + s.id + ":"))) &&
    (s.legacySource === null || typeof s.legacySource === "string");
}
function parseIndex(raw: string | null): ArchiveIndex {
  if (raw === null) return { version: INDEX_VERSION, slots: [] };
  let input: unknown;
  try { input = JSON.parse(raw) as unknown; }
  catch { throw new Error("Personnel Archives index is damaged. Existing records were not changed."); }
  const parsed = input as Partial<ArchiveIndex> | null;
  if (!parsed || parsed.version !== INDEX_VERSION || !Array.isArray(parsed.slots) ||
      !parsed.slots.every(isSlot) ||
      new Set(parsed.slots.map((s) => s.id)).size !== parsed.slots.length)
    throw new Error("Personnel Archives index is incompatible or corrupt. Existing records were not changed.");
  return { version: INDEX_VERSION, slots: parsed.slots };
}
function readIndex(storage: ArchiveStorage): { index: ArchiveIndex; raw: string | null } {
  const raw = storage.getItem(ARCHIVE_INDEX_KEY);
  return { index: parseIndex(raw), raw };
}
function commitIndex(storage: ArchiveStorage, index: ArchiveIndex, oldRaw: string | null): void {
  // Keep a known-readable previous index for manual recovery. If either write
  // fails, the old main index remains valid (localStorage writes are atomic).
  storage.setItem(ARCHIVE_INDEX_BACKUP_KEY,
    oldRaw ?? JSON.stringify({ version: INDEX_VERSION, slots: [] }));
  storage.setItem(ARCHIVE_INDEX_KEY, JSON.stringify(index));
}
function id(): string {
  if (!globalThis.crypto?.randomUUID)
    throw new Error("Secure random IDs are unavailable in this browser.");
  return globalThis.crypto.randomUUID();
}
function normalizedName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80)
    throw new Error("Expedition name must contain 1–80 characters.");
  return trimmed;
}
function keyFor(slotId: string): string {
  return PAYLOAD_PREFIX + slotId + ":" + id();
}
function snapshotEnvelope(slotId: string, fingerprint: string | null, save: Save): string {
  return JSON.stringify({ version: INDEX_VERSION, slotId, fingerprint, save });
}
function metadata(save: Save) {
  return {
    schemaVersion: save.schemaVersion,
    contentVersion: save.contentVersion,
    tick: save.tick,
    exported: save.exported,
  };
}
function writePayloadThenIndex(
  storage: ArchiveStorage,
  next: ExpeditionSlot,
  save: Save,
  existing: ExpeditionSlot[],
  oldRaw: string | null,
): void {
  const payload = snapshotEnvelope(next.id, next.fingerprint, save);
  try {
    storage.setItem(next.current, payload);
    if (storage.getItem(next.current) !== payload)
      throw new Error("Saved payload could not be verified.");
    commitIndex(storage, { version: INDEX_VERSION, slots: existing }, oldRaw);
  } catch (error) {
    // The prior index still points to the prior payload. A failed orphan write
    // can be removed without touching any referenced slot.
    try { storage.removeItem(next.current); } catch { /* storage denied */ }
    throw error;
  }
}
export function listExpeditions(storage: ArchiveStorage, fingerprint: string | null): ArchiveListing {
  const { index } = readIndex(storage);
  const keys = fingerprint
    ? [LEGACY_PREFIX + "15-pack-" + fingerprint]
    : Array.from({ length: 15 }, (_, i) => LEGACY_PREFIX + (15 - i));
  const imported = new Set(index.slots.map((slot) => slot.legacySource).filter(Boolean));
  const legacy = keys.filter((key) => !imported.has(key) && storage.getItem(key) !== null)
    .map((key) => ({
      key,
      label: key.replace(LEGACY_PREFIX, "Field record v"),
      supported: fingerprint !== null || Number(key.slice(LEGACY_PREFIX.length)) >= 4,
    }));
  return {
    slots: [...index.slots].sort((a, b) => b.savedAt - a.savedAt),
    legacy,
  };
}
export function createExpedition(
  storage: ArchiveStorage, name: string, fingerprint: string | null,
  save: Save, legacySource: string | null = null,
): ExpeditionSlot {
  const { index, raw } = readIndex(storage);
  if (legacySource && index.slots.some((slot) => slot.legacySource === legacySource))
    throw new Error("This legacy field record has already been imported.");
  const slotId = id();
  const timestamp = Date.now();
  const slot: ExpeditionSlot = {
    id: slotId, name: normalizedName(name), fingerprint,
    createdAt: timestamp, savedAt: timestamp,
    ...metadata(save), current: keyFor(slotId), previous: null, legacySource,
  };
  writePayloadThenIndex(storage, slot, save, [...index.slots, slot], raw);
  return slot;
}
export function saveExpedition(
  storage: ArchiveStorage, slotId: string, fingerprint: string | null, save: Save,
): ExpeditionSlot {
  const { index, raw } = readIndex(storage);
  const existing = index.slots.find((slot) => slot.id === slotId);
  if (!existing) throw new Error("Selected expedition no longer exists.");
  if (existing.fingerprint !== fingerprint)
    throw new Error("Selected expedition belongs to a different content pack.");
  const next: ExpeditionSlot = {
    ...existing, ...metadata(save), savedAt: Date.now(),
    current: keyFor(slotId), previous: existing.current,
  };
  writePayloadThenIndex(storage, next, save,
    index.slots.map((slot) => slot.id === slotId ? next : slot), raw);
  // Keep the current and previous good revisions. Older ones may be pruned
  // after a successful commit; errors here must never turn success into failure.
  if (existing.previous && existing.previous !== next.current) {
    try { storage.removeItem(existing.previous); } catch { /* best effort */ }
  }
  return next;
}
export function renameExpedition(
  storage: ArchiveStorage, slotId: string, name: string,
): ExpeditionSlot {
  const { index, raw } = readIndex(storage);
  const existing = index.slots.find((slot) => slot.id === slotId);
  if (!existing) throw new Error("Selected expedition no longer exists.");
  const next = { ...existing, name: normalizedName(name) };
  commitIndex(storage, {
    version: INDEX_VERSION,
    slots: index.slots.map((slot) => slot.id === slotId ? next : slot),
  }, raw);
  return next;
}
export function deleteExpedition(storage: ArchiveStorage, slotId: string): void {
  const { index, raw } = readIndex(storage);
  const existing = index.slots.find((slot) => slot.id === slotId);
  if (!existing) throw new Error("Selected expedition no longer exists.");
  commitIndex(storage, {
    version: INDEX_VERSION, slots: index.slots.filter((slot) => slot.id !== slotId),
  }, raw);
  // Remove after the archive stops pointing to these payloads. A storage
  // denial may leave an orphan, but never a dangling live index pointer.
  for (const key of [existing.current, existing.previous]) {
    if (key) storage.removeItem(key);
  }
}
export function slotRevisions(
  storage: ArchiveStorage, slotId: string, fingerprint: string | null,
): RevisionCandidate[] {
  const { index } = readIndex(storage);
  const slot = index.slots.find((entry) => entry.id === slotId);
  if (!slot) throw new Error("Expedition not found.");
  if (slot.fingerprint !== fingerprint)
    throw new Error("This expedition requires its exact original content pack.");
  return [slot.current, slot.previous].flatMap((key, i) => {
    if (!key) return [];
    try {
      const raw = storage.getItem(key);
      if (!raw) return [];
      const envelope = JSON.parse(raw) as Partial<SlotEnvelope>;
      if (envelope.version !== INDEX_VERSION || envelope.slotId !== slotId ||
          envelope.fingerprint !== fingerprint || !envelope.save) return [];
      return [{ save: envelope.save, backup: i === 1 }];
    } catch { return []; }
  });
}
/** Historical single-world storage is read-only, even after a successful import. */
export function readLegacyRecord(
  storage: ArchiveStorage, key: string, fingerprint: string | null,
): unknown {
  const known = listExpeditions(storage, fingerprint).legacy.find((item) => item.key === key);
  if (!known) throw new Error("Legacy field record not found or already imported.");
  if (!known.supported)
    throw new Error("This historical record predates supported save migrations.");
  const raw = storage.getItem(key);
  if (!raw) throw new Error("Legacy field record has disappeared.");
  const input = JSON.parse(raw) as unknown;
  if (!fingerprint) return input;
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Legacy content-pack envelope is invalid.");
  const envelope = input as Record<string, unknown>;
  if (envelope.fingerprint !== fingerprint || !envelope.save)
    throw new Error("Legacy field record has a different content identity.");
  return envelope.save;
}
