import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "packages/sim-core/test/single-world-baseline.test.ts",
    "--reporter=verbose",
  ],
  { stdio: "inherit", env: { ...process.env, SINGLE_WORLD_BENCHMARK: "1" } },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
