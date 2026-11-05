import { describe, expect, it } from "vitest";
import { fixture } from "@site/content";
import { Simulation, auditLedger, type Save } from "@site/sim-core";
import { Session } from "../game/session";
import {
  ARCHIVE_INDEX_KEY,
  ARCHIVE_DAMAGED_INDEX_KEY,
  recoverArchiveIndex,
  createExpedition,
  deleteExpedition,
  listExpeditions,
  renameExpedition,
  saveExpedition,
  slotRevisions,
  type ArchiveStorage,
} from "../game/save-archive";
import type { RuntimePack } from "../game/runtime-content";

class LocalStorageStub implements ArchiveStorage {
  readonly values = new Map<string, string>();
  failOn: string | null = null;
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (key === this.failOn) throw new Error("QuotaExceededError");
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

const firstExtractor = {
  type: "placeMachine" as const,
  definitionId: "extractor",
  x: 15, y: 25, direction: 0,
};
const factory = {
  type: "placeFactory" as const,
  x: 24, y: 22, width: 10, height: 10,
};
function authoritative(storage: LocalStorageStub, id: string): Save {
  const copies = slotRevisions(storage, id, null);
  expect(copies.length).toBeGreaterThan(0);
  return copies[0].save as Save;
}
function pack(fingerprint: string): RuntimePack {
  // Only content and identity are used by Session. Validation and SHA-256
  // computation happen in runtime-content before a real pack is selected.
  return { fingerprint, bundle: { content: fixture, locale: {} } } as RuntimePack;
}

describe("Personnel Archives — local multi-expedition persistence (#343)", () => {
  it("round-trips two diverged full worlds without cross-contamination", () => {
    const storage = new LocalStorageStub();
    const session = new Session();
    expect(session.createSlot(storage, "Alpha").ok).toBe(true);
    const alpha = session.activeSlotId()!;
    expect(session.command(firstExtractor).ok).toBe(true);
    session.advance(1000, false);
    session.advance(61000, false);
    expect(session.save(storage).ok).toBe(true);
    const a = authoritative(storage, alpha);
    expect(Object.keys(a.machines).length).toBe(1);
    expect(auditLedger(fixture, a).ok).toBe(true);

    expect(session.createSlot(storage, "Beta").ok).toBe(true);
    const beta = session.activeSlotId()!;
    expect(alpha).not.toBe(beta);
    expect(session.command(factory).ok).toBe(true);
    expect(session.save(storage).ok).toBe(true);
    const b = authoritative(storage, beta);
    expect(Object.keys(b.factories).length).toBe(1);
    expect(Object.keys(b.machines).length).toBe(0);
    expect(auditLedger(fixture, b).ok).toBe(true);
    expect(b.knowledge).toEqual(new Simulation(fixture).serialize().knowledge);

    expect(session.loadSlot(storage, alpha).ok).toBe(true);
    expect(session.snapshot().machines.length).toBe(1);
    expect(session.loadSlot(storage, beta).ok).toBe(true);
    expect(session.snapshot().factories.length).toBe(1);
    expect(session.snapshot().machines.length).toBe(0);
    expect(authoritative(storage, alpha)).toEqual(a);
    expect(authoritative(storage, beta)).toEqual(b);
  });

  it("keeps the previous valid revision when a write hits the index quota", () => {
    const storage = new LocalStorageStub();
    const session = new Session();
    expect(session.createSlot(storage, "Safe").ok).toBe(true);
    const id = session.activeSlotId()!;
    const initial = authoritative(storage, id);
    expect(session.command(firstExtractor).ok).toBe(true);
    storage.failOn = ARCHIVE_INDEX_KEY;
    const failed = session.save(storage);
    expect(failed.ok).toBe(false);
    expect(session.snapshot().machines.length).toBe(1);
    expect(authoritative(storage, id)).toEqual(initial);
    storage.failOn = null;
    expect(session.loadSlot(storage, id).ok).toBe(true);
    expect(session.snapshot().machines.length).toBe(0);
  });

  it("recovers a previous revision if the newest stored payload is corrupt", () => {
    const storage = new LocalStorageStub();
    const session = new Session();
    expect(session.createSlot(storage, "Recovery").ok).toBe(true);
    const id = session.activeSlotId()!;
    expect(session.command(firstExtractor).ok).toBe(true);
    expect(session.save(storage).ok).toBe(true);
    const entry = session.list(storage).slots[0];
    storage.setItem(entry.current, "{bad-json");
    expect(session.command(factory).ok).toBe(true);
    const result = session.loadSlot(storage, id);
    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/Previous valid/);
    expect(session.snapshot().factories.length).toBe(0);
    expect(session.snapshot().machines.length).toBe(0);
    expect(storage.getItem(entry.current)).toBe("{bad-json");
  });

  it("rejects content mismatch and broken archives without replacing active world", () => {
    const storage = new LocalStorageStub();
    const session = new Session();
    expect(session.createSlot(storage, "Base world").ok).toBe(true);
    const builtIn = session.activeSlotId()!;
    expect(session.command(firstExtractor).ok).toBe(true);
    const before = session.snapshot();

    session.usePack(pack("a".repeat(64)));
    expect(session.createSlot(storage, "Pack A").ok).toBe(true);
    const packA = session.activeSlotId()!;
    expect(session.loadSlot(storage, builtIn).ok).toBe(false);
    session.usePack(pack("b".repeat(64)));
    expect(session.loadSlot(storage, packA).ok).toBe(false);
    expect(session.snapshot().machines.length).toBe(0);

    session.usePack(null);
    expect(session.loadSlot(storage, builtIn).ok).toBe(true);
    expect(session.snapshot().machines).toEqual(before.machines);
    storage.setItem(ARCHIVE_INDEX_KEY, "BROKEN");
    const current = session.snapshot();
    expect(session.createSlot(storage, "Must not overwrite").ok).toBe(false);
    expect(session.snapshot()).toEqual(current);
    expect(storage.getItem(ARCHIVE_INDEX_KEY)).toBe("BROKEN");
  });

  it("imports a legacy record by copy with real simulation validation", () => {
    const storage = new LocalStorageStub();
    const old = new Simulation(fixture);
    expect(old.command(firstExtractor).ok).toBe(true);
    const raw = JSON.stringify(old.serialize());
    storage.setItem("industrial-site-save-v14", raw);
    storage.setItem("industrial-site-save-v3", raw);
    const session = new Session();
    const available = session.list(storage).legacy;
    expect(available.some((entry) => entry.key.endsWith("v14") && entry.supported)).toBe(true);
    expect(available.some((entry) => entry.key.endsWith("v3") && !entry.supported)).toBe(true);
    const result = session.importLegacy(storage, "industrial-site-save-v14", "Historic site");
    expect(result.ok).toBe(true);
    expect(storage.getItem("industrial-site-save-v14")).toBe(raw);
    expect(session.snapshot().machines.length).toBe(1);
    expect(session.list(storage).legacy.some((entry) => entry.key.endsWith("v14"))).toBe(false);
    expect(session.importLegacy(storage, "industrial-site-save-v14", "Duplicate").ok).toBe(false);
    expect(session.importLegacy(storage, "industrial-site-save-v3", "Unsupported").ok).toBe(false);
    expect(session.snapshot().machines.length).toBe(1);
  });

  it("does not import malformed legacy data or delete a prior world", () => {
    const storage = new LocalStorageStub();
    const session = new Session();
    expect(session.createSlot(storage, "Current").ok).toBe(true);
    const id = session.activeSlotId()!;
    storage.setItem("industrial-site-save-v15", "{\"garbage\":true}");
    expect(session.importLegacy(storage, "industrial-site-save-v15", "Broken").ok).toBe(false);
    expect(session.activeSlotId()).toBe(id);
    expect(session.list(storage).slots.length).toBe(1);
    expect(storage.getItem("industrial-site-save-v15")).toBe("{\"garbage\":true}");
  });

  it("renames without changing save truth; deletes only the explicitly chosen slot", () => {
    const storage = new LocalStorageStub();
    const base = new Simulation(fixture).serialize();
    const one = createExpedition(storage, "One", null, base);
    const two = createExpedition(storage, "Two", null, base);
    const firstRaw = storage.getItem(one.current);
    expect(renameExpedition(storage, one.id, "First site").name).toBe("First site");
    expect(storage.getItem(one.current)).toBe(firstRaw);
    deleteExpedition(storage, one.id);
    expect(listExpeditions(storage, null).slots.map((slot) => slot.id)).toEqual([two.id]);
    expect(storage.getItem(one.current)).toBeNull();
    expect(storage.getItem(two.current)).not.toBeNull();
  });

  it("preserves exact custom-pack legacy envelope and isolates imports", () => {
    const storage = new LocalStorageStub();
    const fingerprint = "e".repeat(64);
    const legacyKey = "industrial-site-save-v15-pack-" + fingerprint;
    const raw = JSON.stringify({ fingerprint, save: new Simulation(fixture).serialize() });
    storage.setItem(legacyKey, raw);
    const session = new Session();
    session.usePack(pack(fingerprint));
    expect(session.importLegacy(storage, legacyKey, "Imported pack").ok).toBe(true);
    const id = session.activeSlotId()!;
    expect(storage.getItem(legacyKey)).toBe(raw);
    expect(session.list(storage).slots[0].fingerprint).toBe(fingerprint);
    session.usePack(null);
    expect(session.loadSlot(storage, id).ok).toBe(false);
    expect(session.list(storage).legacy).toEqual([]);
  });

  it("requires explicit recovery and preserves damaged index bytes", () => {
    const storage = new LocalStorageStub();
    const source = new Simulation(fixture).serialize();
    const alpha = createExpedition(storage, "Alpha", null, source);
    createExpedition(storage, "Beta", null, source);
    storage.setItem(ARCHIVE_INDEX_KEY, "{damaged");
    expect(() => listExpeditions(storage, null)).toThrow(/index/);
    expect(recoverArchiveIndex(storage)).toBe(1);
    expect(storage.getItem(ARCHIVE_DAMAGED_INDEX_KEY)).toBe("{damaged");
    expect(listExpeditions(storage, null).slots.map((slot) => slot.id)).toEqual([alpha.id]);
    expect(() => recoverArchiveIndex(storage)).toThrow(/unnecessary/);
  });

  it("rejects invalid names and maintains immutable revisions on rename/save", () => {
    const storage = new LocalStorageStub();
    const base = new Simulation(fixture).serialize();
    expect(() => createExpedition(storage, " ", null, base)).toThrow(/name/);
    expect(listExpeditions(storage, null).slots).toEqual([]);
    const entry = createExpedition(storage, "One", null, base);
    const saved = saveExpedition(storage, entry.id, null, base);
    expect(saved.current).not.toBe(entry.current);
    expect(saved.previous).toBe(entry.current);
    expect(slotRevisions(storage, entry.id, null)).toHaveLength(2);
  });
});
