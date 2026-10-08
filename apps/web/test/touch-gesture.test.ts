import { expect, it } from "vitest";
import { TouchGestureArbiter } from "../game/touch-gesture";

const p = (x: number, y: number) => ({ x, y });

it("allows a single touch tap to inspect and single-finger building to commit", () => {
  const inspect = new TouchGestureArbiter();
  expect(inspect.down(1, p(20, 30))).toBeNull();
  expect(inspect.move(1, p(24, 33), "inspect")).toBeNull();
  expect(inspect.up(1, p(24, 33), "inspect")).toEqual({
    kind: "tap",
    point: p(24, 33),
  });

  const build = new TouchGestureArbiter();
  build.down(3, p(20, 30));
  expect(build.move(3, p(44, 30), "build")).toBeNull();
  expect(build.up(3, p(44, 30), "build")).toEqual({
    kind: "build",
    start: p(20, 30),
    end: p(44, 30),
  });
});

it("pans with a single Inspect finger, threshold prevents accidental clicks", () => {
  const gesture = new TouchGestureArbiter();
  gesture.down(1, p(20, 30));
  expect(gesture.move(1, p(25, 30), "inspect")).toBeNull();
  expect(gesture.move(1, p(30, 33), "inspect")).toEqual({
    kind: "pan",
    dx: 10,
    dy: 3,
  });
  expect(gesture.move(1, p(36, 37), "inspect")).toEqual({
    kind: "pan",
    dx: 6,
    dy: 4,
  });
  expect(gesture.up(1, p(36, 37), "inspect")).toBeNull();
});

it("uses midpoint and distance for continuous two-finger pan/pinch", () => {
  const gesture = new TouchGestureArbiter();
  gesture.down(11, p(100, 100));
  expect(gesture.down(12, p(200, 100))).toEqual({
    kind: "cancel-build",
  });
  expect(gesture.move(12, p(220, 100), "build")).toEqual({
    kind: "pinch",
    scale: 1.2,
    previous: p(150, 100),
    current: p(160, 100),
  });
  expect(gesture.move(11, p(110, 120), "build")).toMatchObject({
    kind: "pinch",
    current: p(165, 110),
  });
  expect(gesture.up(12, p(220, 100), "build")).toBeNull();
  // No tap/build after any multitouch, even when one finger remains.
  expect(gesture.up(11, p(110, 120), "build")).toBeNull();
});

it("never commits accidental build/select after pinch or third-finger gestures", () => {
  const gesture = new TouchGestureArbiter();
  gesture.down(1, p(30, 40));
  gesture.move(1, p(100, 40), "build");
  expect(gesture.down(2, p(90, 40))).toEqual({ kind: "cancel-build" });
  gesture.down(3, p(20, 50));
  expect(gesture.move(1, p(105, 45), "build")).toBeNull();
  expect(gesture.up(1, p(105, 45), "build")).toBeNull();
  expect(gesture.up(2, p(90, 40), "inspect")).toBeNull();
  expect(gesture.up(3, p(20, 50), "inspect")).toBeNull();

  // A genuinely new contact can tap/build again.
  gesture.down(4, p(10, 20));
  expect(gesture.up(4, p(10, 20), "inspect")).toEqual({
    kind: "tap",
    point: p(10, 20),
  });
});

it("cancels pointer sequences without leaking synthetic placement", () => {
  const gesture = new TouchGestureArbiter();
  gesture.down(1, p(30, 40));
  gesture.cancel(1);
  expect(gesture.up(1, p(30, 40), "build")).toBeNull();

  gesture.down(2, p(50, 60));
  gesture.cancel();
  expect(gesture.up(2, p(50, 60), "inspect")).toBeNull();
  gesture.down(3, p(10, 10));
  expect(gesture.up(3, p(10, 10), "inspect")).toEqual({
    kind: "tap",
    point: p(10, 10),
  });
});

it("ignores malformed/unknown input without producing game commands", () => {
  const gesture = new TouchGestureArbiter();
  expect(gesture.down(1, p(Infinity, 3))).toBeNull();
  expect(gesture.up(1, p(0, 0), "build")).toBeNull();
  gesture.down(7, p(10, 10));
  expect(gesture.down(7, p(20, 20))).toBeNull();
  expect(gesture.move(9, p(50, 50), "inspect")).toBeNull();
  expect(gesture.move(7, p(NaN, 50), "inspect")).toBeNull();
  expect(gesture.activeCount).toBe(1);
  expect(gesture.up(7, p(10, 10), "inspect")).toEqual({
    kind: "tap",
    point: p(10, 10),
  });
});
