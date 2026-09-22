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
