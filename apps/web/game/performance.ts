export type BrowserPerformanceMetric =
  | "simulation-step"
  | "snapshot"
  | "world-sync"
  | "world-dynamic-draw"
  | "ui-render-commit"
  | "frame-interval";

export type MetricSummary = {
  count: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
};

export type CameraZoomBand = "far" | "normal" | "close";

export type CameraPacingSummary = {
  frames: number;
  movingFrames: number;
  over33ms: number;
  over100ms: number;
  frameInterval: MetricSummary;
};

type CameraPacingSample = {
  zoomRatio: number;
  intervalMs: number;
  travelPx: number;
};

export type BrowserPerformanceReport = {
  collectedAt: string;
  // Opt-in, diagnostic only: frame intervals grouped by relative zoom.
  // Does not distinguish CPU from GPU stalls or measure physical display FPS.
  cameraPacing: Record<CameraZoomBand, CameraPacingSummary>;
  metrics: Partial<Record<BrowserPerformanceMetric, MetricSummary>>;
  assets: {
    count: number;
    encodedBytes: number;
    transferBytes: number;
    medianDurationMs: number;
    p95DurationMs: number;
    maxDurationMs: number;
  };
  environment: {
    userAgent: string;
    hardwareConcurrency: number | null;
    deviceMemoryGiB: number | null;
    viewport: { width: number; height: number };
    devicePixelRatio: number;
  };
};

const MAX_SAMPLES_PER_METRIC = 20_000;
const MAX_CAMERA_SAMPLES = 4_000;
const EMPTY_FRAME_PACING = () => ({
  frames: 0,
  movingFrames: 0,
  over33ms: 0,
  over100ms: 0,
  frameInterval: summarizeDurations([]),
});

function rounded(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function summarizeDurations(values: readonly number[]): MetricSummary {
  if (!values.length)
    return { count: 0, medianMs: 0, p95Ms: 0, maxMs: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const nearestRank = (fraction: number) =>
    sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))];
  return {
    count: sorted.length,
    medianMs: rounded(nearestRank(0.5)),
    p95Ms: rounded(nearestRank(0.95)),
    maxMs: rounded(sorted[sorted.length - 1]),
  };
}

export class BrowserPerformanceRecorder {
  private samples = new Map<BrowserPerformanceMetric, number[]>();
  private cameraSamples: CameraPacingSample[] = [];

  recordCameraPacing(
    zoomRatio: number,
    intervalMs: number,
    travelPx: number,
  ): void {
    if (
      !Number.isFinite(zoomRatio) || zoomRatio <= 0 ||
      !Number.isFinite(intervalMs) || intervalMs < 0 ||
      !Number.isFinite(travelPx) || travelPx < 0
    ) return;
    this.cameraSamples.push({ zoomRatio, intervalMs, travelPx });
    if (this.cameraSamples.length > MAX_CAMERA_SAMPLES)
      this.cameraSamples.splice(0, this.cameraSamples.length - MAX_CAMERA_SAMPLES);
  }

  cameraPacing(): Record<CameraZoomBand, CameraPacingSummary> {
    const bands: Record<CameraZoomBand, CameraPacingSample[]> = {
      far: [], normal: [], close: [],
    };
    for (const sample of this.cameraSamples) {
      const band = sample.zoomRatio < 0.85
        ? "far" : sample.zoomRatio < 1.5 ? "normal" : "close";
      bands[band].push(sample);
    }
    const summarize = (samples: CameraPacingSample[]): CameraPacingSummary => ({
      frames: samples.length,
      movingFrames: samples.filter((sample) => sample.travelPx > 0.1).length,
      over33ms: samples.filter((sample) => sample.intervalMs > 33.4).length,
      over100ms: samples.filter((sample) => sample.intervalMs > 100).length,
      frameInterval: summarizeDurations(samples.map((sample) => sample.intervalMs)),
    });
    return {
      far: bands.far.length ? summarize(bands.far) : EMPTY_FRAME_PACING(),
      normal: bands.normal.length ? summarize(bands.normal) : EMPTY_FRAME_PACING(),
      close: bands.close.length ? summarize(bands.close) : EMPTY_FRAME_PACING(),
    };
  }

