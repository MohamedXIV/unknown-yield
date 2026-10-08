import { describe, expect, it } from "vitest";
import {
  BrowserPerformanceRecorder,
  summarizeDurations,
} from "../game/performance";

describe("Phase 16 browser performance diagnostics", () => {
  it("uses nearest-rank percentiles without inventing a pass budget", () => {
    expect(summarizeDurations([7, 1, 4, 9, 2])).toEqual({
      count: 5,
      medianMs: 4,
      p95Ms: 9,
      maxMs: 9,
    });
  });

  it("keeps metrics separated by subsystem", () => {
    const recorder = new BrowserPerformanceRecorder();
    recorder.record("simulation-step", 2);
    recorder.record("simulation-step", 6);
    recorder.record("snapshot", 3);
    recorder.record("world-sync", 4);
    recorder.record("world-dynamic-draw", 5);
    recorder.record("ui-render-commit", 7);
    recorder.record("frame-interval", 16.7);

    expect(recorder.metric("simulation-step")).toEqual({
      count: 2,
      medianMs: 2,
      p95Ms: 6,
      maxMs: 6,
    });
    expect(recorder.metric("snapshot").count).toBe(1);
    expect(recorder.metric("world-sync").count).toBe(1);
    expect(recorder.metric("world-dynamic-draw").count).toBe(1);
    expect(recorder.metric("ui-render-commit").count).toBe(1);
    expect(recorder.metric("frame-interval").count).toBe(1);
  });

  it("separates close-zoom frame pacing from normal zoom without guessing GPU cost", () => {
    const recorder = new BrowserPerformanceRecorder();
    recorder.recordCameraPacing(1, 16.7, 3);
    recorder.recordCameraPacing(1.2, 33.5, 0);
    recorder.recordCameraPacing(2, 50, 12);
    recorder.recordCameraPacing(2.2, 210, 6);
    recorder.recordCameraPacing(0.6, 16, 2);
    // Invalid measurements never affect the summary.
    recorder.recordCameraPacing(Number.NaN, 40, 1);
    recorder.recordCameraPacing(2, -1, 1);
    recorder.recordCameraPacing(2, 16, Number.NaN);

    const pacing = recorder.cameraPacing();
    expect(pacing.normal.frames).toBe(2);
    expect(pacing.normal.movingFrames).toBe(1);
    expect(pacing.normal.over33ms).toBe(1);
    expect(pacing.normal.over100ms).toBe(0);
    expect(pacing.normal.frameInterval.p95Ms).toBe(33.5);

    expect(pacing.close.frames).toBe(2);
    expect(pacing.close.movingFrames).toBe(2);
    expect(pacing.close.over33ms).toBe(2);
    expect(pacing.close.over100ms).toBe(1);
    expect(pacing.close.frameInterval.maxMs).toBe(210);
    expect(pacing.far.frames).toBe(1);

    recorder.reset();
    expect(recorder.cameraPacing().close).toEqual({
      frames: 0, movingFrames: 0, over33ms: 0, over100ms: 0,
      frameInterval: { count: 0, medianMs: 0, p95Ms: 0, maxMs: 0 },
    });
  });

  it("ignores invalid timing samples and resets deterministically", () => {
    const recorder = new BrowserPerformanceRecorder();
    recorder.record("snapshot", -1);
    recorder.record("snapshot", Number.NaN);
    recorder.record("snapshot", 1.25);
    expect(recorder.metric("snapshot").count).toBe(1);
    recorder.reset();
    expect(recorder.metric("snapshot")).toEqual({
      count: 0,
      medianMs: 0,
      p95Ms: 0,
      maxMs: 0,
    });
  });
});
