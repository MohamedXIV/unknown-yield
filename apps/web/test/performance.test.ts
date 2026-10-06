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