  record(metric: BrowserPerformanceMetric, durationMs: number): void {
    if (!Number.isFinite(durationMs) || durationMs < 0) return;
    const values = this.samples.get(metric) ?? [];
    values.push(durationMs);
    if (values.length > MAX_SAMPLES_PER_METRIC)
      values.splice(0, values.length - MAX_SAMPLES_PER_METRIC);
    this.samples.set(metric, values);
  }

  reset(): void {
    this.samples.clear();
    this.cameraSamples = [];
  }

  metric(metric: BrowserPerformanceMetric): MetricSummary {
    return summarizeDurations(this.samples.get(metric) ?? []);
  }

  metrics(): Partial<Record<BrowserPerformanceMetric, MetricSummary>> {
    return Object.fromEntries(
      [...this.samples.entries()].map(([metric, values]) => [
        metric,
        summarizeDurations(values),
      ]),
    );
  }
}

export const productionPerformance = new BrowserPerformanceRecorder();

let enabledCache: boolean | null = null;

export function browserPerformanceEnabled(): boolean {
  if (enabledCache !== null) return enabledCache;
  enabledCache =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("perf") === "1";
  return enabledCache;
}

export function startBrowserMetric(): number | null {
  return browserPerformanceEnabled() ? performance.now() : null;
}

export function finishBrowserMetric(
  metric: BrowserPerformanceMetric,
  startedAt: number | null,
): void {
  if (startedAt === null || !browserPerformanceEnabled()) return;
  productionPerformance.record(metric, performance.now() - startedAt);
}

export function recordBrowserMetric(
  metric: BrowserPerformanceMetric,
  durationMs: number,
): void {
  if (browserPerformanceEnabled())
    productionPerformance.record(metric, durationMs);
}

/** No-op unless ?perf=1. Zoom is relative to Home; travel is screen pixels. */
export function recordCameraPacing(
  relativeZoom: number,
  intervalMs: number,
  travelPx: number,
): void {
  if (browserPerformanceEnabled())
    productionPerformance.recordCameraPacing(relativeZoom, intervalMs, travelPx);
}

function assetTimings() {
  if (typeof performance === "undefined" || !performance.getEntriesByType)
    return {
      count: 0,
      encodedBytes: 0,
      transferBytes: 0,
      medianDurationMs: 0,
      p95DurationMs: 0,
      maxDurationMs: 0,
    };
  const resources = performance
    .getEntriesByType("resource")
    .filter((entry) => entry.name.includes("/art/phase16/")) as PerformanceResourceTiming[];
  const duration = summarizeDurations(resources.map((entry) => entry.duration));
  return {
    count: resources.length,
    encodedBytes: resources.reduce(
      (sum, entry) => sum + (entry.encodedBodySize || 0),
      0,
    ),
    transferBytes: resources.reduce(
      (sum, entry) => sum + (entry.transferSize || 0),
      0,
    ),
    medianDurationMs: duration.medianMs,
    p95DurationMs: duration.p95Ms,
    maxDurationMs: duration.maxMs,
  };
}

export function browserPerformanceReport(): BrowserPerformanceReport {
  if (typeof window === "undefined")
    throw new Error("Browser performance report is only available in a browser.");
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    collectedAt: new Date().toISOString(),
    metrics: productionPerformance.metrics(),
    cameraPacing: productionPerformance.cameraPacing(),
    assets: assetTimings(),
    environment: {
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency || null,
      deviceMemoryGiB: nav.deviceMemory ?? null,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio,
    },
  };
}

type DiagnosticsWindow = Window & {
  __UNKNOWN_YIELD_PERF__?: {
    reset(): void;
    report(): BrowserPerformanceReport;
  };
};

export function installBrowserPerformanceDiagnostics(): () => void {
  if (!browserPerformanceEnabled()) return () => {};
  const target = window as DiagnosticsWindow;
  productionPerformance.reset();
  target.__UNKNOWN_YIELD_PERF__ = {
    reset: () => productionPerformance.reset(),
    report: () => browserPerformanceReport(),
  };
  return () => {
    delete target.__UNKNOWN_YIELD_PERF__;
  };
}
