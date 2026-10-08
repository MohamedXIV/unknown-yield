import { enCatalog, fixture } from "@site/content";
import { createContentStore, serializeStudioBundle } from "@site/content/studio";
import { createStudioEntity, setStudioLocaleText } from "../game/studio-workbench";
import { describe, expect, it } from "vitest";
import {
  MAX_RUNTIME_PACK_BYTES,
  RUNTIME_PACK_STORAGE_KEY,
  loadRuntimePack,
  parseRuntimePack,
  saveRuntimePack,
} from "../game/runtime-content";
import { Session } from "../game/session";

function authorPack() {
  const store = createContentStore(fixture, enCatalog);
  store.setCell("meta", "content", "version", "world-01-v14-runtime-pack");
  createStudioEntity(store, "material", "powder");
  createStudioEntity(store, "operation", "polish");
  createStudioEntity(store, "machine", "polisher");
  createStudioEntity(store, "reaction", "polish-raw");
  store.setCell("materials", "powder", "color", "#8899aa");
  setStudioLocaleText(store, "material.powder.name", "Polished powder");
  setStudioLocaleText(store, "operation.polish.name", "Polish");
  setStudioLocaleText(store, "machine.polisher.name", "Polisher");
  setStudioLocaleText(store, "reaction.polish-raw.observation", "Polishing produces powder.");
  store.setCell("machines", "polisher", "role", "processor");
  store.setCell("machines", "polisher", "operationsJson", '["polish"]');
  store.setCell("machines", "polisher", "capacity", 8);
  store.setCell("machines", "polisher", "fuel", 1);
  store.setCell("machines", "polisher", "durationTicks", 20);
  store.setCell("machines", "polisher", "width", 2);
  store.setCell("machines", "polisher", "height", 2);
  store.setCell("machines", "polisher", "cost", 20);
  store.setCell("reactions", "polish-raw", "operation", "polish");
  store.setCell("reactions", "polish-raw", "input", "raw");
  store.setCell("reactions", "polish-raw", "inputAmount", 2);
  store.setCell("reactions", "polish-raw", "output", "powder");
  store.setCell("reactions", "polish-raw", "outputAmount", 1);
  return serializeStudioBundle(store, fixture);
}

describe("offline runtime content pack identity and save isolation", () => {
  it("loads a real Studio-exported chain into a new simulation without rebuild", async () => {
    const raw = authorPack();
    const pack = await parseRuntimePack(raw);
    expect(pack.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(pack.bundle.content.materials.some((m) => m.id === "powder")).toBe(true);
    expect(pack.bundle.content.operations.some((o) => o.id === "polish")).toBe(true);
    expect(pack.bundle.content.machines.some((m) => m.id === "polisher")).toBe(true);
    expect(pack.bundle.content.reactions.some((r) => r.id === "polish-raw")).toBe(true);

    const session = new Session();
    const fixtureBefore = session.snapshot();
    session.usePack(pack);
    expect(session.activePackFingerprint()).toBe(pack.fingerprint);
    expect(session.snapshot().definitions.some((d) => d.id === "polisher")).toBe(true);
    expect(session.snapshot()).not.toBe(fixtureBefore);

    const records = new Map<string, string>();
    const storage = {
      getItem: (k: string) => records.get(k) ?? null,
      setItem: (k: string, v: string) => { records.set(k, v); },
    };
    saveRuntimePack(storage, pack);
    expect(records.has(RUNTIME_PACK_STORAGE_KEY)).toBe(true);
    const fromStorage = await loadRuntimePack(storage);
    expect(fromStorage).toEqual(pack);

    expect(session.save(storage).ok).toBe(true);
    const saveKeys = [...records.keys()].filter((k) => k.startsWith("industrial-site-save"));
    expect(saveKeys).toEqual(["industrial-site-save-v15-pack-" + pack.fingerprint]);
    const restored = new Session();
    restored.usePack(fromStorage!);
    expect(restored.restore(storage).ok).toBe(true);
    expect(restored.snapshot()).toEqual(session.snapshot());
    expect(restored.snapshot().definitions.some((d) => d.id === "polisher")).toBe(true);

    // Default fixture save compatibility remains unchanged and isolated.
    const original = new Session();
    expect(original.restore(storage).ok).toBe(false);
    expect(original.save(storage).ok).toBe(true);
    expect(records.has("industrial-site-save-v15")).toBe(true);
    session.usePack(null);
    expect(session.activePackFingerprint()).toBe(null);
    expect(session.snapshot().definitions.some((d) => d.id === "polisher")).toBe(false);
    expect(session.restore(storage).ok).toBe(true);
  });

  it("isolates saves even if the content version is reused but the locale changes", async () => {
    const pack = await parseRuntimePack(authorPack());
    const changed = JSON.parse(authorPack());
    changed.locale["material.powder.name"] = "A different edition";
    const nextPack = await parseRuntimePack(JSON.stringify(changed));
    expect(nextPack.bundle.content.version).toBe(pack.bundle.content.version);
    expect(nextPack.fingerprint).not.toBe(pack.fingerprint);
    const data = new Map<string, string>();
    const storage = { setItem: (k: string, v: string) => { data.set(k, v); }, getItem: (k: string) => data.get(k) ?? null };
    const s = new Session();
    s.usePack(pack);
    s.save(storage);
    const different = new Session();
    different.usePack(nextPack);
    const unchanged = different.snapshot();
    expect(different.restore(storage).ok).toBe(false);
    expect(different.snapshot()).toEqual(unchanged);
    const key = "industrial-site-save-v15-pack-" + nextPack.fingerprint;
    data.set(key, JSON.stringify({ fingerprint: pack.fingerprint, save: s.snapshot() }));
    expect(different.restore(storage).ok).toBe(false);
    expect(different.snapshot()).toEqual(unchanged);
  });

  it("rejects malformed, invalid and oversized data without changing a world", async () => {
    await expect(parseRuntimePack("{broken")).rejects.toThrow(/JSON/);
    await expect(parseRuntimePack(JSON.stringify({ schemaVersion: 99, content: fixture, locale: enCatalog }))).rejects.toThrow(/schema/);
    await expect(parseRuntimePack("x".repeat(MAX_RUNTIME_PACK_BYTES + 1))).rejects.toThrow(/2 MiB/);
    const pack = await parseRuntimePack(authorPack());
    const stored = new Map<string, string>();
    saveRuntimePack({ setItem: (k, v) => { stored.set(k, v); } }, pack);
    const tampered = JSON.parse(stored.get(RUNTIME_PACK_STORAGE_KEY)!);
    tampered.bundle.locale["material.powder.name"] = "Tampered";
    stored.set(RUNTIME_PACK_STORAGE_KEY, JSON.stringify(tampered));
    await expect(loadRuntimePack({ getItem: (k) => stored.get(k) ?? null })).rejects.toThrow(/fingerprint mismatch/);
  });
});
