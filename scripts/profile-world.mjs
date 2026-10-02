import { spawnSync } from "node:child_process";
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--cpu") || args.length > 1)
  throw new Error("Usage: npm run profile:world [-- --cpu]");
const result = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "packages/sim-core/test/single-world-baseline.test.ts",
    "--reporter=verbose",
    "-t",
    "profiles single-world",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      SINGLE_WORLD_BENCHMARK: "0",
      SINGLE_WORLD_PROFILE: args.includes("--cpu") ? "cpu" : "timing",
    },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
