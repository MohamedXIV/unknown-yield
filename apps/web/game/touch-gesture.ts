/**
 * Camera/build touch gesture arbitration, independent of Phaser and the DOM.
 * Touch IDs are stable pointer identifiers, coordinates are canvas-local px.
 * The caller never dispatches build/select actions directly from touch up:
 * only the result of this state machine may commit an action.
 */
export type TouchPoint = { x: number; y: number };
export type TouchMode = "inspect" | "build";

export type TouchGesture =
  | { kind: "pan"; dx: number; dy: number }
  | {
      kind: "pinch";
      scale: number;
      previous: TouchPoint;
      current: TouchPoint;
    }
  | { kind: "tap"; point: TouchPoint }
  | { kind: "build"; start: TouchPoint; end: TouchPoint }
  | { kind: "cancel-build" };

type TouchTrack = {
  start: TouchPoint;
  current: TouchPoint;
  dragged: boolean;
};

const DISTANCE_THRESHOLD_PX = 8;

const separation = (a: TouchPoint, b: TouchPoint) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: TouchPoint, b: TouchPoint): TouchPoint => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});
const finitePoint = (point: TouchPoint) =>
  Number.isFinite(point.x) && Number.isFinite(point.y);

export class TouchGestureArbiter {
  private readonly tracks = new Map<number, TouchTrack>();
  private blocked = false;
  private readonly threshold: number;

  constructor(thresholdPx = DISTANCE_THRESHOLD_PX) {
    this.threshold =
      Number.isFinite(thresholdPx) && thresholdPx > 0
        ? thresholdPx
        : DISTANCE_THRESHOLD_PX;
  }

  get activeCount(): number {
    return this.tracks.size;
  }

  down(id: number, point: TouchPoint): TouchGesture | null {
    if (!Number.isInteger(id) || !finitePoint(point) || this.tracks.has(id))
      return null;
    if (this.tracks.size === 0) this.blocked = false;
    this.tracks.set(id, {
      start: { ...point },
      current: { ...point },
      dragged: false,
    });
    if (this.tracks.size > 1) {
      this.blocked = true;
      return { kind: "cancel-build" };
    }
    return null;
  }

  move(id: number, point: TouchPoint, mode: TouchMode): TouchGesture | null {
    const track = this.tracks.get(id);
    if (!track || !finitePoint(point)) return null;
    const previous = { ...track.current };
    const pair = [...this.tracks.values()];
    const before =
      pair.length === 2
        ? {
            midpoint: midpoint(pair[0].current, pair[1].current),
            distance: separation(pair[0].current, pair[1].current),
          }
        : null;

    track.current = { ...point };
    if (separation(track.start, point) >= this.threshold)
      track.dragged = true;

    if (this.blocked) {
      if (this.tracks.size !== 2 || !before) return null;
      const [first, second] = [...this.tracks.values()];
      const afterMidpoint = midpoint(first.current, second.current);
      const afterDistance = separation(first.current, second.current);
      const scale =
        before.distance > 0 && afterDistance > 0
          ? afterDistance / before.distance
          : 1;
      return {
        kind: "pinch",
        scale,
        previous: before.midpoint,
        current: afterMidpoint,
      };
    }

    if (mode !== "inspect") return null;
    if (!track.dragged) return null;
    return {
      kind: "pan",
      dx: track.dragged && separation(track.start, previous) < this.threshold
        ? point.x - track.start.x
        : point.x - previous.x,
      dy: track.dragged && separation(track.start, previous) < this.threshold
        ? point.y - track.start.y
        : point.y - previous.y,
    };
  }

  up(id: number, point: TouchPoint, mode: TouchMode): TouchGesture | null {
    const track = this.tracks.get(id);
    if (!track) return null;
    this.tracks.delete(id);
    if (this.blocked) {
      if (this.tracks.size === 0) this.blocked = false;
      return null;
    }
    const end = finitePoint(point) ? { ...point } : { ...track.current };
    const dragged = track.dragged || separation(track.start, end) >= this.threshold;
    if (mode === "inspect")
      return dragged ? null : { kind: "tap", point: end };
    return { kind: "build", start: { ...track.start }, end };
  }

  cancel(id?: number): void {
    this.blocked = true;
    if (id === undefined) this.tracks.clear();
    else this.tracks.delete(id);
  }
}
