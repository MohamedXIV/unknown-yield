import { basename } from "node:path";
import type { Profiler } from "node:inspector";

export type Window = {
  start: number;
  end: number;
  stepMs: number;
  snapshotMs: number;
  combinedMs: number;
  transport: boolean;
};
export type GCEvent = { start: number; duration: number; kind: number | null };
export function quantiles(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pick = (p: number) =>
    Number(sorted[Math.ceil(sorted.length * p) - 1].toFixed(6));
  return {
    medianMs: pick(0.5),
    p95Ms: pick(0.95),
    observations: values.length,
  };
}
export function latencySummary(windows: Window[], gc: GCEvent[]) {
  const overlap = (w: Window) =>
    gc.some((g) => g.start < w.end && g.start + g.duration > w.start);
  const metrics = (rows: Window[]) => ({
    step: quantiles(rows.map((w) => w.stepMs)),
    snapshot: quantiles(rows.map((w) => w.snapshotMs)),
    combined: quantiles(rows.map((w) => w.combinedMs)),
  });
  const inWindow = gc.filter((g) =>
    windows.some((w) => g.start < w.end && g.start + g.duration > w.start),
  );
  return {
    all: metrics(windows),
    transport: metrics(windows.filter((w) => w.transport)),
    nonTransport: metrics(windows.filter((w) => !w.transport)),
    gcOverlapping: metrics(windows.filter(overlap)),
    withoutObservedGC: metrics(windows.filter((w) => !overlap(w))),
    gc: {
      events: inWindow.length,
      totalEventDurationMs: inWindow.reduce((n, g) => n + g.duration, 0),
      byKind: inWindow.reduce<Record<string, number>>((m, g) => {
        const key = String(g.kind);
        m[key] = (m[key] ?? 0) + 1;
        return m;
      }, {}),
    },
  };
}
export function cpuSummary(profile: Profiler.Profile) {
  const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  const parents = new Map<number, number>();
  for (const n of profile.nodes)
    for (const id of n.children ?? []) parents.set(id, n.id);
  const self = new Map<string, number>(),
    inclusive = new Map<string, number>(),
    modules = new Map<string, number>();
  let totalUs = 0;
  const label = (id: number) => {
    const f = nodes.get(id)!.callFrame;
    return (
      (f.functionName || "(anonymous)") +
      " (" +
      basename(f.url || "native") +
      ":" +
      (f.lineNumber + 1) +
      ")"
    );
  };
  for (let i = 0; i < (profile.samples?.length ?? 0); i++) {
    const id = profile.samples![i],
      us = profile.timeDeltas?.[i] ?? 0;
    totalUs += us;
    const key = label(id);
    self.set(key, (self.get(key) ?? 0) + us);
    const module = basename(nodes.get(id)!.callFrame.url || "native");
    modules.set(module, (modules.get(module) ?? 0) + us);
    const seen = new Set<string>();
    let cursor: number | undefined = id;
    while (cursor !== undefined) {
      const ancestor = label(cursor);
      if (!seen.has(ancestor)) {
        inclusive.set(ancestor, (inclusive.get(ancestor) ?? 0) + us);
        seen.add(ancestor);
      }
      cursor = parents.get(cursor);
    }
  }
  const ranked = (m: Map<string, number>, limit: number) =>
    [...m]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, us]) => ({
        name,
        sampledMs: Number((us / 1000).toFixed(3)),
        percent: Number(((100 * us) / Math.max(1, totalUs)).toFixed(3)),
      }));
  return {
    samples: profile.samples?.length ?? 0,
    sampledMs: totalUs / 1000,
    self: ranked(self, 15),
    inclusive: ranked(inclusive, 20),
    modulesBySelf: ranked(modules, 15),
  };
}
