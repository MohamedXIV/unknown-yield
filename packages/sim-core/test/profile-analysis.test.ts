import { expect, it } from "vitest";
import { cpuSummary, latencySummary } from "./profile-analysis";
it("computes joint percentiles from real update pairs and separates GC/transport windows", () => {
  const rows = [
    {
      start: 0,
      end: 5,
      stepMs: 4,
      snapshotMs: 1,
      combinedMs: 5,
      transport: true,
    },
    {
      start: 10,
      end: 15,
      stepMs: 1,
      snapshotMs: 4,
      combinedMs: 5,
      transport: false,
    },
  ];
  const result = latencySummary(rows, [
    { start: 2, duration: 1, kind: 1 },
    { start: 7, duration: 1, kind: 1 },
  ]);
  expect(result.all.combined!.p95Ms).toBe(5);
  expect(result.all.step!.p95Ms + result.all.snapshot!.p95Ms).toBe(8);
  expect(result.transport.combined!.observations).toBe(1);
  expect(result.gc.events).toBe(1);
  expect(result.gcOverlapping.combined!.observations).toBe(1);
  expect(result.withoutObservedGC.combined!.observations).toBe(1);
});
it("weights CPU samples by time delta and keeps inclusive ancestors distinct from self costs", () => {
  const frame = (functionName: string, url: string) => ({
    functionName,
    url,
    scriptId: "1",
    lineNumber: 0,
    columnNumber: 0,
  });
  const result = cpuSummary({
    startTime: 0,
    endTime: 3000,
    nodes: [
      {
        id: 1,
        callFrame: frame("step", "file:///secret/local/simulation.ts"),
        children: [2],
      },
      {
        id: 2,
        callFrame: frame("transport", "file:///secret/local/production.ts"),
      },
    ],
    samples: [1, 2],
    timeDeltas: [1000, 2000],
  });
  expect(result.self[0]).toMatchObject({
    name: "transport (production.ts:1)",
    sampledMs: 2,
  });
  expect(result.inclusive[0]).toMatchObject({
    name: "step (simulation.ts:1)",
    sampledMs: 3,
  });
  expect(JSON.stringify(result)).not.toContain("secret");
});
