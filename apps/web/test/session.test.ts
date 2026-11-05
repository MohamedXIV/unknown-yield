import { it, expect } from "vitest";
import { Session } from "../game/session";

it("shares a single snapshot projection across listeners until the world changes", () => {
  const session = new Session();
  const original = session.snapshot();
  expect(session.snapshot()).toBe(original);

  const readings: ReturnType<Session["snapshot"]>[] = [];
  const unsubscribeA = session.subscribe(() => readings.push(session.snapshot()));
  const unsubscribeB = session.subscribe(() => readings.push(session.snapshot()));
  session.advance(1000, false);
  // First frame only initializes the clock; a subsequent frame mutates sim.
  expect(readings).toHaveLength(0);
  session.advance(1100, false);
  expect(readings).toHaveLength(2);
  expect(readings[0]).toBe(readings[1]);
  expect(readings[0]).not.toBe(original);
  expect(readings[0].tick).toBe(1);
  expect(session.snapshot()).toBe(readings[0]);

  const beforeCommand = session.snapshot();
  const result = session.command({
    type: "placeMachine", definitionId: "extractor",
    x: 15, y: 25, direction: 0,
  });
  expect(result.ok).toBe(true);
  expect(session.snapshot()).not.toBe(beforeCommand);
  expect(readings.at(-1)).toBe(session.snapshot());

  const beforeReset = session.snapshot();
  session.reset();
  expect(session.snapshot()).not.toBe(beforeReset);

  unsubscribeA();
  unsubscribeB();
  const subscribersBefore = readings.length;
  session.advance(2000, false);
  session.advance(2100, false);
  expect(readings).toHaveLength(subscribersBefore);
});

import { Simulation } from "@site/sim-core";
import { fixture } from "@site/content";
import type { ArchiveStorage } from "../game/save-archive";

function archiveStorage() {
  const records = new Map<string, string>();
  const storage: ArchiveStorage = {
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => { records.set(key, value); },
    removeItem: (key) => { records.delete(key); },
  };
  return { records, storage };
}

it("invalidates the cached projection only after a successful slot load", () => {
  const { records, storage } = archiveStorage();
  const current = new Session();
  expect(current.createSlot(storage, "Original").ok).toBe(true);
  current.advance(1000, false);
  current.advance(1100, false);
  expect(current.save(storage).ok).toBe(true);
  const id = current.activeSlotId()!;

  const restored = new Session();
  const stale = restored.snapshot();
  expect(restored.loadSlot(storage, id).ok).toBe(true);
  expect(restored.snapshot()).not.toBe(stale);
  expect(restored.snapshot().tick).toBe(1);
  const loaded = restored.snapshot();

  const slot = restored.list(storage).slots.find((entry) => entry.id === id)!;
  records.set(slot.current, "{bad-json");
  records.set(slot.previous!, "{also-bad");
  expect(restored.loadSlot(storage, id).ok).toBe(false);
  expect(restored.snapshot()).toBe(loaded);
});

it("does not catch up hidden time and bounds a stalled frame", () => {
  const s = new Session();
  s.advance(1000, false);
  s.advance(1100, false);
  expect(s.snapshot().tick).toBe(1);
  s.advance(50000, true);
  s.advance(100000, false);
  expect(s.snapshot().tick).toBe(1);
  s.advance(101000, false);
  expect(s.snapshot().tick).toBe(3);
});
it("reports storage errors without damaging the running world", () => {
  const s = new Session();
  const { storage } = archiveStorage();
  expect(s.createSlot(storage, "Current").ok).toBe(true);
  const denied: ArchiveStorage = {
    ...storage,
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("quota"); },
  };
  expect(s.save(denied).ok).toBe(false);
  expect(s.restore(denied).ok).toBe(false);
  expect(s.command({
    type: "placeMachine", definitionId: "extractor",
    x: 15, y: 25, direction: 0,
  }).ok).toBe(true);
});

it("refuses malformed archives without replacing the live world", () => {
  const s = new Session();
  const { storage, records } = archiveStorage();
  expect(s.createSlot(storage, "Current").ok).toBe(true);
  const before = s.snapshot();
  records.set("unknown-yield-expeditions-v1", "{broken");
  expect(s.restore(storage).ok).toBe(false);
  expect(s.snapshot()).toBe(before);
});

it("stores new snapshots under independent keys instead of overwriting v15", () => {
  const current = new Session();
  const { records, storage } = archiveStorage();
  expect(current.createSlot(storage, "One").ok).toBe(true);
  const first = current.activeSlotId()!;
  expect(current.createSlot(storage, "Two").ok).toBe(true);
  const second = current.activeSlotId()!;
  expect(first).not.toBe(second);
  expect(records.has("industrial-site-save-v15")).toBe(false);
  expect(current.list(storage).slots).toHaveLength(2);
  const restored = new Session();
  expect(restored.loadSlot(storage, first).ok).toBe(true);
  expect(restored.loadSlot(storage, second).ok).toBe(true);
});

it("does not overwrite historical v7 content or import an incompatible record", () => {
  const { records, storage } = archiveStorage();
  const s = new Session();
  expect(s.createSlot(storage, "Current").ok).toBe(true);
  const old = new Simulation(fixture).serialize();
  old.contentVersion = "world-01-v6";
  const raw = JSON.stringify(old);
  records.set("industrial-site-save-v7", raw);
  const before = s.snapshot();
  expect(s.importLegacy(storage, "industrial-site-save-v7", "Old").ok).toBe(false);
  expect(s.snapshot()).toBe(before);
  expect(s.save(storage).ok).toBe(true);
  expect(records.get("industrial-site-save-v7")).toBe(raw);
});

it("detects a v11 legacy fallback and rejects future schema without modifying it", () => {
  const { records, storage } = archiveStorage();
  const save = new Simulation(fixture).serialize();
  save.schemaVersion = 17;
  const raw = JSON.stringify(save);
  records.set("industrial-site-save-v11", raw);
  const restored = new Session();
  const before = restored.snapshot();
  expect(restored.importLegacy(storage, "industrial-site-save-v11", "Future").ok).toBe(false);
  expect(restored.snapshot()).toBe(before);
  expect(records.get("industrial-site-save-v11")).toBe(raw);
});
