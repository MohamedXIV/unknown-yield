import { it, expect } from "vitest";
import { Session } from "../game/session";

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
it("reports storage errors and leaves the game usable", () => {
  const s = new Session();
  const storage = {
    setItem() {
      throw new Error("quota");
    },
    getItem() {
      throw new Error("blocked");
    },
  };
  expect(s.save(storage).ok).toBe(false);
  expect(s.restore(storage).ok).toBe(false);
  expect(
    s.command({
      type: "placeMachine",
      definitionId: "extractor",
      x: 15,
      y: 25,
      direction: 0,
    }).ok,
  ).toBe(true);
});
it("refuses malformed saved JSON without replacing live state", () => {
  const s = new Session();
  const before = s.snapshot();
  expect(s.restore({ getItem: () => "{broken" }).ok).toBe(false);
  expect(s.snapshot()).toEqual(before);
});

it("writes the current save key and reads the previous compatible key", () => {
  const current = new Session();
  const records = new Map<string, string>();
  expect(
    current.save({
      setItem(key, value) {
        records.set(key, value);
      },
    }).ok,
  ).toBe(true);
  expect(records.has("industrial-site-save-v10")).toBe(true);

  const restored = new Session();
  const previous = records.get("industrial-site-save-v10")!;
  expect(
    restored.restore({
      getItem(key) {
        return key === "industrial-site-save-v9" ? previous : null;
      },
    }).ok,
  ).toBe(true);
});

it("preserves older content records and rejects them without replacing the expedition", () => {
  const s = new Session(),
    records = new Map<string, string>();
  s.save({ setItem: (key, value) => records.set(key, value) });
  const old = JSON.parse(records.get("industrial-site-save-v10")!);
  old.contentVersion = "world-01-v6";
  records.set("industrial-site-save-v7", JSON.stringify(old));
  records.delete("industrial-site-save-v10");
  const before = s.snapshot();
  expect(s.restore({ getItem: (key) => records.get(key) ?? null }).ok).toBe(
    false,
  );
  expect(s.snapshot()).toEqual(before);
  expect(s.save({ setItem: (key, value) => records.set(key, value) }).ok).toBe(
    true,
  );
  expect(
    JSON.parse(records.get("industrial-site-save-v7")!).contentVersion,
  ).toBe("world-01-v6");
});
