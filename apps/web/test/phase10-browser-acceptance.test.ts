import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fixture, enCatalog } from "@site/content";
import {
  createContentStore,
  serializeStudioBundle,
} from "@site/content/studio";
import {
  createStudioEntity,
  setStudioLocaleText,
} from "../game/studio-workbench";
import {
  auditLedger,
  Simulation,
  experimentEvidenceKey,
  initializeKnownMarkets,
  type GameCommand,
} from "@site/sim-core";
import type { Save } from "@site/sim-core";
import { expect, it } from "vitest";

function runtimePackBrowserFixture(): string {
  const store = createContentStore(fixture, enCatalog);
  store.setCell(
    "meta",
    "content",
    "version",
    "world-01-v14-browser-content-pack",
  );
  createStudioEntity(store, "material", "powder");
  createStudioEntity(store, "operation", "polish");
  createStudioEntity(store, "machine", "polisher");
  createStudioEntity(store, "reaction", "polish-raw");
  store.setCell("materials", "powder", "color", "#8899aa");
  setStudioLocaleText(store, "material.powder.name", "Polished powder");
  setStudioLocaleText(store, "operation.polish.name", "Polish");
  setStudioLocaleText(store, "machine.polisher.name", "Polisher");
  setStudioLocaleText(
    store,
    "reaction.polish-raw.observation",
    "Polishing produces powder.",
  );
  store.setCell("machines", "polisher", "role", "processor");
  store.setCell("machines", "polisher", "operationsJson", '["polish"]');
  store.setCell("machines", "polisher", "capacity", 8);
  store.setCell("machines", "polisher", "fuel", 1);
  store.setCell("machines", "polisher", "durationTicks", 20);
  store.setCell("machines", "polisher", "width", 2);
  store.setCell("machines", "polisher", "height", 2);
  store.setCell("machines", "polisher", "cost", 20);
  store.setCell("reactions", "polish-raw", "operation", "polish");
  store.setCell("reactions", "polish-raw", "input", "raw");
  store.setCell("reactions", "polish-raw", "inputAmount", 2);
  store.setCell("reactions", "polish-raw", "output", "powder");
  store.setCell("reactions", "polish-raw", "outputAmount", 1);
  return serializeStudioBundle(store, fixture);
}

const browserAcceptanceMode =
  process.env.UNKNOWN_YIELD_BROWSER_ACCEPTANCE ?? "dev";
const browserIt =
  process.env.CI && browserAcceptanceMode !== "skip" ? it : it.skip;
const productionBrowser = browserAcceptanceMode.startsWith("production");
// Camera diagnostics are opt-in; they let the browser test hit real cells.
const appUrl = "http://127.0.0.1:4010/?perf=1";
const debugPort = 9333;

function build(sim: Simulation, command: GameCommand) {
  const result = sim.command(command);
  expect(result.ok, result.message).toBe(true);
  return result.id!;
}

function hazardSave() {
  const sim = new Simulation(fixture);
  const state = sim.serialize();
  const prerequisite = fixture.reactions.find(
    (reaction) => reaction.id === "heat-raw-sealed",
  )!;
  state.knowledge.push(prerequisite.id);
  state.evidence[
    experimentEvidenceKey(
      prerequisite.operation,
      prerequisite.input,
      prerequisite.processConditionId ?? null,
    )
  ] = {
    operationId: prerequisite.operation,
    inputId: prerequisite.input,
    processConditionId: prerequisite.processConditionId ?? null,
    state: "confirmed",
  };
  initializeKnownMarkets(fixture, state);
  expect(sim.load(state).ok).toBe(true);

  const factoryId = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 23,
    width: 10,
    height: 10,
  });
  build(sim, {
    type: "placePort",
    factoryId,
    x: 24,
    y: 27,
    direction: 0,
  });
  build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 18,
    y: 26,
    direction: 0,
  });
  const processorId = build(sim, {
    type: "placeMachine",
    definitionId: "oversealed-furnace",
    x: 27,
    y: 26,
    direction: 0,
  });
  build(sim, {
    type: "placeBelts",
    points: Array.from({ length: 7 }, (_, index) => ({
      x: 20 + index,
      y: 27,
    })),
    direction: 0,
  });

  for (
    let tick = 0;
    tick < 500 && !sim.serialize().machines[processorId].incident;
    tick++
  )
    sim.step(fixture.tickMs);

  expect(sim.serialize().machines[processorId].incident).toBe("slag-jam");
  expect(sim.serialize().hazardEvidence).toEqual(["slag-jam"]);
  return sim.serialize();
}

function phase12BrowserWorld() {
  const sim = new Simulation(fixture);
  const factoryId = build(sim, {
    type: "placeFactory",
    x: 24,
    y: 33,
    width: 10,
    height: 10,
  });
  const factoryB = build(sim, {
    type: "placeFactory",
    x: 44,
    y: 33,
    width: 10,
    height: 10,
  });
  build(sim, {
    type: "placePort",
    factoryId,
    x: 33,
    y: 37,
    direction: 2,
  });
  build(sim, {
    type: "placePort",
    factoryId: factoryB,
    x: 44,
    y: 37,
    direction: 0,
  });
  const machineId = build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 30,
    y: 36,
    direction: 2,
  });
  const machineB = build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 46,
    y: 36,
    direction: 0,
  });
  expect(
    sim.command({
      type: "setEnabled",
      machineId,
      enabled: false,
    }).ok,
  ).toBe(true);
  expect(
    sim.command({
      type: "setEnabled",
      machineId: machineB,
      enabled: false,
    }).ok,
  ).toBe(true);

  build(sim, {
    type: "placeStorage",
    definitionId: "depot",
    x: 34,
    y: 44,
    direction: 0,
  });
  build(sim, {
    type: "placeBelts",
    points: [
      { x: 37, y: 45 },
      { x: 38, y: 45 },
      { x: 39, y: 45 },
      ...Array.from({ length: 8 }, (_, index) => ({
        x: 39,
        y: 44 - index,
      })),
    ],
    direction: 0,
  });
  build(sim, {
    type: "placeBelts",
    points: Array.from({ length: 7 }, (_, index) => ({
      x: 38 - index,
      y: 37,
    })),
    direction: 2,
  });
  build(sim, {
    type: "placeBelts",
    points: Array.from({ length: 6 }, (_, index) => ({
      x: 40 + index,
      y: 37,
    })),
    direction: 0,
  });
  const diverterId = sim
    .snapshot()
    .belts.find((belt) => belt.x === 39 && belt.y === 37)!.id;
  expect(sim.command({ type: "rotateDivert", beltId: diverterId }).ok).toBe(
    true,
  );
  expect(sim.command({ type: "rotateDivert", beltId: diverterId }).ok).toBe(
    true,
  );

  return {
    save: sim.serialize(),
    factoryId,
    machineId,
    diverterId,
  };
}

function phase20FlowBrowserWorld() {
  const sim = new Simulation(fixture);
  build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 15,
    y: 25,
    direction: 0,
  });
  build(sim, {
    type: "placeStorage",
    definitionId: "depot",
    x: 22,
    y: 24,
    direction: 0,
  });
  return sim.serialize();
}

function phase20LineReuseBrowserWorld() {
  const sim = new Simulation(fixture),
    profile = fixture.liquidLogistics!.containmentProfiles[0].id,
    pipePoints = Array.from({ length: 5 }, (_, index) => ({
      x: 30 + index,
      y: 20,
      inlet: 2,
      outlet: 0,
    })),
    pressurePoints = Array.from({ length: 5 }, (_, index) => ({
      x: 30 + index,
      y: 22,
      inlet: 2,
      outlet: 0,
    }));
  build(sim, {
    type: "placePipes",
    containmentProfileId: profile,
    points: pipePoints,
  });
  build(sim, { type: "placePressureLines", points: pressurePoints });
  for (const x of [31, 33]) {
    const pipeId = sim.serialize().pipes[`${x},20`].id,
      pressureId = sim.serialize().pressureLines[`${x},22`].id;
    expect(sim.command({ type: "dismantle", id: pipeId }).ok).toBe(true);
    expect(sim.command({ type: "dismantle", id: pressureId }).ok).toBe(true);
  }
  return {
    save: sim.serialize(),
    profile,
    pipePoints,
    pressurePoints,
    existingPipeIds: [30, 32, 34].map(
      (x) => sim.serialize().pipes[`${x},20`].id,
    ),
    existingPressureIds: [30, 32, 34].map(
      (x) => sim.serialize().pressureLines[`${x},22`].id,
    ),
  };
}

function phase20DismantleBrowserWorld() {
  const sim = new Simulation(fixture);
  build(sim, {
    type: "placeMachine",
    definitionId: "extractor",
    x: 15,
    y: 25,
    direction: 0,
  });
  build(sim, {
    type: "placeStorage",
    definitionId: "depot",
    x: 22,
    y: 24,
    direction: 0,
  });
  build(sim, {
    type: "placeBelts",
    points: [
      ...Array.from({ length: 5 }, (_, index) => ({ x: 17 + index, y: 26 })),
      { x: 21, y: 25 },
    ],
    direction: 0,
  });
  const emptyBeltIds: string[] = [];
  for (const [x, y] of [[30, 30], [31, 30], [36, 30], [37, 30], [38, 30], [39, 30], [46, 30], [47, 30], [48, 30], [49, 30]] as const)
    emptyBeltIds.push(build(sim, { type: "placeBelts", points: [{ x, y }], direction: 0 }));
  build(sim, {
    type: "placePressureLines",
    points: [{ x: 32, y: 30, inlet: 2, outlet: 0 }],
  });
  build(sim, {
    type: "placeBelts",
    points: [{ x: 30, y: 32 }],
    direction: 0,
  });
  build(sim, {
    type: "placePipes",
    containmentProfileId: "standard",
    points: [{ x: 31, y: 32, inlet: 2, outlet: 0 }],
  });
  build(sim, {
    type: "placePressureLines",
    points: [{ x: 32, y: 32, inlet: 2, outlet: 0 }],
  });
  const familyFactoryId = build(sim, {
    type: "placeFactory",
    x: 40,
    y: 30,
    width: 6,
    height: 6,
  });
  build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 41,
    y: 31,
    direction: 0,
  });
  const exactFactoryId = build(sim, {
    type: "placeFactory",
    x: 25,
    y: 20,
    width: 13,
    height: 6,
  });
  for (const [definitionId, x] of [
    ["crusher", 26],
    ["crusher", 30],
    ["furnace", 34],
  ] as const)
    build(sim, { type: "placeMachine", definitionId, x, y: 21, direction: 0 });
  build(sim, {
    type: "placeStorage",
    definitionId: "depot",
    x: 40,
    y: 40,
    direction: 0,
  });
  build(sim, {
    type: "placeUndergroundSolid",
    entry: { x: 43, y: 40 },
    exit: { x: 45, y: 40 },
  });
  const factoryId = build(sim, {
    type: "placeFactory",
    x: 52,
    y: 40,
    width: 6,
    height: 6,
  });
  const childId = build(sim, {
    type: "placeMachine",
    definitionId: "crusher",
    x: 54,
    y: 42,
    direction: 0,
  });
  expect(sim.command({ type: "setEnabled", machineId: childId, enabled: false }).ok).toBe(true);

  const loaded = sim.serialize();
  const gasKnowledge = fixture.reactions.find(
    (reaction) => reaction.id === "vaporize-liquid-0",
  )!;
  loaded.knowledge.push(gasKnowledge.id);
  loaded.evidence[
    experimentEvidenceKey(
      gasKnowledge.operation,
      gasKnowledge.input,
      gasKnowledge.processConditionId ?? null,
    )
  ] = {
    operationId: gasKnowledge.operation,
    inputId: gasKnowledge.input,
    processConditionId: gasKnowledge.processConditionId ?? null,
    state: "confirmed",
  };
  loaded.pressureLines["32,30"].materialId = "gas-0";
  loaded.pressureLines["32,30"].quantity = 1;
  loaded.flows.produced["gas-0"] = 1;
  initializeKnownMarkets(fixture, loaded);
  const restored = sim.load(loaded);
  expect(restored.ok, restored.message).toBe(true);
  return {
    save: sim.serialize(),
    emptyBeltIds,
    familyFactoryId,
    exactFactoryId,
    factoryId,
    childId,
  };
}

function chromeExecutable(): string | null {
  const candidates = [
    process.env.CHROME_BIN,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    process.env.PROGRAMFILES
      ? join(
          process.env.PROGRAMFILES,
          "Google",
          "Chrome",
          "Application",
          "chrome.exe",
        )
      : undefined,
    process.env["PROGRAMFILES(X86)"]
      ? join(
          process.env["PROGRAMFILES(X86)"],
          "Google",
          "Chrome",
          "Application",
          "chrome.exe",
        )
      : undefined,
    process.env.LOCALAPPDATA
      ? join(
          process.env.LOCALAPPDATA,
          "Google",
          "Chrome",
          "Application",
          "chrome.exe",
        )
      : undefined,
  ];
  return (
    candidates.find((candidate) => candidate && existsSync(candidate)) ?? null
  );
}

it("builds a save-valid, ledger-balanced Phase 20 P5 browser world", () => {
  const world = phase20DismantleBrowserWorld();
  const restored = new Simulation(fixture).load(world.save);
  expect(restored.ok, restored.message).toBe(true);
  expect(auditLedger(fixture, world.save).mismatches).toEqual([]);
  expect(world.save.pressureLines["32,30"]).toMatchObject({
    materialId: "gas-0",
    quantity: 1,
  });
  expect(world.save.machines[world.childId]?.enabled).toBe(false);
});

async function waitForHttp(url: string, timeoutMs = 60000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error("HTTP " + response.status);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw new Error(
    "Player app did not become ready: " +
      (lastError instanceof Error ? lastError.message : "timeout"),
  );
}

async function waitForJson<T>(url: string, timeoutMs = 20000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return (await response.json()) as T;
      lastError = new Error("HTTP " + response.status);
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw new Error(
    "Chrome DevTools endpoint unavailable: " +
      (lastError instanceof Error ? lastError.message : "timeout"),
  );
}

function stop(child: ChildProcess | null): void {
  if (child && !child.killed) child.kill("SIGTERM");
}

browserIt(
  productionBrowser
    ? "accepts the hierarchical build UX in the production export browser"
    : "renders the Phase 10 tools truthfully in a real browser",
  async () => {
    const chrome = chromeExecutable();
    expect(
      chrome,
      "Chrome/Chromium must be available on the CI runner",
    ).toBeTruthy();

    const exportRoot = join(process.cwd(), "apps", "web", "out");
    if (productionBrowser) {
      expect(
        existsSync(join(exportRoot, "index.html")),
        "Production export must be built before browser acceptance",
      ).toBe(true);
    }

    const require = createRequire(import.meta.url);
    const nextBin = require.resolve("next/dist/bin/next");
    const server = productionBrowser
      ? spawn(
          process.execPath,
          [
            join(process.cwd(), "scripts", "serve-static-export.mjs"),
            exportRoot,
            "4010",
          ],
          {
            cwd: process.cwd(),
            env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
            stdio: ["ignore", "pipe", "pipe"],
          },
        )
      : spawn(
          process.execPath,
          [nextBin, "dev", "--hostname", "127.0.0.1", "--port", "4010"],
          {
            cwd: join(process.cwd(), "apps", "web"),
            env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
    let serverLog = "";
    server.stdout?.on("data", (chunk) => {
      serverLog += String(chunk);
    });
    server.stderr?.on("data", (chunk) => {
      serverLog += String(chunk);
    });

    let browser: ChildProcess | null = null;
    try {
      await waitForHttp(appUrl);
      if (productionBrowser) {
        const response = await fetch(appUrl);
        expect(response.headers.get("x-unknown-yield-export")).toBe("static");
      }

      browser = spawn(
        chrome!,
        [
          "--headless=new",
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--remote-debugging-port=" + debugPort,
          "--user-data-dir=" +
            join(tmpdir(), "unknown-yield-browser-" + process.pid),
          "--window-size=1440,1000",
          "about:blank",
        ],
        { stdio: "ignore" },
      );

      const targets = await waitForJson<
        { type: string; webSocketDebuggerUrl?: string }[]
      >("http://127.0.0.1:" + debugPort + "/json/list");
      const page = targets.find((target) => target.type === "page");
      expect(page?.webSocketDebuggerUrl).toBeTruthy();

      const socket = new WebSocket(page!.webSocketDebuggerUrl!);
      await new Promise<void>((resolve, reject) => {
        socket.addEventListener("open", () => resolve(), { once: true });
        socket.addEventListener(
          "error",
          () => reject(new Error("CDP socket failed")),
          {
            once: true,
          },
        );
      });

      type CdpResult = {
        exceptionDetails?: {
          exception?: { description?: string };
          text?: string;
        };
        result?: { value?: unknown };
      };

      const runtimeErrors: string[] = [];
      let sequence = 0;
      const pending = new Map<
        number,
        {
          resolve: (value: CdpResult) => void;
          reject: (error: Error) => void;
          timer: ReturnType<typeof setTimeout>;
        }
      >();

      socket.addEventListener("message", (event) => {
        const message = JSON.parse(String(event.data)) as {
          id?: number;
          error?: unknown;
          result?: CdpResult;
          method?: string;
          params?: {
            exceptionDetails?: {
              text?: string;
              exception?: { description?: string };
            };
          };
        };
        if (message.method === "Runtime.exceptionThrown") {
          const detail = message.params?.exceptionDetails;
          runtimeErrors.push(
            detail?.exception?.description ??
              detail?.text ??
              "Unspecified JS exception",
          );
          return;
        }
        if (!message.id || !pending.has(message.id)) return;
        const waiter = pending.get(message.id)!;
        clearTimeout(waiter.timer);
        pending.delete(message.id);
        if (message.error)
          waiter.reject(new Error(JSON.stringify(message.error)));
        else waiter.resolve(message.result ?? {});
      });

      const call = (method: string, params: Record<string, unknown> = {}) =>
        new Promise<CdpResult>((resolve, reject) => {
          const id = ++sequence;
          const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error("CDP timeout: " + method));
          }, 10000);
          pending.set(id, { resolve, reject, timer });
          socket.send(JSON.stringify({ id, method, params }));
        });

      const evaluate = async <T>(expression: string): Promise<T> => {
        const response = await call("Runtime.evaluate", {
          expression,
          awaitPromise: true,
          returnByValue: true,
        });
        if (response.exceptionDetails)
          throw new Error(
            response.exceptionDetails.exception?.description ??
              response.exceptionDetails.text ??
              "Browser evaluation failed",
          );
        return response.result?.value as T;
      };

      const waitForExpression = async (
        expression: string,
        timeoutMs = 30000,
      ): Promise<void> => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          if (await evaluate<boolean>(expression)) return;
          await sleep(100);
        }
        throw new Error("Browser condition timed out: " + expression);
      };

      const openBuildGroup = async (identity: string): Promise<void> => {
        await evaluate(`(async () => {
          const entry = [...document.querySelectorAll(
            'nav[aria-label="Build tools"] > .build-group > button',
          )].find(
            (button) =>
              button.getAttribute("aria-label") === ${JSON.stringify(identity)} ||
              button.getAttribute("data-build-group") === ${JSON.stringify(identity)},
          );
          if (!entry) throw new Error("Build group missing: " + ${JSON.stringify(
            identity,
          )});
          entry.dispatchEvent(
            new PointerEvent("pointerdown", {
              bubbles: true,
              composed: true,
              button: 0,
              pointerId: 1,
              pointerType: "mouse",
            }),
          );
          await new Promise((resolve) => setTimeout(resolve, 390));
          entry.dispatchEvent(
            new PointerEvent("pointerup", {
              bubbles: true,
              composed: true,
              button: 0,
              pointerId: 1,
              pointerType: "mouse",
            }),
          );
          return true;
        })()`);
        await waitForExpression(
          `document.querySelector('.build-submenu') !== null`,
        );
      };

      const clickBuildTool = async (
        groupLabel: string,
        toolLabel: string,
      ): Promise<void> => {
        await openBuildGroup(groupLabel);
        await evaluate(`(() => {
          const entry = [...document.querySelectorAll(
            '.build-submenu button',
          )].find((button) => button.getAttribute("aria-label") === ${JSON.stringify(
            toolLabel,
          )});
          if (!entry) throw new Error("Build tool missing: " + ${JSON.stringify(
            toolLabel,
          )});
          entry.click();
          return true;
        })()`);
      };

      const clickCell = async (x: number, y: number): Promise<void> => {
        const point = await evaluate<{ x: number; y: number }>(`(() => {
          const canvas = document.querySelector("canvas");
          if (!canvas) throw new Error("Canvas missing");
          const rect = canvas.getBoundingClientRect();
          const X = 32, Y = 24;
          const projected = window.__UNKNOWN_YIELD_PROJECT_WORLD__?.(
            ((${x} + 0.5) * X),
            ((${y} + 0.5) * Y),
          );
          if (!projected) throw new Error("Camera projection unavailable");
          return {
            x: rect.left + projected.x * rect.width,
            y: rect.top + projected.y * rect.height,
          };
        })()`);
        await call("Input.dispatchMouseEvent", {
          type: "mousePressed",
          x: point.x,
          y: point.y,
          button: "left",
          buttons: 1,
          clickCount: 1,
        });
        await call("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x: point.x,
          y: point.y,
          button: "left",
          buttons: 0,
          clickCount: 1,
        });
      };

      const pressKey = async (
        key: string,
        code: string,
        windowsVirtualKeyCode: number,
      ): Promise<void> => {
        await call("Input.dispatchKeyEvent", {
          type: "keyDown",
          key,
          code,
          windowsVirtualKeyCode,
        });
        await call("Input.dispatchKeyEvent", {
          type: "keyUp",
          key,
          code,
          windowsVirtualKeyCode,
        });
      };

      const holdKey = async (
        key: string,
        code: string,
        windowsVirtualKeyCode: number,
      ): Promise<void> => {
        await call("Input.dispatchKeyEvent", {
          type: "keyDown",
          key,
          code,
          windowsVirtualKeyCode,
        });
        // Wait on the browser event loop, not the Node test process. This
        // guarantees the product's 360 ms hold timer gets its turn before keyup
        // even when the browser main thread is busy under CI.
        await evaluate<void>(
          `new Promise((resolve) => setTimeout(resolve, 500))`,
        );
        await call("Input.dispatchKeyEvent", {
          type: "keyUp",
          key,
          code,
          windowsVirtualKeyCode,
        });
      };

      const pressWithRepeat = async (
        key: string,
        code: string,
        windowsVirtualKeyCode: number,
      ): Promise<void> => {
        await call("Input.dispatchKeyEvent", {
          type: "keyDown",
          key,
          code,
          windowsVirtualKeyCode,
        });
        await call("Input.dispatchKeyEvent", {
          type: "keyDown",
          key,
          code,
          windowsVirtualKeyCode,
          autoRepeat: true,
        });
        await sleep(60);
        await call("Input.dispatchKeyEvent", {
          type: "keyUp",
          key,
          code,
          windowsVirtualKeyCode,
        });
      };

      // Subscribe before first navigation to capture real game exceptions.
      await call("Page.enable");
      await call("Runtime.enable");
      await call("Page.navigate", { url: appUrl });
      await waitForExpression(
        `document.readyState === "complete" &&
          !!document.querySelector("canvas") &&
          !!document.querySelector('nav[aria-label="Build tools"]')`,
      );
      await waitForExpression(
        `document.querySelector('[data-onboarding-beat="camera-build"]')
          ?.textContent?.includes("Read the site before you automate it.") === true`,
      );

      const initialState = await evaluate<{
        canvas: boolean;
        extractorGroup: boolean;
        topLevelEntries: number;
        groupedEntries: number;
        standaloneLabels: Array<string | null>;
        groupShortcuts: Array<string | null>;
      }>(`(() => {
        const toolbar = document.querySelector('nav[aria-label="Build tools"]');
        return {
          canvas: !!document.querySelector("canvas"),
          extractorGroup: !!document.querySelector(
            'nav[aria-label="Build tools"] [data-build-group="acquisition"]',
          ),
          topLevelEntries: toolbar?.children.length ?? 0,
          groupedEntries: toolbar?.querySelectorAll(":scope > .build-group").length ?? 0,
          standaloneLabels: [...(toolbar?.querySelectorAll(":scope > button") ?? [])]
            .map((button) => button.getAttribute("aria-label")),
          groupShortcuts: [...document.querySelectorAll(
            'nav[aria-label="Build tools"] .build-group > button',
          )].map((button) => button.getAttribute("aria-keyshortcuts")),
        };
      })()`);
      expect(initialState.canvas).toBe(true);
      expect(initialState.extractorGroup).toBe(true);
      expect(initialState.topLevelEntries).toBe(10);
      expect(initialState.groupedEntries).toBe(8);
      expect(initialState.standaloneLabels).toEqual(["Inspect", "Dismantle"]);
      expect(initialState.groupShortcuts).toEqual([
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
      ]);

      await evaluate(`(() => {
        document.querySelector('button[aria-label="Close field brief"]')?.click();
        return true;
      })()`);

      await pressKey("5", "Digit5", 53);
      await waitForExpression(
        `document.querySelector('[data-build-group="solid-logistics"]')
          ?.getAttribute("aria-pressed") === "true" &&
          document.querySelector(".build-hint strong")?.textContent === "Belt"`,
      );

      await pressWithRepeat("3", "Digit3", 51);
      await waitForExpression(
        `document.querySelector('[data-build-group="processing"]')
          ?.getAttribute("aria-pressed") === "true" &&
          document.querySelector(".build-submenu") === null &&
          document.querySelector(".build-hint strong")?.textContent === "Crusher"`,
      );

      await holdKey("4", "Digit4", 52);
      await waitForExpression(
        `document.querySelector('[data-build-group="thermal"]')
          ?.getAttribute("aria-expanded") === "true" &&
          document.querySelector('.build-submenu[aria-label="Furnace related tools"]') !== null &&
          document.querySelector('.build-submenu button[aria-label="Sealed furnace"]')
            ?.getAttribute("aria-keyshortcuts") === "2"`,
      );

      await pressKey("1", "Digit1", 49);
      await waitForExpression(
        `document.querySelector(".build-submenu") === null &&
          document.querySelector('[data-build-group="thermal"]')
            ?.getAttribute("aria-pressed") === "true" &&
          document.querySelector('[data-build-group="acquisition"]')
            ?.getAttribute("aria-pressed") !== "true" &&
          document.querySelector(".build-hint strong")?.textContent === "Furnace"`,
      );

      await holdKey("4", "Digit4", 52);
      await waitForExpression(
        `document.querySelector('.build-submenu[aria-label="Furnace related tools"]') !== null`,
      );
      await pressKey("7", "Digit7", 55);
      await sleep(80);
      expect(
        await evaluate<boolean>(
          `document.querySelector('.build-submenu[aria-label="Furnace related tools"]') !== null &&
            document.querySelector('button[aria-label="Pressure line group"]')
              ?.getAttribute("aria-pressed") !== "true"`,
        ),
      ).toBe(true);

      await pressKey("Escape", "Escape", 27);
      await waitForExpression(
        `document.querySelector(".build-submenu") === null &&
          document.querySelector(".build-hint strong")?.textContent === "Furnace"`,
      );
      await pressKey("Escape", "Escape", 27);
      await waitForExpression(`document.querySelector(".build-hint") === null`);

      const submenuState = async (
        groupLabel: string,
        labels: string[],
      ): Promise<Record<string, string | null>> => {
        await openBuildGroup(groupLabel);
        return evaluate<Record<string, string | null>>(`(() => {
          const wanted = ${JSON.stringify(labels)};
          return Object.fromEntries(
            wanted.map((label) => {
              const entry = [...document.querySelectorAll(".build-submenu button")]
                .find((button) => button.getAttribute("aria-label") === label);
              return [label, entry?.getAttribute("aria-disabled") ?? null];
            }),
          );
        })()`);
      };

      expect(
        await submenuState("acquisition", [
          "Deep extractor",
          "Atmospheric intake",
        ]),
      ).toEqual({
        "Deep extractor": "true",
        "Atmospheric intake": "true",
      });
      expect(await submenuState("processing", ["Sinterer"])).toEqual({
        Sinterer: "false",
      });
      expect(await submenuState("thermal", ["Relief furnace"])).toEqual({
        "Relief furnace": "true",
      });
      expect(
        await submenuState("solid-logistics", [
          "Underground belt",
          "Elevated gantry",
        ]),
      ).toEqual({
        "Underground belt": "false",
        "Elevated gantry": "false",
      });

      await clickBuildTool("solid-logistics", "Underground belt");
      await waitForExpression(
        `document.querySelector('[data-build-group="solid-logistics"]')
          ?.getAttribute("aria-pressed") === "true" &&
          document.querySelector(".build-hint strong")?.textContent === "Underground belt"`,
      );

      await clickBuildTool("solid-logistics", "Elevated gantry");
      await waitForExpression(
        `document.querySelector('[data-build-group="solid-logistics"]')
          ?.getAttribute("aria-pressed") === "true" &&
          document.querySelector(".build-hint strong")?.textContent === "Elevated gantry"`,
      );

      await clickBuildTool("acquisition", "Deep extractor");
      await waitForExpression(
        `document.querySelector('[role="status"].toast.error')
          ?.textContent.includes("confirmed Heat result") === true`,
      );

      await clickBuildTool("processing", "Sinterer");
      await waitForExpression(
        `document.querySelector('[data-build-group="processing"]')
          ?.getAttribute("aria-pressed") === "true"`,
      );
      await waitForExpression(
        `document.querySelector(".build-hint strong")?.textContent === "Sinterer"`,
      );
      await waitForExpression(
        `document.querySelector(".build-hint")?.textContent
          ?.includes("Research-grade coolant") === true`,
      );

      await evaluate(`(() => {
        document.querySelector('button[aria-label="Knowledge notebook"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.body.textContent?.includes("FIELD NOTEBOOK") === true &&
          document.body.textContent?.includes("Material findings") === true &&
          document.body.textContent?.includes("Ferrite rubble") === true &&
          document.body.textContent?.includes("Veined ore") === true &&
          document.body.textContent?.includes("Catalytic stone") === true`,
      );
      const initialNotebook = await evaluate<string>(
        `document.querySelector(".context-panel")?.textContent ?? ""`,
      );
      expect(initialNotebook).toContain("OPEN BRANCH");
      expect(initialNotebook).not.toContain("Magnetic ceramic");
      expect(initialNotebook).not.toContain("Catalyst powder");
      expect(initialNotebook).toContain("EVIDENCE STATUS");
      await evaluate(`(() => {
        [...document.querySelectorAll('nav[aria-label="Notebook filters"] button')]
          .find((button) => button.textContent === "Open")
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `[...document.querySelectorAll('nav[aria-label="Notebook filters"] button')]
          .find((button) => button.textContent === "Open")
          ?.getAttribute("aria-pressed") === "true"`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Knowledge notebook"]')?.click();
        document.querySelector('button[aria-label="Company terminal"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.body.textContent?.includes("COMPANY TERMINAL") === true &&
          !!document.querySelector(".context-overview") &&
          !!document.querySelector('nav[aria-label="Terminal sections"]') &&
          !!document.querySelector("#terminal-shipment") &&
          !!document.querySelector("#terminal-company")`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Company terminal"]')?.click();
        return true;
      })()`);

      await clickBuildTool("solid-logistics", "Belt");
      await clickCell(15, 18);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Belt path built") === true`,
      );
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Belt path built") !== true`,
        8000,
      );
      const beltRoutePixels = await evaluate<{
        start: { x: number; y: number };
        end: { x: number; y: number };
      }>(
        `(() => {
          const rect = document.querySelector("canvas").getBoundingClientRect();
          const project = (x, y) => {
            const point = window.__UNKNOWN_YIELD_PROJECT_WORLD__((x + .5) * 32, (y + .5) * 24);
            return { x: rect.left + point.x * rect.width, y: rect.top + point.y * rect.height };
          };
          return { start: project(15, 18), end: project(17, 18) };
        })()`,
      );
      await call("Input.dispatchMouseEvent", {
        type: "mousePressed",
        ...beltRoutePixels.start,
        button: "left",
        buttons: 1,
        clickCount: 1,
      });
      await call("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        ...beltRoutePixels.end,
        button: "left",
        buttons: 1,
      });
      await sleep(100);
      const beltPreviewScreenshot = await call("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
      });
      const beltPreviewBytes = Buffer.from(
        (beltPreviewScreenshot as unknown as { data: string }).data,
        "base64",
      );
      const beltPreviewSha256 = createHash("sha256")
        .update(beltPreviewBytes)
        .digest("hex");
      const evidenceDirectory = process.env.UNKNOWN_YIELD_EVIDENCE_DIR;
      if (evidenceDirectory) {
        mkdirSync(evidenceDirectory, { recursive: true });
        writeFileSync(
          join(evidenceDirectory, "belt-gap-preview.png"),
          beltPreviewBytes,
        );
      }
      await call("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        ...beltRoutePixels.end,
        button: "left",
        buttons: 0,
        clickCount: 1,
      });
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Belt path built") === true`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Game menu"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `[...document.querySelectorAll("button")]
          .some((button) => button.textContent?.includes("Save world"))`,
      );
      await evaluate(`(() => {
        [...document.querySelectorAll("button")]
          .find((button) => button.textContent?.includes("Save world"))
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Field record saved on this device") === true`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Game menu"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `[...document.querySelectorAll("button")]
          .some((button) => button.textContent?.includes("Save world")) === false`,
      );
      const beltGapSave = await evaluate<{
        belts: Array<{ id: string; x: number; y: number; direction: number }>;
        plates: number;
      }>(`(() => {
        const save = JSON.parse(localStorage.getItem("industrial-site-save-v15"));
        return {
          belts: Object.values(save.belts).filter((belt) => belt.y === 18 && belt.x >= 15 && belt.x <= 17),
          plates: save.stock.plates,
        };
      })()`);
      expect(beltGapSave.belts).toHaveLength(3);
      expect(beltGapSave.belts.map((belt) => belt.x).sort()).toEqual([
        15, 16, 17,
      ]);
      expect(new Set(beltGapSave.belts.map((belt) => belt.id)).size).toBe(3);
      expect(beltGapSave.belts.every((belt) => belt.direction === 0)).toBe(
        true,
      );
      expect(beltGapSave.plates).toBe(597);
      console.log(
        "PHASE20_BELT_GAP_BROWSER_EVIDENCE " +
          JSON.stringify({
            mode: browserAcceptanceMode,
            scenario:
              "reuse one existing start belt and build two new cells in production browser",
            reusedCell: { x: 15, y: 18 },
            addedCells: [
              { x: 16, y: 18 },
              { x: 17, y: 18 },
            ],
            savedBelts: beltGapSave.belts,
            remainingPlates: beltGapSave.plates,
            previewScreenshot: {
              bytes: beltPreviewBytes.length,
              sha256: beltPreviewSha256,
              retained: Boolean(evidenceDirectory),
            },
          }),
      );

      // P6: exercise actual production canvas sampling and compact keyboard-area
      // review before the next fixture replaces this site. No source inventory,
      // physical contents or construction truth may be cloned by pipette.
      const sampleId = beltGapSave.belts.find((belt) => belt.x === 15)!.id;
      const sampleStateBefore = await evaluate<string>(
        `window.__UNKNOWN_YIELD_SIMULATION__?.dismantleFingerprint([${JSON.stringify(sampleId)}])`,
      );
      await pressKey("Escape", "Escape", 27);
      await clickCell(15, 18);
      await waitForExpression(
        `document.querySelector('[data-testid="sample-selected-tool"]')?.disabled === false`,
      );
      await evaluate(`document.querySelector('[data-testid="sample-selected-tool"]')?.click()`);
      await waitForExpression(
        `document.querySelector(".build-hint strong")?.textContent === "Belt"`,
      );
      await clickBuildTool("processing", "Crusher");
      await waitForExpression(
        `document.querySelector(".build-hint strong")?.textContent === "Crusher"`,
      );
      await call("Input.dispatchMouseEvent", {
        type: "mousePressed",
        ...beltRoutePixels.start,
        button: "left",
        buttons: 1,
        modifiers: 1,
        clickCount: 1,
      });
      await call("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        ...beltRoutePixels.start,
        button: "left",
        buttons: 0,
        modifiers: 1,
        clickCount: 1,
      });
      await waitForExpression(
        `document.querySelector(".build-hint strong")?.textContent === "Belt"`,
      );
      const sampleStateAfter = await evaluate<string>(
        `window.__UNKNOWN_YIELD_SIMULATION__?.dismantleFingerprint([${JSON.stringify(sampleId)}])`,
      );
      expect(sampleStateAfter).toBe(sampleStateBefore);
      console.log("PHASE20_P6_SAMPLE_BROWSER_EVIDENCE " + JSON.stringify({
        selectedButton: true, altClick: true, sampledTool: "belt",
        unchangedStructureFingerprint: sampleStateBefore === sampleStateAfter,
      }));

      await pressKey("Escape", "Escape", 27);
      await clickCell(15, 18);
      await pressKey("x", "KeyX", 88);
      await waitForExpression(
        `document.querySelector('[data-testid="dismantle-mode-area-all"]') !== null`,
      );
      await evaluate(`(() => {
        document.querySelector('[data-testid="dismantle-mode-area-all"]')?.click();
        document.querySelector('[data-testid="keyboard-area-toggle"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[data-testid="keyboard-area-form"]') !== null`,
      );
      await evaluate(`(() => {
        const form = document.querySelector('[data-testid="keyboard-area-form"]');
        [...form.querySelectorAll('button')].find(b =>
          b.textContent?.includes('Use selected bounds'))?.click();
        return true;
      })()`);
      await waitForExpression(
        `(() => {
          const fields = [...document.querySelectorAll('[data-testid="keyboard-area-form"] input')];
          return fields.length === 4 &&
            fields.map(field => Number(field.value)).join(',') === '15,18,15,18';
        })()`,
      );
      await evaluate(`(() => {
        const form = document.querySelector('[data-testid="keyboard-area-form"]');
        form.querySelector('button[type="submit"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[data-testid="dismantle-review"]') !== null`,
      );
      expect(await evaluate<string>(
        `document.querySelector('[data-testid="dismantle-review"]')?.textContent ?? ""`,
      )).toContain("Review dismantling");
      await pressKey("Escape", "Escape", 27);
      await waitForExpression(
        `document.querySelector('[data-testid="dismantle-review"]') === null`,
      );
      expect(await evaluate<string>(
        `window.__UNKNOWN_YIELD_SIMULATION__?.dismantleFingerprint([${JSON.stringify(sampleId)}])`,
      )).toBe(sampleStateBefore);
      console.log("PHASE20_P6_KEYBOARD_AREA_BROWSER_EVIDENCE " + JSON.stringify({
        areaFromSelectedBounds: "15,18→15,18",
        realWorldPreflight: true, cancelledWithoutMutation: true,
      }));

      const p2Seed = phase20FlowBrowserWorld();
      await evaluate(
        `localStorage.setItem("industrial-site-save-v15", ${JSON.stringify(
          JSON.stringify(p2Seed),
        )})`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Game menu"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `[...document.querySelectorAll("button")]
          .some((button) => button.textContent?.includes("Load saved world"))`,
      );
      await evaluate(`(() => {
        [...document.querySelectorAll("button")]
          .find((button) => button.textContent?.includes("Load saved world"))
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Site restored") === true`,
      );
      await clickBuildTool("solid-logistics", "Belt");
      await waitForExpression(
        `document.querySelector(".build-hint")?.textContent
          ?.includes("On an L turn, R switches the corner order") === true`,
      );
      const p2RoutePixels = await evaluate<{
        start: { x: number; y: number };
        end: { x: number; y: number };
      }>(`(() => {
        const rect = document.querySelector("canvas").getBoundingClientRect();
        const project = (x, y) => {
          const point = window.__UNKNOWN_YIELD_PROJECT_WORLD__((x + .5) * 32, (y + .5) * 24);
          return { x: rect.left + point.x * rect.width, y: rect.top + point.y * rect.height };
        };
        return { start: project(17, 26), end: project(21, 25) };
      })()`);
      await call("Input.dispatchMouseEvent", {
        type: "mousePressed",
        ...p2RoutePixels.start,
        button: "left",
        buttons: 1,
        clickCount: 1,
      });
      await call("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        ...p2RoutePixels.end,
        button: "left",
        buttons: 1,
      });
      await sleep(100);
      await pressKey("r", "KeyR", 82);
      await sleep(100);
      const p2Preview = await call("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
      });
      const p2PreviewBytes = Buffer.from(
        (p2Preview as unknown as { data: string }).data,
        "base64",
      );
      const p2PreviewSha256 = createHash("sha256")
        .update(p2PreviewBytes)
        .digest("hex");
      if (evidenceDirectory) {
        mkdirSync(evidenceDirectory, { recursive: true });
        writeFileSync(
          join(evidenceDirectory, "p2-belt-corner-preview.png"),
          p2PreviewBytes,
        );
      }
      await call("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        ...p2RoutePixels.end,
        button: "left",
        buttons: 0,
        clickCount: 1,
      });
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Belt path built") === true`,
      );
      await sleep(5000);
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Game menu"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `[...document.querySelectorAll("button")]
          .some((button) => button.textContent?.includes("Save world"))`,
      );
      await evaluate(`(() => {
        [...document.querySelectorAll("button")]
          .find((button) => button.textContent?.includes("Save world"))
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Field record saved on this device") === true`,
      );
      const p2ProductionSave = await evaluate<{
        belts: Array<{ id: string; x: number; y: number; direction: number }>;
        storages: Record<string, { inventory: Record<string, number> }>;
      }>(`(() => {
        const save = JSON.parse(localStorage.getItem("industrial-site-save-v15"));
        return {
          belts: Object.values(save.belts).filter((belt) =>
            (belt.y === 25 && belt.x >= 17 && belt.x <= 21) ||
            (belt.x === 17 && belt.y === 26)),
          storages: save.storages,
        };
      })()`);
      expect(p2ProductionSave.belts).toHaveLength(6);
      expect(
        p2ProductionSave.belts.find((belt) => belt.x === 17 && belt.y === 26)
          ?.direction,
      ).toBe(3);
      expect(
        p2ProductionSave.belts
          .filter((belt) => belt.y === 25)
          .every((belt) => belt.direction === 0),
      ).toBe(true);
      expect(
        Object.values(
          p2ProductionSave.storages[Object.keys(p2ProductionSave.storages)[0]]
            .inventory,
        ).some((quantity) => quantity > 0),
      ).toBe(true);
      await call("Page.reload", { ignoreCache: true });
      await sleep(900);
      await waitForExpression(
        `document.querySelector("canvas") !== null &&
          document.querySelector('button[aria-label="Game menu"]') !== null`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Game menu"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `[...document.querySelectorAll("button")]
          .some((button) => button.textContent?.includes("Load saved world"))`,
      );
      await evaluate(`(() => {
        [...document.querySelectorAll("button")]
          .find((button) => button.textContent?.includes("Load saved world"))
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Site restored") === true`,
      );
      await clickCell(23, 24);
      await waitForExpression(
        `document.querySelector(".context-panel h2")?.textContent === "Depot"`,
      );
      const loadedDepotText = await evaluate<string>(
        `document.querySelector(".context-panel")?.textContent?.replace(/\\s+/g, " ") ?? ""`,
      );
      expect(loadedDepotText).toMatch(/Stored\s*[1-9]\d*\s*\/\s*40/);
      const p2LoadedScreenshot = await call("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
      });
      const p2LoadedBytes = Buffer.from(
        (p2LoadedScreenshot as unknown as { data: string }).data,
        "base64",
      );
      if (evidenceDirectory) {
        mkdirSync(evidenceDirectory, { recursive: true });
        writeFileSync(
          join(evidenceDirectory, "p2-belt-corner-loaded.png"),
          p2LoadedBytes,
        );
      }
      console.log(
        "PHASE20_P2_BELT_CORNER_BROWSER_EVIDENCE " +
          JSON.stringify({
            mode: browserAcceptanceMode,
            gesture:
              "vertical-first L-corner selected with R during production pointer drag",
            route: p2ProductionSave.belts.sort(
              (a, b) => a.y - b.y || a.x - b.x,
            ),
            depotInventory: Object.values(
              p2ProductionSave.storages[
                Object.keys(p2ProductionSave.storages)[0]
              ].inventory,
            ).reduce((total, quantity) => total + quantity, 0),
            saveReload: "route direction and produced inventory restored",
            previewScreenshot: {
              bytes: p2PreviewBytes.length,
              sha256: p2PreviewSha256,
              retained: Boolean(evidenceDirectory),
            },
            loadedScreenshot: {
              bytes: p2LoadedBytes.length,
              retained: Boolean(evidenceDirectory),
            },
          }),
      );

      if (browserAcceptanceMode === "production-p2") {
        expect(runtimeErrors, runtimeErrors.join("\n")).toEqual([]);
        console.log("PHASE20_P2_BROWSER_RUNTIME_ERRORS []");
        socket.close();
        return;
      }

      const p3Seed = phase20LineReuseBrowserWorld();
      await evaluate(
        `localStorage.setItem("industrial-site-save-v15", ${JSON.stringify(
          JSON.stringify(p3Seed.save),
        )})`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Game menu"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `[...document.querySelectorAll("button")]
          .some((button) => button.textContent?.includes("Load saved world"))`,
      );
      await evaluate(`(() => {
        [...document.querySelectorAll("button")]
          .find((button) => button.textContent?.includes("Load saved world"))
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Site restored") === true`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Close field brief"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('button[aria-label="Close field brief"]') === null`,
      );
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Site restored") !== true`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Pause simulation"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector(".paused-label") !== null`,
      );

      const dragWorldRoute = async (
        start: { x: number; y: number },
        end: { x: number; y: number },
      ) => {
        const pixels = await evaluate<{
          start: { x: number; y: number };
          end: { x: number; y: number };
        }>(`(() => {
          const rect = document.querySelector("canvas").getBoundingClientRect();
          const project = (x, y) => {
            const point = window.__UNKNOWN_YIELD_PROJECT_WORLD__((x + .5) * 32, (y + .5) * 24);
            return { x: rect.left + point.x * rect.width, y: rect.top + point.y * rect.height };
          };
          return { start: project(${start.x}, ${start.y}), end: project(${end.x}, ${end.y}) };
        })()`);
        await call("Input.dispatchMouseEvent", {
          type: "mousePressed",
          ...pixels.start,
          button: "left",
          buttons: 1,
          clickCount: 1,
        });
        await call("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          ...pixels.end,
          button: "left",
          buttons: 1,
        });
        await sleep(140);
        return pixels;
      };
      const captureP3Preview = async (name: string) => {
        const screenshot = await call("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: false,
        });
        const bytes = Buffer.from(
          (screenshot as unknown as { data: string }).data,
          "base64",
        );
        const sha256 = createHash("sha256").update(bytes).digest("hex");
        if (evidenceDirectory) {
          mkdirSync(evidenceDirectory, { recursive: true });
          writeFileSync(join(evidenceDirectory, name), bytes);
        }
        return {
          bytes: bytes.length,
          sha256,
          retained: Boolean(evidenceDirectory),
        };
      };
      const releaseRoute = async (point: { x: number; y: number }) =>
        call("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          ...point,
          button: "left",
          buttons: 0,
          clickCount: 1,
        });
      const dragWorldArea = async (
        start: { x: number; y: number },
        end: { x: number; y: number },
      ) => {
        const pixels = await dragWorldRoute(start, end);
        await releaseRoute(pixels.end);
        return pixels;
      };
      const captureP5Screenshot = async (name: string) => {
        const screenshot = await call("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: false,
        });
        const bytes = Buffer.from(
          (screenshot as unknown as { data: string }).data,
          "base64",
        );
        const sha256 = createHash("sha256").update(bytes).digest("hex");
        if (evidenceDirectory) {
          mkdirSync(evidenceDirectory, { recursive: true });
          writeFileSync(join(evidenceDirectory, name), bytes);
        }
        return { bytes: bytes.length, sha256, retained: Boolean(evidenceDirectory) };
      };
      const saveLoadedWorld = async () => {
        await evaluate(`(() => {
          document.querySelector('button[aria-label="Game menu"]')?.click();
          return true;
        })()`);
        await waitForExpression(
          `[...document.querySelectorAll("button")]
            .some((button) => button.textContent?.includes("Save world"))`,
        );
        await evaluate(`(() => {
          [...document.querySelectorAll("button")]
            .find((button) => button.textContent?.includes("Save world"))
            ?.click();
          return true;
        })()`);
        await waitForExpression(
          `document.querySelector('[role="status"]')
            ?.textContent.includes("Field record saved on this device") === true`,
        );
        await evaluate(`(() => {
          document.querySelector('button[aria-label="Game menu"]')?.click();
          return true;
        })()`);
      };

      await clickBuildTool("liquid-logistics", "Directed pipe");
      const pipePixels = await dragWorldRoute(
        { x: 30, y: 20 },
        { x: 34, y: 20 },
      );
      const pipePreview = await captureP3Preview("p3-pipe-gap-preview.png");
      await releaseRoute(pipePixels.end);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Pipes placed") === true`,
      );
      await saveLoadedWorld();
      const pipeSave = await evaluate<{
        nextId: number;
        stock: Record<string, number>;
        pipes: Record<
          string,
          {
            id: string;
            x: number;
            y: number;
            inlet: number;
            outlet: number;
            quantity: number;
            materialId: string | null;
            containmentProfileId: string;
          }
        >;
      }>(`JSON.parse(localStorage.getItem("industrial-site-save-v15"))`);
      const pipeSegments = Object.values(pipeSave.pipes)
          .filter((pipe) => pipe.y === 20 && pipe.x >= 30 && pipe.x <= 34)
          .sort((a, b) => a.x - b.x),
        pipeCost =
          fixture.liquidLogistics!.pipe.cost +
          fixture.liquidLogistics!.containmentProfiles.find(
            (profile) => profile.id === p3Seed.profile,
          )!.additionalCost.pipe;
      expect(pipeSegments).toHaveLength(5);
      expect([30, 32, 34].map((x) => pipeSave.pipes[`${x},20`].id)).toEqual(
        p3Seed.existingPipeIds,
      );
      expect(
        pipeSegments.filter((pipe) => pipe.x === 31 || pipe.x === 33),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            x: 31,
            inlet: 2,
            outlet: 0,
            quantity: 0,
            materialId: null,
          }),
          expect.objectContaining({
            x: 33,
            inlet: 2,
            outlet: 0,
            quantity: 0,
            materialId: null,
          }),
        ]),
      );
      expect(pipeSave.stock.plates).toBe(
        p3Seed.save.stock.plates - 2 * pipeCost,
      );

      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Field record saved on this device") !== true`,
      );
      await clickBuildTool("gas-logistics", "Pressure line");
      const gasPixels = await dragWorldRoute(
        { x: 30, y: 22 },
        { x: 34, y: 22 },
      );
      const gasPreview = await captureP3Preview("p3-gas-gap-preview.png");
      await releaseRoute(gasPixels.end);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Pressure lines placed") === true`,
      );
      await saveLoadedWorld();
      const gasSave = await evaluate<{
          nextId: number;
          stock: Record<string, number>;
          pressureLines: Record<
            string,
            {
              id: string;
              x: number;
              y: number;
              inlet: number;
              outlet: number;
              quantity: number;
              materialId: string | null;
            }
          >;
        }>(`JSON.parse(localStorage.getItem("industrial-site-save-v15"))`),
        gasSaveBytes = await evaluate<string>(
          `localStorage.getItem("industrial-site-save-v15")`,
        ),
        gasSegments = Object.values(gasSave.pressureLines)
          .filter((line) => line.y === 22 && line.x >= 30 && line.x <= 34)
          .sort((a, b) => a.x - b.x),
        gasCost = fixture.gasLogistics!.line.cost;
      expect(gasSegments).toHaveLength(5);
      expect(
        [30, 32, 34].map((x) => gasSave.pressureLines[`${x},22`].id),
      ).toEqual(p3Seed.existingPressureIds);
      expect(gasSave.stock.plates).toBe(pipeSave.stock.plates - 2 * gasCost);

      await clickBuildTool("liquid-logistics", "Directed pipe");
      const repeatedPipePixels = await dragWorldRoute(
        { x: 30, y: 20 },
        { x: 34, y: 20 },
      );
      await releaseRoute(repeatedPipePixels.end);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Pipe path already present") === true`,
      );
      await clickBuildTool("gas-logistics", "Pressure line");
      const repeatedGasPixels = await dragWorldRoute(
        { x: 30, y: 22 },
        { x: 34, y: 22 },
      );
      await releaseRoute(repeatedGasPixels.end);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Pressure line path already present") === true`,
      );
      await saveLoadedWorld();
      const repeatedSaveBytes = await evaluate<string>(
        `localStorage.getItem("industrial-site-save-v15")`,
      );
      expect(repeatedSaveBytes).toBe(gasSaveBytes);
      console.log(
        "PHASE20_P3_DIRECTED_LINE_BROWSER_EVIDENCE " +
          JSON.stringify({
            mode: browserAcceptanceMode,
            controls: "normal production-browser pointer drags and save menu",
            pipe: {
              reusedIds: p3Seed.existingPipeIds,
              added: pipeSegments.filter(
                (pipe) => pipe.x === 31 || pipe.x === 33,
              ),
              newOnlyCost: 2 * pipeCost,
              preview: pipePreview,
            },
            pressureLine: {
              reusedIds: p3Seed.existingPressureIds,
              added: gasSegments.filter(
                (line) => line.x === 31 || line.x === 33,
              ),
              newOnlyCost: 2 * gasCost,
              preview: gasPreview,
            },
            repeatedReuseSaveBytesIdentical: true,
          }),
      );

      const p5Seed = phase20DismantleBrowserWorld();
      await evaluate(
        `localStorage.setItem("industrial-site-save-v15", ${JSON.stringify(
          JSON.stringify(p5Seed.save),
        )})`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Game menu"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `[...document.querySelectorAll("button")].some((button) => button.textContent?.includes("Load saved world"))`,
      );
      await evaluate(`(() => {
        [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Load saved world"))?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[role="status"]')?.textContent.includes("Site restored") === true`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Close field brief"]')?.click();
        return true;
      })()`);
      await waitForExpression(`document.querySelector('button[aria-label="Close field brief"]') === null`);
      const p5Paused = await evaluate<boolean>(`document.querySelector(".paused-label") !== null`);
      if (!p5Paused)
        await evaluate(`document.querySelector('button[aria-label="Pause simulation"]')?.click()`);
      await waitForExpression(`document.querySelector(".paused-label") !== null`);

      const dismantleButton = await evaluate<boolean>(`(() => {
        const button = [...document.querySelectorAll('nav[aria-label="Build tools"] button')]
          .find((entry) => entry.getAttribute("aria-label") === "Dismantle");
        button?.click();
        return button !== undefined;
      })()`);
      expect(dismantleButton).toBe(true);
      await waitForExpression(`document.querySelector('[data-testid="dismantle-mode-single"]')?.getAttribute("aria-pressed") === "true"`);
      const singleClickPoint = await evaluate<{ x: number; y: number; rect: { left: number; top: number; right: number; bottom: number }; target: { tag: string; className: string; aria: string | null } | null }>(`(() => { const canvas = document.querySelector("canvas"), rect = canvas.getBoundingClientRect(), projected = window.__UNKNOWN_YIELD_PROJECT_WORLD__((39.5) * 32, (30.5) * 24), x = rect.left + projected.x * rect.width, y = rect.top + projected.y * rect.height, target = document.elementFromPoint(x,y); return {x,y,rect:{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom},target:target ? {tag:target.tagName,className:target.className,aria:target.getAttribute("aria-label")} : null}; })()`);
      expect(singleClickPoint.x).toBeGreaterThan(singleClickPoint.rect.left);
      expect(singleClickPoint.x).toBeLessThan(singleClickPoint.rect.right);
      expect(singleClickPoint.y).toBeGreaterThan(singleClickPoint.rect.top);
      expect(singleClickPoint.y).toBeLessThan(singleClickPoint.rect.bottom);
      expect(singleClickPoint.target?.tag).toBe("CANVAS");
      await clickCell(39, 30);
      await sleep(400);
      const singleClickStatus = await evaluate<string>(`[...document.querySelectorAll('[role="status"]')].map((entry) => entry.textContent ?? "").join(" | ")`);
      const singleClickScreenshot = await captureP5Screenshot("p5-single-default-click.png");
      await saveLoadedWorld();
      const p5AfterSingle = await evaluate<Save>(`JSON.parse(localStorage.getItem("industrial-site-save-v15"))`);
      console.log("PHASE20_P5_SINGLE_CLICK_DIAGNOSTIC " + JSON.stringify({ singleClickPoint, singleClickStatus, savedBelt: p5AfterSingle.belts["39,30"] ?? null, remainingAdjacentBelt: p5AfterSingle.belts["38,30"] ?? null, screenshot: singleClickScreenshot }));
      expect(p5AfterSingle.belts["39,30"]).toBeUndefined();
      expect(singleClickStatus).toContain("Belt and cargo reclaimed");
      expect(p5AfterSingle.belts["38,30"]).toBeDefined();

      const chooseMode = async (modeId: string) => {
        await evaluate<boolean>(`(() => {
          const button = document.querySelector('[data-testid="dismantle-mode-${modeId}"]');
          if (!button) throw new Error("Dismantle mode missing: ${modeId}");
          button.click();
          return true;
        })()`);
        await waitForExpression(`document.querySelector('[data-testid="dismantle-mode-${modeId}"]')?.getAttribute("aria-pressed") === "true"`);
      };
      const reviewCounts = async () => evaluate<Record<string, number>>(`(() => {
        const root = document.querySelector('[data-testid="dismantle-review"]');
        if (!root) throw new Error("Dismantle review did not open");
        return Object.fromEntries([...root.querySelectorAll(".dismantle-review-counts > div")]
          .map((entry) => [entry.querySelector("dt")?.textContent ?? "", Number(entry.querySelector("dd")?.textContent ?? 0)]));
      })()`);
      const cancelDismantleReview = async (keyboard = false) => {
        if (keyboard) await pressKey("Escape", "Escape", 27);
        else await evaluate<boolean>(`(() => {
          document.querySelector('[data-testid="dismantle-review"] button.secondary')?.click();
          return true;
        })()`);
        await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') === null`);
      };
      const openSelectedFactory = async () => {
        await evaluate<boolean>(`(() => {
          if ([...document.querySelectorAll("button")]
            .some((entry) => entry.textContent?.includes("Close roof"))) return true;
          const button = [...document.querySelectorAll("button")]
            .find((entry) => entry.textContent?.includes("Open interior"));
          if (!button) throw new Error("Selected factory's open-interior control is missing. Panel: " +
            (document.querySelector(".context-panel")?.innerText ?? "none") +
            "; buttons: " + [...document.querySelectorAll("button")].map((entry) => entry.innerText).join(" | "));
          button.click();
          return true;
        })()`);
        await waitForExpression(`[...document.querySelectorAll("button")].some((button) => button.textContent?.includes("Close roof"))`);
      };
      await chooseMode("area-all");
      await dragWorldArea({ x: 30, y: 30 }, { x: 32, y: 30 });
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') !== null`);
      const cancelCounts = await reviewCounts();
      expect(cancelCounts).toEqual({
        "Will be removed": 2,
        "Blocked · kept in place": 1,
        "Ignored · outside filter or protected": 0,
      });
      const beforeCancelSave = await evaluate<string>(`localStorage.getItem("industrial-site-save-v15")`);
      const cancelScreenshot = await captureP5Screenshot("p5-area-cancel-review.png");
      const cancelPoint = await evaluate<{ x: number; y: number }>(`(() => { const r = document.querySelector('[data-testid="dismantle-review"]').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
      await call("Input.dispatchMouseEvent", { type: "mousePressed", ...cancelPoint, button: "right", buttons: 2 });
      await call("Input.dispatchMouseEvent", { type: "mouseReleased", ...cancelPoint, button: "right", buttons: 0 });
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') === null`);
      await saveLoadedWorld();
      expect(await evaluate<string>(`localStorage.getItem("industrial-site-save-v15")`)).toBe(beforeCancelSave);

      await dragWorldArea({ x: 30, y: 30 }, { x: 32, y: 30 });
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') !== null`);
      const partialScreenshot = await captureP5Screenshot("p5-area-blocked-review.png");
      const preflightText = await evaluate<string>(`document.querySelector('[data-testid="dismantle-review"]')?.innerText ?? ""`);
      expect(preflightText).toContain("Blocked · kept in place");
      expect(preflightText).toContain("Cargo plates recovered");
      await evaluate<boolean>(`(() => {
        const button = document.querySelector('[data-testid="dismantle-review"] button.danger');
        if (!button || button.hasAttribute("disabled")) throw new Error("Partial removal must be explicitly confirmable");
        button.click();
        return true;
      })()`);
      await waitForExpression(`document.querySelector('[role="status"]')?.textContent.includes("Removed 2") === true`);
      await saveLoadedWorld();
      const p5AfterPartial = await evaluate<Save>(`JSON.parse(localStorage.getItem("industrial-site-save-v15"))`);
      expect(p5AfterPartial.belts["30,30"]).toBeUndefined();
      expect(p5AfterPartial.belts["31,30"]).toBeUndefined();
      expect(p5AfterPartial.pressureLines["32,30"]).toMatchObject({
        id: p5Seed.save.pressureLines["32,30"].id,
        materialId: "gas-0",
        quantity: 1,
      });
      expect(auditLedger(fixture, p5AfterPartial).mismatches).toEqual([]);

      await evaluate<boolean>(`(() => { [...document.querySelectorAll('nav[aria-label="Build tools"] button')].find((button) => button.getAttribute("aria-label") === "Inspect")?.click(); return true; })()`);
      await clickCell(25, 20);
      await waitForExpression(`document.querySelector('.context-panel') !== null`);
      const exactFactoryInspector = await evaluate<string>(`document.querySelector('.context-panel')?.innerText ?? ""`);
      expect(exactFactoryInspector).toContain("Factory 25");
      await openSelectedFactory();
      await clickCell(40, 30);
      await waitForExpression(`document.querySelector('.context-panel') !== null`);
      const familyFactoryInspector = await evaluate<string>(`document.querySelector('.context-panel')?.innerText ?? ""`);
      expect(familyFactoryInspector).toContain("Factory");
      await openSelectedFactory();
      await evaluate<boolean>(`(() => { [...document.querySelectorAll('nav[aria-label="Build tools"] button')].find((button) => button.getAttribute("aria-label") === "Dismantle")?.click(); return true; })()`);
      await chooseMode("area-exact");
      await dragWorldArea({ x: 26, y: 21 }, { x: 36, y: 24 });
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') !== null`);
      const exactCounts = await reviewCounts();
      const exactReviewText = await evaluate<string>(`document.querySelector('[data-testid="dismantle-review"]')?.innerText ?? ""`);
      const exactScreenshot = await captureP5Screenshot("p5-area-exact-type-review.png");
      console.log("PHASE20_P5_EXACT_FILTER_DIAGNOSTIC " + JSON.stringify({ exactFactoryInspector, familyFactoryInspector, exactCounts, exactReviewText, screenshot: exactScreenshot }));
      expect(exactCounts["Will be removed"]).toBe(2);
      expect(exactCounts["Ignored · outside filter or protected"]).toBe(2);
      await evaluate<boolean>(`(() => { document.querySelector('[data-testid="dismantle-review"] button.danger')?.click(); return true; })()`);
      await waitForExpression(`document.querySelector('[role="status"]')?.textContent.includes("Removed 2") === true`);
      await saveLoadedWorld();
      const p5AfterExact = await evaluate<Save>(`JSON.parse(localStorage.getItem("industrial-site-save-v15"))`);
      expect(Object.values(p5AfterExact.machines).filter((machine) => machine.x >= 26 && machine.x <= 36 && machine.y === 21).map((machine) => machine.definitionId)).toEqual(["furnace"]);

      await chooseMode("area-family");
      await dragWorldArea({ x: 30, y: 32 }, { x: 45, y: 31 });
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') !== null`);
      const familyCounts = await reviewCounts();
      expect(familyCounts["Will be removed"]).toBe(3);
      expect(familyCounts["Ignored · outside filter or protected"]).toBe(2);
      await evaluate<boolean>(`(() => { document.querySelector('[data-testid="dismantle-review"] button.danger')?.click(); return true; })()`);
      await waitForExpression(`document.querySelector('[role="status"]')?.textContent.includes("Removed 3") === true`);
      await saveLoadedWorld();
      const p5AfterFamily = await evaluate<Save>(`JSON.parse(localStorage.getItem("industrial-site-save-v15"))`);
      expect(p5AfterFamily.belts["30,32"]).toBeUndefined();
      expect(p5AfterFamily.pipes["31,32"]).toBeUndefined();
      expect(p5AfterFamily.pressureLines["32,32"]).toBeUndefined();
      expect(Object.values(p5AfterFamily.machines).some((machine) => machine.x === 41 && machine.y === 31)).toBe(true);

      await chooseMode("area-exact");
      const deposit = fixture.site.deposits[0];
      const depositAnchor = {
        x: deposit.x + deposit.width - 1,
        y: deposit.y + deposit.height - 1,
      };
      await dragWorldArea(depositAnchor, {
        x: depositAnchor.x + 1,
        y: depositAnchor.y + 1,
      });
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') !== null`);
      const protectedAnchorText = await evaluate<string>(`document.querySelector('[data-testid="dismantle-review"]')?.innerText ?? ""`);
      expect(protectedAnchorText).toContain("Area filter unavailable");
      expect(protectedAnchorText).toContain("Resource deposits cannot be dismantled");
      expect(await evaluate<boolean>(`document.querySelector('[data-testid="dismantle-review"] button.danger')?.hasAttribute("disabled") ?? false`)).toBe(true);
      await cancelDismantleReview(true);

      await chooseMode("area-all");
      await dragWorldArea({ x: 36, y: 30 }, { x: 37, y: 30 });
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') !== null`);
      const forwardCounts = await reviewCounts();
      await cancelDismantleReview();
      await dragWorldArea({ x: 37, y: 30 }, { x: 36, y: 30 });
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') !== null`);
      expect(await reviewCounts()).toEqual(forwardCounts);
      await cancelDismantleReview();
      const beforeReverseSave = await evaluate<string>(`localStorage.getItem("industrial-site-save-v15")`);
      await saveLoadedWorld();
      expect(await evaluate<string>(`localStorage.getItem("industrial-site-save-v15")`)).toBe(beforeReverseSave);

      await dragWorldArea({ x: 40, y: 40 }, { x: 40, y: 40 });
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') !== null`);
      const partialFootprintText = await evaluate<string>(`document.querySelector('[data-testid="dismantle-review"]')?.innerText ?? ""`);
      expect(partialFootprintText).toContain("Include the full structure footprint");
      expect((await reviewCounts())["Ignored · outside filter or protected"]).toBe(1);
      await cancelDismantleReview();

      await dragWorldArea({ x: 43, y: 40 }, { x: 45, y: 40 });
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') !== null`);
      expect((await reviewCounts())["Will be removed"]).toBe(1);
      const routeRows = await evaluate<number>(`document.querySelectorAll('[data-testid="dismantle-review"] .dismantle-review-items li.status-selected').length`);
      expect(routeRows).toBe(1);
      await cancelDismantleReview();

      const panForFactory = await evaluate<{ x: number; y: number }>(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
      await call("Input.dispatchMouseEvent", { type: "mousePressed", ...panForFactory, button: "right", buttons: 2 });
      // A physical leftward drag shifts the camera east toward this factory.
      // Upward movement also brings its full southern footprint off the lower viewport edge.
      await call("Input.dispatchMouseEvent", { type: "mouseMoved", x: panForFactory.x - 500, y: panForFactory.y - 140, button: "right", buttons: 2 });
      await call("Input.dispatchMouseEvent", { type: "mouseReleased", x: panForFactory.x - 500, y: panForFactory.y - 140, button: "right", buttons: 0 });
      await waitForExpression(`(() => {
        const camera = window.__UNKNOWN_YIELD_CAMERA__?.();
        return camera?.target &&
          Math.abs(camera.scrollX - camera.target.scrollX) < 0.05 &&
          Math.abs(camera.scrollY - camera.target.scrollY) < 0.05 &&
          Math.abs(camera.zoom - camera.target.zoom) < 0.0001;
      })()`);
      const closedFactoryPixels = await dragWorldArea({ x: 52, y: 40 }, { x: 57, y: 45 });
      const closedFactoryDiagnostic = await evaluate<Record<string, unknown>>(`(() => {
        const canvas = document.querySelector("canvas"), rect = canvas.getBoundingClientRect();
        const point = (x, y) => {
          const p = window.__UNKNOWN_YIELD_PROJECT_WORLD__((x + .5) * 32, (y + .5) * 24);
          return { x: rect.left + p.x * rect.width, y: rect.top + p.y * rect.height };
        };
        const start = point(52, 40), end = point(57, 45);
        const target = (p) => { const e = document.elementFromPoint(p.x, p.y); return e ? {tag:e.tagName, cls:String(e.className), label:e.getAttribute("aria-label")} : null; };
        return { rect:{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom}, camera:window.__UNKNOWN_YIELD_CAMERA__(), projected:{start,end}, target:{start:target(start),end:target(end)}, review:!!document.querySelector('[data-testid="dismantle-review"]'), status:document.querySelector('[role="status"]')?.innerText };
      })()`);
      console.log("PHASE20_P5_CLOSED_FACTORY_DIAGNOSTIC " + JSON.stringify({ pixels: closedFactoryPixels, ...closedFactoryDiagnostic }));
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') !== null`);
      const closedFactoryCounts = await reviewCounts();
      expect(closedFactoryCounts["Blocked · kept in place"]).toBe(1);
      expect(closedFactoryCounts["Ignored · outside filter or protected"]).toBe(1);
      const closedFactoryScreenshot = await captureP5Screenshot("p5-closed-factory-preview.png");
      await cancelDismantleReview();
      await evaluate<boolean>(`(() => { [...document.querySelectorAll('nav[aria-label="Build tools"] button')].find((button) => button.getAttribute("aria-label") === "Inspect")?.click(); return true; })()`);
      await clickCell(52, 40);
      await waitForExpression(`document.querySelector('.context-panel') !== null`);
      await openSelectedFactory();
      await evaluate<boolean>(`(() => { document.querySelector('.context-panel button[aria-label="Close panel"]')?.click(); return true; })()`);
      await waitForExpression(`document.querySelector('.context-panel') === null`);
      await evaluate<boolean>(`(() => { [...document.querySelectorAll('nav[aria-label="Build tools"] button')].find((button) => button.getAttribute("aria-label") === "Dismantle")?.click(); return true; })()`);
      await chooseMode("area-all");
      await dragWorldArea({ x: 52, y: 40 }, { x: 57, y: 45 });
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') !== null`);
      const openFactoryCounts = await reviewCounts();
      expect(openFactoryCounts["Will be removed"]).toBe(2);
      console.log("PHASE20_P5_OPEN_FACTORY_PREVIEW " + JSON.stringify(openFactoryCounts));
      const openFactoryScreenshot = await captureP5Screenshot("p5-open-factory-preview.png");
      await evaluate<boolean>(`(() => { document.querySelector('[data-testid="dismantle-review"] button.danger')?.click(); return true; })()`);
      await waitForExpression(`document.querySelector('[role="status"]')?.textContent.includes("Removed 2") === true`);
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') === null && document.querySelector('.context-panel') === null`);
      await saveLoadedWorld();
      const p5AfterFactory = await evaluate<Save>(`JSON.parse(localStorage.getItem("industrial-site-save-v15"))`);
      expect(p5AfterFactory.factories[p5Seed.factoryId]).toBeUndefined();
      expect(p5AfterFactory.machines[p5Seed.childId]).toBeUndefined();

      const cameraBeforeRightPan = await evaluate<{ scrollX: number; scrollY: number }>(`window.__UNKNOWN_YIELD_CAMERA__()`);
      const panPoint = await evaluate<{ x: number; y: number }>(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
      await call("Input.dispatchMouseEvent", { type: "mousePressed", ...panPoint, button: "right", buttons: 2 });
      await call("Input.dispatchMouseEvent", { type: "mouseMoved", x: panPoint.x + 75, y: panPoint.y + 45, button: "right", buttons: 2 });
      await call("Input.dispatchMouseEvent", { type: "mouseReleased", x: panPoint.x + 75, y: panPoint.y + 45, button: "right", buttons: 0 });
      const cameraAfterRightPan = await evaluate<{ scrollX: number; scrollY: number }>(`window.__UNKNOWN_YIELD_CAMERA__()`);
      expect(Math.hypot(cameraAfterRightPan.scrollX - cameraBeforeRightPan.scrollX, cameraAfterRightPan.scrollY - cameraBeforeRightPan.scrollY)).toBeGreaterThan(0);
      expect(await evaluate<boolean>(`document.querySelector('[data-testid="dismantle-review"]') === null`)).toBe(true);

      await pressKey("x", "KeyX", 88);
      await waitForExpression(`document.querySelector('[data-testid="dismantle-mode-single"]')?.getAttribute("aria-pressed") === "true"`);
      await evaluate<boolean>(`(() => { const button = document.querySelector('[data-testid="dismantle-mode-area-family"]'); button?.focus(); return !!button; })()`);
      await pressKey(" ", "Space", 32);
      await waitForExpression(`document.querySelector('[data-testid="dismantle-mode-area-family"]')?.getAttribute("aria-pressed") === "true"`);
      await evaluate<boolean>(`(() => { document.querySelector('[data-testid="dismantle-mode-area-all"]')?.focus(); return true; })()`);
      await pressKey(" ", "Space", 32);
      await waitForExpression(`document.querySelector('[data-testid="dismantle-mode-area-all"]')?.getAttribute("aria-pressed") === "true"`);
      await dragWorldArea({ x: 38, y: 30 }, { x: 38, y: 30 });
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') !== null`);
      await waitForExpression(`document.activeElement?.matches('[data-testid="dismantle-review"]') === true`);
      const accessibleReviewText = await evaluate<string>(`document.querySelector('[data-testid="dismantle-review"]')?.innerText ?? ""`);
      expect(accessibleReviewText).toContain("Will be removed");
      const reviewItemsLabel = await evaluate<string>(
        `document.querySelector('[data-testid="dismantle-review"] .dismantle-review-items')?.getAttribute("aria-label") ?? ""`,
      );
      expect(reviewItemsLabel).toBe("Selection details");
      const reducedMotionScreenshot = await (async () => {
        await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
        const screenshot = await captureP5Screenshot("p5-reduced-motion-review.png");
        await call("Emulation.setEmulatedMedia", { features: [] });
        return screenshot;
      })();
      await pressKey("Enter", "Enter", 13);
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') === null`);
      await waitForExpression(`document.querySelector('[role="status"]')?.textContent.includes("Removed 1") === true`);
      await saveLoadedWorld();
      const p5AfterKeyboardConfirm = await evaluate<Save>(`JSON.parse(localStorage.getItem("industrial-site-save-v15"))`);
      expect(p5AfterKeyboardConfirm.belts["38,30"]).toBeUndefined();

      await call("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true,
      });
      await call("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 3 });
      await waitForExpression(`window.innerWidth === 390 && window.innerHeight === 844`);
      await call("Page.navigate", { url: appUrl });
      await waitForExpression(
        `document.readyState === "complete" &&
          !!document.querySelector("canvas") &&
          !!document.querySelector('nav[aria-label="Build tools"]')`,
      );
      await evaluate<boolean>(`(() => { document.querySelector('button[aria-label="Game menu"]')?.click(); return true; })()`);
      await waitForExpression(`document.body.textContent?.includes("Expedition controls") === true`);
      await evaluate<boolean>(`(() => { [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Load saved world"))?.click(); return true; })()`);
      await waitForExpression(`document.querySelector('[role="status"]')?.textContent.includes("Site restored") === true`);
      await evaluate<boolean>(`(() => { document.querySelector('nav[aria-label="Build tools"] button[aria-label="Dismantle"]')?.click(); return true; })()`);
      await waitForExpression(`document.querySelector('[data-testid="dismantle-mode-single"]') !== null`);
      await chooseMode("area-all");
      const touchArmVisible = await evaluate<boolean>(`getComputedStyle(document.querySelector('[data-testid="dismantle-touch-arm"]')).display !== "none"`);
      expect(touchArmVisible).toBe(true);
      const sendTouch = (type: string, touchPoints: { x: number; y: number; id: number }[]) =>
        call("Input.dispatchTouchEvent", { type, touchPoints });
      const canvasCenter = await evaluate<{ x: number; y: number }>(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
      const canvasTouchTarget = await evaluate<string>(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.tagName ?? ""; })()`);
      expect(canvasTouchTarget).toBe("CANVAS");
      const cameraBeforeTouchPan = await evaluate<{ scrollX: number; scrollY: number; zoom: number }>(`window.__UNKNOWN_YIELD_CAMERA__()`);
      await sendTouch("touchStart", [{ ...canvasCenter, id: 1 }]);
      await sendTouch("touchMove", [{ x: canvasCenter.x + 56, y: canvasCenter.y + 35, id: 1 }]);
      await sendTouch("touchEnd", []);
      await evaluate<void>(`new Promise((resolve) => setTimeout(resolve, 350))`);
      const cameraAfterTouchPan = await evaluate<{ scrollX: number; scrollY: number; zoom: number }>(`window.__UNKNOWN_YIELD_CAMERA__()`);
      expect(Math.hypot(cameraAfterTouchPan.scrollX - cameraBeforeTouchPan.scrollX, cameraAfterTouchPan.scrollY - cameraBeforeTouchPan.scrollY)).toBeGreaterThan(0);
      expect(await evaluate<boolean>(`document.querySelector('[data-testid="dismantle-review"]') === null`)).toBe(true);

      const center = canvasCenter;
      const cameraBeforePinch = await evaluate<{ zoom: number }>(`window.__UNKNOWN_YIELD_CAMERA__()`);
      await sendTouch("touchStart", [
        { x: center.x - 35, y: center.y, id: 2 },
        { x: center.x + 35, y: center.y, id: 3 },
      ]);
      await sendTouch("touchMove", [
        { x: center.x - 65, y: center.y, id: 2 },
        { x: center.x + 65, y: center.y, id: 3 },
      ]);
      await sendTouch("touchEnd", []);
      await evaluate<void>(`new Promise((resolve) => setTimeout(resolve, 350))`);
      const cameraAfterPinch = await evaluate<{ zoom: number }>(`window.__UNKNOWN_YIELD_CAMERA__()`);
      expect(Math.abs(cameraAfterPinch.zoom - cameraBeforePinch.zoom)).toBeGreaterThan(0.001);
      expect(await evaluate<boolean>(`document.querySelector('[data-testid="dismantle-review"]') === null`)).toBe(true);

      const tapSelector = async (selector: string) => {
        const point = await evaluate<{ x: number; y: number }>(`(() => {
          const selector = ${JSON.stringify(selector)};
          const r = document.querySelector(selector)?.getBoundingClientRect();
          if (!r) throw new Error("Touch target missing: " + selector);
          return {x:r.left+r.width/2,y:r.top+r.height/2};
        })()`);
        await sendTouch("touchStart", [{ ...point, id: 4 }]);
        await sendTouch("touchEnd", []);
      };
      await tapSelector('button[aria-label="Game menu"]');
      await waitForExpression(`document.body.textContent?.includes("Expedition controls") === true`);
      await tapSelector('button[aria-label="Game menu"]');
      await waitForExpression(`document.body.textContent?.includes("Expedition controls") !== true`);
      await evaluate<boolean>(`(() => { document.querySelector('button[aria-label="Center camera"]')?.click(); return true; })()`);
      await sleep(500);

      await tapSelector('[data-testid="dismantle-touch-arm"]');
      await sendTouch("touchStart", [{ ...canvasCenter, id: 5 }]);
      await sendTouch("touchCancel", []);
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') === null`);
      expect(await evaluate<boolean>(`document.querySelector('[data-testid="dismantle-touch-arm"]')?.getAttribute("aria-pressed") !== "true"`)).toBe(true);

      await tapSelector('[data-testid="dismantle-touch-arm"]');
      const canvasEdges = await evaluate<{ start: { x: number; y: number }; outside: { x: number; y: number } }>(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return {start:{x:r.left+r.width/2,y:r.top+r.height/2},outside:{x:r.right+24,y:r.top+r.height/2}}; })()`);
      await sendTouch("touchStart", [{ ...canvasEdges.start, id: 7 }]);
      await sendTouch("touchMove", [{ ...canvasEdges.outside, id: 7 }]);
      await sendTouch("touchEnd", []);
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') === null`);
      expect(await evaluate<boolean>(`document.querySelector('[data-testid="dismantle-touch-arm"]')?.getAttribute("aria-pressed") !== "true"`)).toBe(true);

      const touchCell = async (x: number, y: number) => evaluate<{ x: number; y: number }>(`(() => {
        const canvas = document.querySelector("canvas"), rect = canvas.getBoundingClientRect();
        const projected = window.__UNKNOWN_YIELD_PROJECT_WORLD__(((${x} + .5) * 32), ((${y} + .5) * 24));
        return {x:rect.left+projected.x*rect.width,y:rect.top+projected.y*rect.height};
      })()`);
      // The fixture pair initially sits under the fixed right-edge zoom controls
      // at the phone viewport. Start on the verified canvas center and pan left.
      const cameraBeforeTouchReposition = await evaluate<{ scrollX: number; scrollY: number }>(`window.__UNKNOWN_YIELD_CAMERA__()`);
      await sendTouch("touchStart", [{ ...canvasCenter, id: 8 }]);
      await sendTouch("touchMove", [{ x: canvasCenter.x - 160, y: canvasCenter.y, id: 8 }]);
      await sendTouch("touchEnd", []);
      await evaluate<void>(`new Promise((resolve) => setTimeout(resolve, 350))`);
      const cameraAfterTouchReposition = await evaluate<{ scrollX: number; scrollY: number }>(`window.__UNKNOWN_YIELD_CAMERA__()`);
      expect(Math.hypot(cameraAfterTouchReposition.scrollX - cameraBeforeTouchReposition.scrollX, cameraAfterTouchReposition.scrollY - cameraBeforeTouchReposition.scrollY)).toBeGreaterThan(0);
      const touchStartPoint = await touchCell(36, 30), touchEndPoint = await touchCell(37, 30);
      const touchTargetTags = await evaluate<{ start: string | null; end: string | null }>(`(() => {
        const target = (p) => document.elementFromPoint(p.x,p.y)?.tagName ?? null;
        return {start:target(${JSON.stringify(touchStartPoint)}),end:target(${JSON.stringify(touchEndPoint)})};
      })()`);
      await tapSelector('[data-testid="dismantle-touch-arm"]');
      const mobileTouchBefore = await evaluate<Record<string, unknown>>(`(() => {
        const arm = document.querySelector('[data-testid="dismantle-touch-arm"]');
        const canvas = document.querySelector("canvas"), rect = canvas.getBoundingClientRect();
        const target = (p) => document.elementFromPoint(p.x,p.y)?.tagName ?? null;
        return {armed:arm?.getAttribute("aria-pressed"), viewport:{width:innerWidth,height:innerHeight}, canvas:{left:rect.left,top:rect.top,width:rect.width,height:rect.height}, start:${JSON.stringify(touchStartPoint)}, end:${JSON.stringify(touchEndPoint)}, targetStart:target(${JSON.stringify(touchStartPoint)}), targetEnd:target(${JSON.stringify(touchEndPoint)}), camera:window.__UNKNOWN_YIELD_CAMERA__(), repositionCamera:{before:${JSON.stringify(cameraBeforeTouchReposition)},after:${JSON.stringify(cameraAfterTouchReposition)}}};
      })()`);
      console.log("PHASE20_P5_MOBILE_TOUCH_INPUT " + JSON.stringify(mobileTouchBefore));
      expect(mobileTouchBefore.armed).toBe("true");
      expect(mobileTouchBefore.targetStart).toBe("CANVAS");
      expect(mobileTouchBefore.targetEnd).toBe("CANVAS");
      expect(touchTargetTags).toEqual({start:"CANVAS",end:"CANVAS"});
      await sendTouch("touchStart", [{ ...touchStartPoint, id: 6 }]);
      await sendTouch("touchMove", [{ ...touchEndPoint, id: 6 }]);
      await sendTouch("touchEnd", []);
      await evaluate<void>(`new Promise((resolve) => setTimeout(resolve, 350))`);
      const mobileTouchAfter = await evaluate<Record<string, unknown>>(`(() => ({review:!!document.querySelector('[data-testid="dismantle-review"]'), armed:document.querySelector('[data-testid="dismantle-touch-arm"]')?.getAttribute("aria-pressed"), status:document.querySelector('[role="status"]')?.innerText, camera:window.__UNKNOWN_YIELD_CAMERA__()}))()`);
      console.log("PHASE20_P5_MOBILE_TOUCH_RESULT " + JSON.stringify(mobileTouchAfter));
      if (!mobileTouchAfter.review) await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') !== null`);
      expect((await reviewCounts())["Will be removed"]).toBe(2);
      const touchReviewScreenshot = await captureP5Screenshot("p5-mobile-touch-review.png");
      await tapSelector('[data-testid="dismantle-review"] button.danger');
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') === null`);
      await saveLoadedWorld();
      const p5AfterTouchConfirm = await evaluate<Save>(`JSON.parse(localStorage.getItem("industrial-site-save-v15"))`);
      expect(p5AfterTouchConfirm.belts["36,30"]).toBeUndefined();
      expect(p5AfterTouchConfirm.belts["37,30"]).toBeUndefined();
      await call("Emulation.setTouchEmulationEnabled", { enabled: false });
      await call("Emulation.setDeviceMetricsOverride", {
        width: 1440,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await waitForExpression(`window.innerWidth === 1440 && window.innerHeight === 1000`);

      // U17: a live simulation change invalidates the explicit preflight.
      await waitForExpression(`(() => {
        const canvas = document.querySelector("canvas"), rect = canvas?.getBoundingClientRect();
        return rect?.width === innerWidth && rect?.height === innerHeight;
      })()`);
      await evaluate<boolean>(`(() => { document.querySelector('button[aria-label="Center camera"]')?.click(); return true; })()`);
      await sleep(120);
      await waitForExpression(`(() => {
        const camera = window.__UNKNOWN_YIELD_CAMERA__?.();
        return camera?.target &&
          Math.abs(camera.scrollX - camera.target.scrollX) < 0.05 &&
          Math.abs(camera.scrollY - camera.target.scrollY) < 0.05 &&
          Math.abs(camera.zoom - camera.target.zoom) < 0.0001;
      })()`);
      await evaluate<boolean>(`(() => { document.querySelector('button[aria-label="Resume simulation"]')?.click(); return true; })()`);
      await waitForExpression(`document.querySelector(".paused-label") === null`);
      await waitForExpression(`document.querySelector('button[aria-label="Pause simulation"]') !== null`);
      const stalePixels = await dragWorldRoute({ x: 15, y: 25 }, { x: 21, y: 26 });
      const staleTargetElement = await evaluate<Record<string, unknown>>(`(() => {
        const p = ${JSON.stringify(stalePixels.start)}, canvas = document.querySelector("canvas"), rect = canvas.getBoundingClientRect();
        const target = document.elementFromPoint(p.x,p.y);
        return {tag:target?.tagName ?? null, className:target ? String(target.className) : null, aria:target?.getAttribute("aria-label") ?? null, rect:{left:rect.left,top:rect.top,width:rect.width,height:rect.height}, camera:window.__UNKNOWN_YIELD_CAMERA__()};
      })()`);
      console.log("PHASE20_P5_STALE_TARGET " + JSON.stringify({ pixels:stalePixels, target:staleTargetElement }));
      await releaseRoute(stalePixels.end);
      await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') !== null`);
      const staleReviewBefore = await evaluate<string>(`document.querySelector('[data-testid="dismantle-review"]')?.innerText ?? ""`);
      const staleReviewCanConfirm = await evaluate<boolean>(`document.querySelector('[data-testid="dismantle-review"] button.danger')?.hasAttribute("disabled") === false`);
      expect((await reviewCounts())["Will be removed"]).toBeGreaterThan(0);
      console.log("PHASE20_P5_STALE_REVIEW_BEFORE " + JSON.stringify({ text: staleReviewBefore, canConfirm: staleReviewCanConfirm }));
      const staleTargetIds = [
        ...Object.values(p5Seed.save.machines)
          .filter((machine) => machine.x === 15 && machine.y === 25)
          .map(({ id }) => id),
        ...Object.values(p5Seed.save.belts)
          .filter((belt) =>
            (belt.y === 26 && belt.x >= 17 && belt.x <= 21) ||
            (belt.x === 21 && belt.y === 25),
          )
          .map(({ id }) => id),
      ];
      expect(staleTargetIds).toHaveLength(7);
      const liveStateBefore = await evaluate<{ tick: number; fingerprint: string }>(
        `(() => ({tick:window.__UNKNOWN_YIELD_SIMULATION__.tick(), fingerprint:window.__UNKNOWN_YIELD_SIMULATION__.dismantleFingerprint(${JSON.stringify(staleTargetIds)})}))()`,
      );
      await waitForExpression(
        `(() => { const simulation = window.__UNKNOWN_YIELD_SIMULATION__; return simulation.tick() > ${liveStateBefore.tick} && simulation.dismantleFingerprint(${JSON.stringify(staleTargetIds)}) !== ${JSON.stringify(liveStateBefore.fingerprint)}; })()`,
        15000,
      );
      const liveStateAfter = await evaluate<{ tick: number; fingerprint: string }>(
        `(() => ({tick:window.__UNKNOWN_YIELD_SIMULATION__.tick(), fingerprint:window.__UNKNOWN_YIELD_SIMULATION__.dismantleFingerprint(${JSON.stringify(staleTargetIds)})}))()`,
      );
      expect(liveStateAfter.tick).toBeGreaterThan(liveStateBefore.tick);
      expect(liveStateAfter.fingerprint).not.toBe(liveStateBefore.fingerprint);
      console.log("PHASE20_P5_STALE_LIVE_STATE " + JSON.stringify({ before: liveStateBefore, after: liveStateAfter }));
      await evaluate<boolean>(`(() => { document.querySelector('[data-testid="dismantle-review"] button.danger')?.click(); return true; })()`);
      await sleep(100);
      const staleReviewClickResult = await evaluate<Record<string, unknown>>(`(() => ({status:[...document.querySelectorAll('[role="status"]')].map((element) => element.textContent), review:document.querySelector('[data-testid="dismantle-review"]')?.innerText ?? null, disabled:document.querySelector('[data-testid="dismantle-review"] button.danger')?.hasAttribute("disabled") ?? null}))()`);
      console.log("PHASE20_P5_STALE_REVIEW_CLICK " + JSON.stringify(staleReviewClickResult));
      await waitForExpression(`document.querySelector('[role="status"]')?.textContent.includes("world changed") === true`);
      expect(await evaluate<boolean>(`document.querySelector('[data-testid="dismantle-review"]') !== null`)).toBe(true);
      const staleReviewAfter = await evaluate<string>(`document.querySelector('[data-testid="dismantle-review"]')?.innerText ?? ""`);
      const staleReviewScreenshot = await captureP5Screenshot("p5-stale-review-revalidated.png");
      await evaluate<boolean>(`(() => { document.querySelector('button[aria-label="Pause simulation"]')?.click(); return true; })()`);
      await waitForExpression(`document.querySelector(".paused-label") !== null`);
      await cancelDismantleReview();
      await saveLoadedWorld();
      const staleTarget = await evaluate<boolean>(`Object.values(JSON.parse(localStorage.getItem("industrial-site-save-v15") ?? "null").machines).some((machine) => machine.x === 15 && machine.y === 25)`);
      expect(staleTarget).toBe(true);

      console.log("PHASE20_P5_DESKTOP_BROWSER_EVIDENCE " + JSON.stringify({
        mode: browserAcceptanceMode,
        cases: {
          U01_singleDefault: "removed one belt through normal X-tool click",
          U02_cancelNoMutation: { counts: cancelCounts, unchangedSavedBytes: true, screenshot: cancelScreenshot },
          U03_partialLoadedLine: { blockedPreviewScreenshot: partialScreenshot, loadedGasQuantity: p5AfterPartial.pressureLines["32,30"].quantity, ledgerMismatches: auditLedger(fixture, p5AfterPartial).mismatches.length },
          U04_exactDefinition: { counts: exactCounts, screenshot: exactScreenshot },
          U05_familyTaxonomy: familyCounts,
          U06_protectedAnchor: "deposit anchor rejected; confirm disabled",
          U07_reversedDrag: "same preview counts in both directions; save unchanged",
          U08_partialFootprint: "ignored with full-footprint explanation",
          U09_routeIdentity: "one selected route for both endpoints",
          U10_factoryVisibility: { closed: closedFactoryCounts, closedScreenshot: closedFactoryScreenshot, openScreenshot: openFactoryScreenshot },
          U11_rightDragPan: { before: cameraBeforeRightPan, after: cameraAfterRightPan },
          U16_inspectorCleared: "selected factory dismantled; inspector and highlight cleared",
          U14_keyboardAndConfirm: { keyboardSingleAndAreaModes: true, enterConfirmedOneBelt: true, reducedMotionScreenshot },
          U15_nonColorLabels: { text: accessibleReviewText, screenshot: reducedMotionScreenshot },
          U12_touchPanPinchAndNativeMenu: { pan: cameraAfterTouchPan, pinchZoom: cameraAfterPinch.zoom },
          U13_armedTouchConfirm: { screenshot: touchReviewScreenshot, count: 2 },
          U17_snapshotRevalidation: { staleReviewBefore, staleReviewAfter, targetStillPresent: staleTarget, screenshot: staleReviewScreenshot },
        },
      }));

      await evaluate(`(() => {
        document.querySelector('button[aria-label="Resume simulation"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector(".paused-label") === null`,
      );

      const learned = hazardSave();
      const beforeEvidence = await evaluate<string>(
        `document.body.textContent ?? ""`,
      );
      expect(beforeEvidence).not.toContain("Vitrified slag jam");
      expect(beforeEvidence).not.toContain("extra confinement caused the jam");

      await evaluate(
        `localStorage.setItem("industrial-site-save-v15", ${JSON.stringify(
          JSON.stringify(learned),
        )})`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Game menu"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `[...document.querySelectorAll("button")]
          .some((button) => button.textContent?.includes("Load saved world"))`,
      );
      await evaluate(`(() => {
        [...document.querySelectorAll("button")]
          .find((button) => button.textContent?.includes("Load saved world"))
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Site restored") === true`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Knowledge notebook"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.body.textContent?.includes("Vitrified slag jam") === true &&
          document.body.textContent?.includes("HAZARD EVIDENCE") === true &&
          document.body.textContent?.includes("SAFER NEXT TEST") === true &&
          document.body.textContent?.includes(
            "If that trial stays stable, the extra confinement caused the jam."
          ) === true`,
      );
      await openBuildGroup("thermal");
      await waitForExpression(
        `document.querySelector('.build-submenu button[aria-label="Relief furnace"]')
          ?.getAttribute("aria-disabled") === "false"`,
      );

      await evaluate(`(() => {
        document.querySelector('button[aria-label="Knowledge notebook"]')?.click();
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Home" }));
        window.dispatchEvent(new KeyboardEvent("keyup", { key: "Home" }));
        return true;
      })()`);
      await waitForExpression(
        `(() => {
          const camera = window.__UNKNOWN_YIELD_CAMERA__?.();
          return camera?.target &&
            Math.abs(camera.scrollX - camera.target.scrollX) < 0.05 &&
            Math.abs(camera.scrollY - camera.target.scrollY) < 0.05 &&
            Math.abs(camera.zoom - camera.target.zoom) < 0.0001;
        })()`,
      );

      const factoryPoint = await evaluate<{ x: number; y: number }>(`(() => {
        const canvas = document.querySelector("canvas");
        if (!canvas) throw new Error("Canvas missing");
        const rect = canvas.getBoundingClientRect();
        // Ask the actual renderer rather than approximating Phaser's
        // zoomed viewport with scroll-as-top-left coordinates.
        const point = window.__UNKNOWN_YIELD_PROJECT_WORLD__?.(25.5 * 32, 24.5 * 24);
        if (!point) throw new Error("World projection probe missing");
        return {
          x: rect.left + point.x * rect.width,
          y: rect.top + point.y * rect.height,
        };
      })()`);
      await call("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: factoryPoint.x,
        y: factoryPoint.y,
        button: "left",
        buttons: 1,
        clickCount: 1,
      });
      await call("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: factoryPoint.x,
        y: factoryPoint.y,
        button: "left",
        buttons: 0,
        clickCount: 1,
      });
      await waitForExpression(
        `[...document.querySelectorAll("button.entity-row")]
          .some((button) => button.textContent?.includes("Oversealed furnace"))`,
      );
      await evaluate(`(() => {
        [...document.querySelectorAll("button.entity-row")]
          .find((button) => button.textContent?.includes("Oversealed furnace"))
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.body.textContent?.includes("Vitrified slag jam") === true &&
          [...document.querySelectorAll("button")]
            .some((button) =>
              button.textContent?.includes("Reclaim trapped material to output")
            )`,
      );
      await evaluate(`(() => {
        [...document.querySelectorAll("button")]
          .find((button) =>
            button.textContent?.includes("Reclaim trapped material to output")
          )
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Hazard material reclaimed to machine output") === true &&
          [...document.querySelectorAll("button")]
            .some((button) => button.textContent?.includes("Enable automatic operation"))`,
      );

      await evaluate(`(() => {
        document.querySelector('button[aria-label="Game menu"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `[...document.querySelectorAll("button")]
          .some((button) => button.textContent?.includes("Save world"))`,
      );
      await evaluate(`(() => {
        [...document.querySelectorAll("button")]
          .find((button) => button.textContent?.includes("Save world"))
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Field record saved on this device") === true`,
      );
      const recovered = await evaluate<{
        incident: string | null;
        enabled: boolean;
        incidentInventory: Record<string, number>;
        output: Record<string, number>;
        hazardEvidence: string[];
      }>(`(() => {
        const save = JSON.parse(
          localStorage.getItem("industrial-site-save-v15") ?? "null"
        );
        const processor = Object.values(save.machines)
          .find((machine) => machine.definitionId === "oversealed-furnace");
        return {
          incident: processor.incident,
          enabled: processor.enabled,
          incidentInventory: processor.incidentInventory,
          output: processor.output,
          hazardEvidence: save.hazardEvidence,
        };
      })()`);
      expect(recovered).toEqual({
        incident: null,
        enabled: false,
        incidentInventory: {},
        output: { residue: 1 },
        hazardEvidence: ["slag-jam"],
      });

      const phase12 = phase12BrowserWorld();
      await evaluate(
        `localStorage.setItem("industrial-site-save-v15", ${JSON.stringify(
          JSON.stringify(phase12.save),
        )})`,
      );
      await evaluate(`(() => {
        const loadVisible = [...document.querySelectorAll("button")]
          .some((button) => button.textContent?.includes("Load saved world"));
        if (!loadVisible)
          document.querySelector('button[aria-label="Game menu"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `[...document.querySelectorAll("button")]
          .some((button) => button.textContent?.includes("Load saved world"))`,
      );
      await evaluate(`(() => {
        [...document.querySelectorAll("button")]
          .find((button) => button.textContent?.includes("Load saved world"))
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Site restored") === true`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Center camera"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `(() => {
          const view = window.__UNKNOWN_YIELD_CAMERA__?.();
          if (!view?.target) return false;
          return Math.abs(view.scrollX - view.target.scrollX) < 0.05 &&
            Math.abs(view.scrollY - view.target.scrollY) < 0.05 &&
            Math.abs(view.zoom - view.target.zoom) < 0.0001;
        })()`,
        5000,
      );

      await clickCell(28, 37);
      await waitForExpression(
        `[...document.querySelectorAll("button")]
          .some((button) => button.textContent?.includes("Move west"))`,
      );
      await evaluate(`(() => {
        [...document.querySelectorAll("button")]
          .find((button) => button.textContent?.includes("Move west"))
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Factory relocated") === true &&
          document.body.textContent?.includes("Relocation hold") === true`,
      );

      await clickBuildTool("solid-logistics", "Belt");
      await waitForExpression(
        `document.querySelector('[data-build-group="solid-logistics"]')
          ?.getAttribute("aria-pressed") === "true" &&
          document.querySelector(".build-hint strong")?.textContent === "Belt"`,
      );
      await pressKey("r", "KeyR", 82);
      await pressKey("r", "KeyR", 82);
      await clickCell(33, 37);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Belt path built") === true`,
      );

      await pressKey("Escape", "Escape", 27);
      await clickCell(27, 37);
      await waitForExpression(
        `document.body.textContent?.includes("Relocation hold") === true`,
      );
      try {
        await waitForExpression(
          `document.body.textContent?.includes("External requirements restored") === true`,
          15000,
        );
      } catch (error) {
        const diagnostics = await evaluate<{
          camera: unknown;
          panel: string | null;
          notice: string | null;
        }>(`(() => ({
          camera: window.__UNKNOWN_YIELD_CAMERA__?.() ?? null,
          panel: document.querySelector(".context-panel")?.textContent?.slice(0, 950) ?? null,
          notice: document.querySelector('[role="status"]')?.textContent ?? null,
        }))()`);
        let persisted: unknown = null;
        try {
          await evaluate(`(() => {
            document.querySelector('button[aria-label="Game menu"]')?.click();
            return true;
          })()`);
          await waitForExpression(
            `[...document.querySelectorAll("button")]
              .some((button) => button.textContent?.includes("Save world"))`,
          );
          await evaluate(`(() => {
            [...document.querySelectorAll("button")]
              .find((button) => button.textContent?.includes("Save world"))
              ?.click();
            return true;
          })()`);
          persisted = await evaluate(`(() => {
            const save = JSON.parse(
              localStorage.getItem("industrial-site-save-v15") ?? "null"
            );
            return {
              factory: Object.values(save.factories ?? {})
                .find((factory) => factory.x === 23 && factory.y === 33),
              belts: Object.values(save.belts ?? {})
                .filter((belt) => belt.y === 37 && belt.x >= 30 && belt.x <= 35),
              ports: Object.values(save.ports ?? {})
                .filter((port) => port.y === 37 && port.x >= 30 && port.x <= 35),
            };
          })()`);
        } catch (captureError) {
          persisted = { captureError: String(captureError) };
        }
        throw new Error(
          "Relocation inspection: " +
            JSON.stringify({ ...diagnostics, persisted }),
          { cause: error },
        );
      }
      await evaluate(`(() => {
        [...document.querySelectorAll("button.entity-row")]
          .find((button) => button.textContent?.includes("Crusher"))
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `[...document.querySelectorAll("button")]
          .some((button) => button.textContent?.includes("Enable automatic operation"))`,
      );
      await evaluate(`(() => {
        [...document.querySelectorAll("button")]
          .find((button) => button.textContent?.includes("Enable automatic operation"))
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Automatic operation enabled") === true`,
      );

      await pressKey("Escape", "Escape", 27);
      await waitForExpression(
        `document.querySelector(".context-panel") === null`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Center camera"]')?.click();
        return true;
      })()`);
      await sleep(150);
      await clickCell(39, 37);
      await waitForExpression(
        `document.body.textContent?.includes("District feed diverter") === true &&
          [...document.querySelectorAll("button")]
            .some((button) => button.textContent?.includes("Select alternate feed"))`,
      );
      await evaluate(`(() => {
        [...document.querySelectorAll("button")]
          .find((button) => button.textContent?.includes("Select alternate feed"))
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Alternate feed selected") === true`,
      );

      await evaluate(`(() => {
        document.querySelector('button[aria-label="Game menu"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `[...document.querySelectorAll("button")]
          .some((button) => button.textContent?.includes("Save world"))`,
      );
      await evaluate(`(() => {
        [...document.querySelectorAll("button")]
          .find((button) => button.textContent?.includes("Save world"))
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[role="status"]')
          ?.textContent.includes("Field record saved on this device") === true`,
      );

      const phase12Saved = await evaluate<{
        factory: {
          x: number;
          y: number;
          relocation: unknown;
        };
        machine: { x: number; y: number; enabled: boolean };
        reconnect: { direction: number } | null;
        diverter: { switched: boolean };
      }>(`(() => {
        const save = JSON.parse(
          localStorage.getItem("industrial-site-save-v15") ?? "null"
        );
        const factory = save.factories[${JSON.stringify(phase12.factoryId)}];
        const machine = save.machines[${JSON.stringify(phase12.machineId)}];
        const diverter = Object.values(save.belts)
          .find((belt) => belt.id === ${JSON.stringify(phase12.diverterId)});
        return {
          factory: {
            x: factory.x,
            y: factory.y,
            relocation: factory.relocation ?? null,
          },
          machine: {
            x: machine.x,
            y: machine.y,
            enabled: machine.enabled,
          },
          reconnect: save.belts["33,37"]
            ? { direction: save.belts["33,37"].direction }
            : null,
          diverter: { switched: diverter.switched },
        };
      })()`);
      expect(phase12Saved).toEqual({
        factory: {
          x: 23,
          y: 33,
          relocation: null,
        },
        machine: {
          x: 29,
          y: 36,
          enabled: true,
        },
        reconnect: { direction: 2 },
        diverter: { switched: true },
      });

      await evaluate(`(() => {
        document.querySelector('button[aria-label="Game configuration"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.body.textContent?.includes("GAME CONFIGURATION") === true &&
          document.querySelector(
            'input[aria-label="Promote last-used group tool"]'
          )?.checked === true`,
      );

      await evaluate(`(() => {
        document.querySelector(
          'input[aria-label="Promote last-used group tool"]'
        )?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector(
          'input[aria-label="Promote last-used group tool"]'
        )?.checked === false`,
      );

      const preferenceRecord = await evaluate<{
        version: number;
        promoteLastUsed: boolean;
        lastUsedByGroup: Record<string, string>;
        expeditionSaveStillPresent: boolean;
      }>(`(() => {
        const preferences = JSON.parse(
          localStorage.getItem("unknown-yield-game-preferences") ?? "null"
        );
        return {
          version: preferences.version,
          promoteLastUsed: preferences.buildPalette.promoteLastUsed,
          lastUsedByGroup: preferences.buildPalette.lastUsedByGroup,
          expeditionSaveStillPresent:
            localStorage.getItem("industrial-site-save-v15") !== null,
        };
      })()`);
      expect(preferenceRecord).toEqual({
        version: 2,
        promoteLastUsed: false,
        lastUsedByGroup: {
          "gas-logistics": "pressure-line",
          "liquid-logistics": "pipe",
          processing: "sinterer",
          "solid-logistics": "belt",
          thermal: "furnace",
        },
        expeditionSaveStillPresent: true,
      });

      await call("Page.navigate", { url: appUrl });
      await waitForExpression(
        `document.readyState === "complete" &&
          !!document.querySelector('button[aria-label="Game configuration"]')`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Game configuration"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector(
          'input[aria-label="Promote last-used group tool"]'
        )?.checked === false`,
      );

      await evaluate(`(() => {
        document.querySelector('button[aria-label="Close panel"]')?.click();
        return true;
      })()`);
      await holdKey("4", "Digit4", 52);
      await waitForExpression(
        `document.querySelector(
          '[data-build-group="thermal"][aria-expanded="true"]'
        ) !== null &&
          document.querySelector(
            '.build-submenu button[aria-label="Sealed furnace"]'
          ) !== null`,
      );
      await evaluate(`(() => {
        document.querySelector(
          '.build-submenu button[aria-label="Sealed furnace"]'
        )?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector(".build-submenu") === null &&
          document.querySelector(".build-hint strong")?.textContent ===
            "Sealed furnace"`,
      );

      const disabledPromotionMemory = await evaluate<{
        promoteLastUsed: boolean;
        thermal: string | null;
        topLevelName: string | null;
      }>(`(() => {
        const preferences = JSON.parse(
          localStorage.getItem("unknown-yield-game-preferences") ?? "null"
        );
        return {
          promoteLastUsed: preferences.buildPalette.promoteLastUsed,
          thermal: preferences.buildPalette.lastUsedByGroup.thermal ?? null,
          topLevelName: document
            .querySelector('[data-build-group="thermal"]')
            ?.getAttribute("aria-label") ?? null,
        };
      })()`);
      expect(disabledPromotionMemory).toEqual({
        promoteLastUsed: false,
        thermal: "sealed-furnace",
        topLevelName: "Furnace group",
      });

      await evaluate(`(() => {
        document.querySelector('button[aria-label="Game configuration"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector(
          'input[aria-label="Promote last-used group tool"]'
        )?.checked === false`,
      );
      await evaluate(`(() => {
        document.querySelector(
          'input[aria-label="Promote last-used group tool"]'
        )?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector(
          'input[aria-label="Promote last-used group tool"]'
        )?.checked === true &&
          document.querySelector('[data-build-group="thermal"]')
            ?.getAttribute("aria-label") === "Sealed furnace group"`,
      );
      const promotedPresentation = await evaluate<{
        name: string | null;
        cost: string | null;
        locked: boolean;
      }>(`(() => {
        const button = document.querySelector('[data-build-group="thermal"]');
        return {
          name: button?.querySelector("span")?.textContent ?? null,
          cost: button?.querySelector("em")?.textContent?.trim() ?? null,
          locked: button?.classList.contains("locked") ?? false,
        };
      })()`);
      expect(promotedPresentation).toEqual({
        name: "Sealed furnace",
        cost: "26",
        locked: false,
      });
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Close panel"]')?.click();
        return true;
      })()`);

      await pressKey("4", "Digit4", 52);
      await waitForExpression(
        `document.querySelector(".build-hint strong")?.textContent ===
          "Sealed furnace"`,
      );

      await call("Page.navigate", { url: appUrl });
      await waitForExpression(
        `document.readyState === "complete" &&
          document.querySelector('[data-build-group="thermal"]')
            ?.getAttribute("aria-label") === "Sealed furnace group"`,
      );
      const promotedAfterReload = await evaluate<{
        promoteLastUsed: boolean;
        thermal: string | null;
      }>(`(() => {
        const preferences = JSON.parse(
          localStorage.getItem("unknown-yield-game-preferences") ?? "null"
        );
        return {
          promoteLastUsed: preferences.buildPalette.promoteLastUsed,
          thermal: preferences.buildPalette.lastUsedByGroup.thermal ?? null,
        };
      })()`);
      expect(promotedAfterReload).toEqual({
        promoteLastUsed: true,
        thermal: "sealed-furnace",
      });

      // Settings must be discoverable even if the player misses the gear icon.
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Game menu"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector("button")?.ownerDocument.body.textContent
          ?.includes("Expedition controls") === true`,
      );
      await evaluate(`(() => {
        [...document.querySelectorAll("button")]
          .find((b) => b.textContent?.includes("Game settings & controls"))
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('input[aria-label="Smooth camera motion"]')
          ?.checked === true &&
          document.querySelector('input[aria-label="Pan speed"]')?.value === "1" &&
          document.querySelector('select[aria-label="Reduce motion"]')?.value === "system" &&
          document.querySelector('input[aria-label="Show FPS"]')?.checked === false &&
          document.querySelector("output.world-fps") === null`,
      );

      await evaluate(`(() => {
        document.querySelector('input[aria-label="Show FPS"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `JSON.parse(localStorage.getItem("unknown-yield-game-preferences"))
          ?.interface?.showFps === true &&
          document.querySelector("output.world-fps") !== null`,
      );
      // The persistent counter is visible without ?perf or DevTools.
      await waitForExpression(
        `/^FPS [0-9]+$/.test(document.querySelector("output.world-fps")
          ?.textContent?.trim() ?? "")`,
      );

      await evaluate(`(() => {
        const slider = document.querySelector('input[aria-label="Pan speed"]');
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype, "value"
        ).set;
        setter.call(slider, "1.7");
        slider.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`);
      await waitForExpression(
        `JSON.parse(localStorage.getItem("unknown-yield-game-preferences"))
          ?.camera?.panSpeed === 1.7`,
      );
      await evaluate(`(() => {
        document.querySelector('input[aria-label="Invert mouse wheel zoom"]')
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `JSON.parse(localStorage.getItem("unknown-yield-game-preferences"))
          ?.controls?.invertWheelZoom === true`,
      );
      await evaluate(`(() => {
        document.querySelector('input[aria-label="Smooth camera motion"]')
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `JSON.parse(localStorage.getItem("unknown-yield-game-preferences"))
          ?.camera?.smooth === false`,
      );
      await evaluate(`(() => {
        const select = document.querySelector('select[aria-label="Reduce motion"]');
        const setter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype, "value"
        ).set;
        setter.call(select, "on");
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`);
      await waitForExpression(
        `JSON.parse(localStorage.getItem("unknown-yield-game-preferences"))
          ?.accessibility?.reducedMotion === "on"`,
      );

      await call("Page.navigate", { url: appUrl });
      await waitForExpression(
        `document.readyState === "complete" &&
          !!document.querySelector('button[aria-label="Game configuration"]')`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Game configuration"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('input[aria-label="Pan speed"]')?.value === "1.7" &&
          document.querySelector('input[aria-label="Smooth camera motion"]')
            ?.checked === false &&
          document.querySelector('select[aria-label="Reduce motion"]')?.value === "on" &&
          document.querySelector('input[aria-label="Show FPS"]')?.checked === true &&
          document.querySelector("output.world-fps") !== null`,
      );

      await evaluate(`(() => {
        [...document.querySelectorAll("button")]
          .find((b) => b.textContent?.includes("Reset configuration to defaults"))
          ?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('input[aria-label="Pan speed"]')?.value === "1" &&
          document.querySelector('input[aria-label="Smooth camera motion"]')
            ?.checked === true &&
          document.querySelector('select[aria-label="Reduce motion"]')?.value === "system" &&
          document.querySelector('input[aria-label="Show FPS"]')?.checked === false &&
          document.querySelector("output.world-fps") === null`,
      );
      const afterReset = await evaluate<{
        version: number;
        memory: Record<string, string>;
        worldSave: boolean;
      }>(`(() => {
        const saved = JSON.parse(localStorage.getItem(
          "unknown-yield-game-preferences") || "null"
        );
        return {
          version: saved.version,
          memory: saved.buildPalette.lastUsedByGroup,
          worldSave: localStorage.getItem("industrial-site-save-v15") !== null,
        };
      })()`);
      expect(afterReset).toEqual({ version: 2, memory: {}, worldSave: true });
      // Phase 18: UI reveals are immediate when reduced, and the player
      // override has higher priority than the device motion preference.
      await call("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      await waitForExpression(
        `document.querySelector(".game")?.getAttribute("data-motion-mode") ===
          "system" &&
          getComputedStyle(document.querySelector(".context-panel"))
            .animationName === "none"`,
      );
      await evaluate(`(() => {
        const select = document.querySelector('select[aria-label="Reduce motion"]');
        const setter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype, "value"
        ).set;
        setter.call(select, "off");
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector(".game")?.getAttribute("data-motion-mode") ===
          "off" &&
          getComputedStyle(document.querySelector(".context-panel"))
            .animationName === "uy-context-arrive"`,
      );
      await evaluate(`(() => {
        const select = document.querySelector('select[aria-label="Reduce motion"]');
        const setter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype, "value"
        ).set;
        setter.call(select, "on");
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector(".game")?.getAttribute("data-motion-mode") ===
          "on" &&
          getComputedStyle(document.querySelector(".context-panel"))
            .animationName === "none"`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Close panel"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector(".context-panel") === null`,
      );
      await call("Emulation.setEmulatedMedia", { features: [] });
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Game configuration"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector("select[aria-label='Reduce motion']")?.value ===
          "on" &&
          document.querySelector(".context-panel") !== null`,
      );
      await evaluate(`(() => {
        const select = document.querySelector('select[aria-label="Reduce motion"]');
        const setter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype, "value"
        ).set;
        setter.call(select, "system");
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`);
      await waitForExpression(
        `JSON.parse(localStorage.getItem("unknown-yield-game-preferences"))
          ?.accessibility?.reducedMotion === "system"`,
      );

      // Read-only camera diagnostics are opt-in; ordinary players do not
      // expose the probe. These assertions run against the production export.
      await call("Page.navigate", { url: appUrl });
      await waitForExpression(
        `typeof window.__UNKNOWN_YIELD_CAMERA__ === "function" &&
          window.__UNKNOWN_YIELD_CAMERA__()?.zoom > 0`,
      );
      const initialCamera = await evaluate<{
        scrollX: number;
        scrollY: number;
        zoom: number;
      }>(`window.__UNKNOWN_YIELD_CAMERA__()`);
      await call("Input.dispatchMouseEvent", {
        type: "mouseWheel",
        x: 640,
        y: 420,
        deltaX: 0,
        deltaY: -120,
      });
      await waitForExpression(
        `window.__UNKNOWN_YIELD_CAMERA__()?.zoom >
          ${JSON.stringify(initialCamera.zoom + 0.02)}`,
      );
      const zoomedCamera = await evaluate<{
        scrollX: number;
        scrollY: number;
        zoom: number;
      }>(`window.__UNKNOWN_YIELD_CAMERA__()`);
      const wheelViewport = await evaluate<{
        x: number;
        y: number;
        width: number;
        height: number;
      }>(`(() => {
        const canvas = document.querySelector(".world-host canvas");
        if (!canvas) throw new Error("Canvas missing");
        const rect = canvas.getBoundingClientRect();
        return { x: 640 - rect.left, y: 420 - rect.top,
          width: canvas.width, height: canvas.height };
      })()`);
      const worldAtWheel = (view: {
        scrollX: number;
        scrollY: number;
        zoom: number;
      }) => ({
        x:
          view.scrollX +
          wheelViewport.width / 2 +
          (wheelViewport.x - wheelViewport.width / 2) / view.zoom,
        y:
          view.scrollY +
          wheelViewport.height / 2 +
          (wheelViewport.y - wheelViewport.height / 2) / view.zoom,
      });
      const focusBefore = worldAtWheel(initialCamera);
      const focusAfter = worldAtWheel(zoomedCamera);
      expect(Math.abs(focusAfter.x - focusBefore.x)).toBeLessThan(0.1);
      expect(Math.abs(focusAfter.y - focusBefore.y)).toBeLessThan(0.1);

      await call("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "d",
        code: "KeyD",
        windowsVirtualKeyCode: 68,
      });
      await evaluate<void>(
        `new Promise((resolve) => setTimeout(resolve, 500))`,
      );
      await call("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "d",
        code: "KeyD",
        windowsVirtualKeyCode: 68,
      });
      await waitForExpression(
        `window.__UNKNOWN_YIELD_CAMERA__()?.scrollX >
          ${JSON.stringify(zoomedCamera.scrollX + 5)}`,
      );

      await evaluate(`(() => {
        document.querySelector('button[aria-label="Center camera"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `Math.abs(window.__UNKNOWN_YIELD_CAMERA__()?.zoom -
          ${JSON.stringify(initialCamera.zoom)}) < 0.002`,
      );

      const desktopEnvironment = await evaluate<{
        userAgent: string;
        width: number;
        height: number;
        dpr: number;
      }>(`({
        userAgent: navigator.userAgent,
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio,
      })`);
      // Mobile touch emulation against the built production export.
      await call("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true,
      });
      await call("Emulation.setTouchEmulationEnabled", {
        enabled: true,
        maxTouchPoints: 3,
      });
      await call("Page.navigate", { url: appUrl });
      await waitForExpression(
        `typeof window.__UNKNOWN_YIELD_CAMERA__ === "function" &&
          window.__UNKNOWN_YIELD_CAMERA__()?.zoom > 0 &&
          document.querySelector(".world-host canvas") !== null`,
      );
      expect(
        await evaluate<string>(
          `getComputedStyle(document.querySelector(".world-host canvas"))
            .touchAction`,
        ),
      ).toBe("none");

      const touchPanBefore = await evaluate<{
        scrollX: number;
        scrollY: number;
      }>(`window.__UNKNOWN_YIELD_CAMERA__()`);
      await call("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ id: 1, x: 175, y: 390 }],
      });
      await call("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ id: 1, x: 235, y: 390 }],
      });
      await call("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await waitForExpression(
        `Math.abs(window.__UNKNOWN_YIELD_CAMERA__()?.scrollX -
          ${JSON.stringify(touchPanBefore.scrollX)}) > 5`,
      );

      const pinchBefore = await evaluate<{ zoom: number }>(
        `window.__UNKNOWN_YIELD_CAMERA__()`,
      );
      await call("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ id: 1, x: 150, y: 370 }],
      });
      await call("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { id: 1, x: 150, y: 370 },
          { id: 2, x: 240, y: 370 },
        ],
      });
      await call("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { id: 1, x: 115, y: 350 },
          { id: 2, x: 275, y: 390 },
        ],
      });
      await call("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await waitForExpression(
        `window.__UNKNOWN_YIELD_CAMERA__()?.zoom >
          ${JSON.stringify(pinchBefore.zoom * 1.08)}`,
      );

      // A second finger cancels build candidates even if a tool is selected.
      await evaluate(`(() => {
        document.querySelector('[data-build-group="solid-logistics"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector(".build-hint strong")?.textContent === "Belt"`,
      );
      expect(
        await evaluate<string[]>(`[
          { x: 170, y: 360 },
          { x: 250, y: 360 },
        ].map(({ x, y }) =>
          document.elementFromPoint(x, y)?.tagName.toLowerCase() ?? "",
        )`),
      ).toEqual(["canvas", "canvas"]);
      const platesBeforePinch = await evaluate<string>(
        `document.querySelector('[data-testid="plates"]')?.textContent ?? ""`,
      );
      expect(platesBeforePinch).not.toBe("");
      await call("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ id: 1, x: 170, y: 360 }],
      });
      await call("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { id: 1, x: 170, y: 360 },
          { id: 2, x: 250, y: 360 },
        ],
      });
      await call("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { id: 1, x: 140, y: 370 },
          { id: 2, x: 280, y: 350 },
        ],
      });
      await call("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await evaluate<void>(
        `new Promise((resolve) => setTimeout(resolve, 350))`,
      );
      expect(
        await evaluate<number>(`window.visualViewport?.scale ?? 1`),
      ).toBeCloseTo(1, 2);
      expect(
        await evaluate<string>(
          `document.querySelector('[data-testid="plates"]')?.textContent ?? ""`,
        ),
      ).toBe(platesBeforePinch);

      // Native mobile long-press must open the grouped upward tool menu.
      // This is different from a synthetic DOM click on the primary tool.
      const holdPoint = await evaluate<{ x: number; y: number }>(
        `(() => {
          const rect = document.querySelector(
            '[data-build-group="solid-logistics"]'
          ).getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
        })()`,
      );
      await call("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ id: 7, ...holdPoint }],
      });
      await evaluate<void>(
        `new Promise((resolve) => setTimeout(resolve, 450))`,
      );
      await waitForExpression(
        `document.querySelector(".build-submenu") !== null`,
      );
      await call("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await evaluate(`(() => {
        document.querySelector(".build-menu-scrim")?.click();
        return true;
      })()`);

      // Non-pinch accessibility alternatives operate through the same
      // camera controller, and React controls remain operable on mobile.
      const mobileCamera = await evaluate<{ zoom: number }>(
        `window.__UNKNOWN_YIELD_CAMERA__()`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Zoom in"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `window.__UNKNOWN_YIELD_CAMERA__()?.zoom >
          ${JSON.stringify(mobileCamera.zoom * 1.05)}`,
      );
      await evaluate(`(() => {
        document.querySelector('button[aria-label="Reset camera"]')?.click();
        return true;
      })()`);
      await waitForExpression(
        `(() => {
          const view = window.__UNKNOWN_YIELD_CAMERA__?.();
          return view?.target && Math.abs(view.zoom - view.target.zoom) < 0.002;
        })()`,
      );
      const menuTouchPoint = await evaluate<{ x: number; y: number }>(
        `(() => {
          const rect = document.querySelector(
            'button[aria-label="Game menu"]'
          ).getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()`,
      );
      await call("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ id: 3, ...menuTouchPoint }],
      });
      await call("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await waitForExpression(
        `document.body.textContent?.includes("Expedition controls") === true`,
      );
      expect(
        await evaluate<string>(
          `getComputedStyle(document.querySelector(
            'button[aria-label="Game menu"]'
          )).touchAction`,
        ),
      ).not.toBe("none");

      const mobileEnvironment = await evaluate<{
        userAgent: string;
        width: number;
        height: number;
        dpr: number;
      }>(`({
        userAgent: navigator.userAgent,
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio,
      })`);
      const screenshotResult = await call("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
      });
      const screenshotData = (screenshotResult as unknown as { data?: string })
        .data;
      expect(
        screenshotData,
        "Mobile screenshot data must be captured",
      ).toBeTruthy();
      const screenshotBytes = Buffer.from(screenshotData!, "base64");
      const screenshotSha256 = createHash("sha256")
        .update(screenshotBytes)
        .digest("hex");
      const frameReport = await evaluate<unknown>(
        `window.__UNKNOWN_YIELD_PERF__?.report() ?? null`,
      );
      // The screenshot bytes are NOT persisted as an Actions artifact.
      // Log size/digest and data provenance for the integrated exit review.
      console.log(
        "PHASE18_INTEGRATED_BROWSER_EVIDENCE " +
          JSON.stringify({
            mode: browserAcceptanceMode,
            desktopEnvironment,
            mobileEnvironment,
            screenshot: {
              format: "png",
              bytes: screenshotBytes.length,
              sha256: screenshotSha256,
              retained: false,
            },
            runtimeErrors,
            performance: frameReport,
          }),
      );
      expect(runtimeErrors, runtimeErrors.join("\n")).toEqual([]);

      if (productionBrowser) {
        // Real prebuilt browser, no Studio route or code rebuild: inject an
        // actual exported Studio JSON as a file-input change (not a sim shortcut).
        await call("Emulation.setTouchEmulationEnabled", { enabled: false });
        await call("Emulation.setDeviceMetricsOverride", {
          width: 1440,
          height: 1000,
          deviceScaleFactor: 1,
          mobile: false,
        });
        await waitForExpression(`window.innerWidth === 1440 && window.innerHeight === 1000`);
        // Switching back from the mobile touch viewport updates Chrome's
        // window metrics before Phaser's resize pass has necessarily reached
        // its canvas. Wait for the rendered surface to match the viewport.
        await waitForExpression(`(() => {
          const game = document.querySelector('.game')?.getBoundingClientRect();
          const host = document.querySelector('.world-host')?.getBoundingClientRect();
          const canvas = document.querySelector('canvas')?.getBoundingClientRect();
          return game && host && canvas &&
            game.width === window.innerWidth && game.height === window.innerHeight &&
            host.width === window.innerWidth && host.height === window.innerHeight &&
            canvas.width === window.innerWidth && canvas.height === window.innerHeight;
        })()`);
        const payload = runtimePackBrowserFixture();
        await evaluate<boolean>(`(() => {
          const menu = document.querySelector('button[aria-label="Game menu"]');
          if (!document.querySelector('input[aria-label="Choose Studio JSON content pack"]')) menu?.click();
          return true;
        })()`);
        await waitForExpression(
          `document.querySelector('input[aria-label="Choose Studio JSON content pack"]') !== null`,
        );
        await evaluate<boolean>(`(() => {
          const input = document.querySelector('input[aria-label="Choose Studio JSON content pack"]');
          const file = new File([${JSON.stringify(payload)}], "studio-playtest.json", { type: "application/json" });
          const transfer = new DataTransfer();
          transfer.items.add(file);
          input.files = transfer.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        })()`);
        await waitForExpression(
          `[...document.querySelectorAll("button")].some(b => b.textContent?.includes("Play new expedition with imported pack"))`,
        );
        await evaluate<boolean>(`(() => {
          [...document.querySelectorAll("button")].find(b => b.textContent?.includes("Play new expedition with imported pack"))?.click();
          return true;
        })()`);
        await waitForExpression(
          `localStorage.getItem("unknown-yield-active-pack-v1") !== null`,
        );
        await waitForExpression(`document.querySelector("canvas") !== null`);
        await evaluate<boolean>(`(() => { document.querySelector('button[aria-label="Close field brief"]')?.click(); return true; })()`);
        await evaluate<boolean>(`(() => { document.querySelector('button[aria-label="Center camera"]')?.click(); return true; })()`);
        await sleep(150);
        const importedPlacementView = await evaluate<{ x: number; y: number; target: string | null }>(`(() => {
          const canvas = document.querySelector("canvas"), rect = canvas.getBoundingClientRect();
          const projected = window.__UNKNOWN_YIELD_PROJECT_WORLD__((27.5) * 32, (29.5) * 24);
          const x = rect.left + projected.x * rect.width, y = rect.top + projected.y * rect.height;
          return {x,y,target:document.elementFromPoint(x,y)?.tagName ?? null, rect:{width:rect.width,height:rect.height}, camera:window.__UNKNOWN_YIELD_CAMERA__?.() ?? null};
        })()`);
        console.log("PHASE20_P5_RUNTIME_DEFINITION_VIEW " + JSON.stringify(importedPlacementView));
        expect(importedPlacementView.target).toBe("CANVAS");
        await clickBuildTool("factory", "Factory");
        await dragWorldArea({ x: 26, y: 27 }, { x: 33, y: 32 });
        await sleep(150);
        const runtimeFactoryPlacement = await evaluate<string>(`[...document.querySelectorAll('[role="status"]')].map((element) => element.textContent).join(" | ")`);
        expect(runtimeFactoryPlacement).toContain("Factory built");
        await evaluate<boolean>(`(() => { [...document.querySelectorAll('nav[aria-label="Build tools"] button')].find((button) => button.getAttribute("aria-label") === "Inspect")?.click(); return true; })()`);
        await clickCell(26, 27);
        await waitForExpression(`document.querySelector('.context-panel') !== null`);
        await openSelectedFactory();
        await clickBuildTool("processing", "Crusher");
        await clickCell(31, 29);
        await sleep(150);
        const crusherPlacement = await evaluate<string>(`[...document.querySelectorAll('[role="status"]')].map((element) => element.textContent).join(" | ")`);
        console.log("PHASE20_P5_RUNTIME_CRUSHER_PLACEMENT " + JSON.stringify(crusherPlacement));
        expect(crusherPlacement).toContain("Machine placed");
        await clickBuildTool("processing", "Polisher");
        await clickCell(27, 29);
        await sleep(150);
        const polisherPlacement = await evaluate<string>(`[...document.querySelectorAll('[role="status"]')].map((element) => element.textContent).join(" | ")`);
        console.log("PHASE20_P5_RUNTIME_POLISHER_PLACEMENT " + JSON.stringify(polisherPlacement));
        expect(polisherPlacement).toContain("Machine placed");
        await evaluate<boolean>(`(() => { [...document.querySelectorAll('nav[aria-label="Build tools"] button')].find((button) => button.getAttribute("aria-label") === "Dismantle")?.click(); return true; })()`);
        await chooseMode("area-exact");
        await dragWorldArea({ x: 27, y: 29 }, { x: 32, y: 30 });
        await waitForExpression(`document.querySelector('[data-testid="dismantle-review"]') !== null`);
        const runtimeExactCounts = await reviewCounts();
        expect(runtimeExactCounts["Will be removed"]).toBe(1);
        expect(runtimeExactCounts["Ignored · outside filter or protected"]).toBe(2);
        const runtimeExactScreenshot = await captureP5Screenshot("p5-runtime-definition-exact-review.png");
        await cancelDismantleReview(true);
        console.log("PHASE20_P5_RUNTIME_DEFINITION_BROWSER " + JSON.stringify({
          importedDefinition: "polisher",
          exactFilter: runtimeExactCounts,
          importedToolUnlocked: true,
          screenshot: runtimeExactScreenshot,
        }));
        const postActivation = await evaluate<unknown>(`(() => ({
          menuButton: Boolean(document.querySelector('button[aria-label="Game menu"]')),
          hasCanvas: Boolean(document.querySelector('canvas')),
          storedPack: Boolean(localStorage.getItem("unknown-yield-active-pack-v1")),
          text: (document.body?.innerText ?? "").slice(-1500),
        }))()`);
        console.log(
          "PHASE19_PACK_ACTIVATION_DIAGNOSTIC " +
            JSON.stringify(postActivation),
        );
        await waitForExpression(
          `document.querySelector('button[aria-label="Game menu"]') !== null`,
        );
        await evaluate<boolean>(`(() => {
          if (!document.body.textContent?.includes("Expedition controls"))
            document.querySelector('button[aria-label="Game menu"]')?.click();
          return true;
        })()`);
        await waitForExpression(
          `document.body.textContent?.includes("Expedition controls") === true`,
        );
        const packMenuText = await evaluate<string>(
          `document.body.innerText.slice(-1700)`,
        );
        console.log(
          "PHASE19_PACK_MENU " + JSON.stringify({ text: packMenuText }),
        );
        expect(packMenuText).toContain("Offline content packs");
        await evaluate<boolean>(`(() => {
          [...document.querySelectorAll("button")].find(b => b.textContent?.includes("Save world"))?.click();
          return true;
        })()`);
        const packEvidence = await evaluate<{
          id: string;
          scopedSave: boolean;
          locale: string;
        }>(`(() => {
          const stored = JSON.parse(localStorage.getItem("unknown-yield-active-pack-v1"));
          const id = stored.fingerprint;
          return {
            id,
            scopedSave: localStorage.getItem("industrial-site-save-v15-pack-" + id) !== null,
            locale: stored.bundle.locale["material.powder.name"],
          };
        })()`);
        expect(packEvidence.id).toMatch(/^[a-f0-9]{64}$/);
        expect(packEvidence.scopedSave).toBe(true);
        expect(packEvidence.locale).toBe("Polished powder");
        await call("Page.reload", { ignoreCache: true });
        // CDP Page.reload acknowledges navigation start, not React hydration.
        // The static export and async persisted-pack verification both finish
        // before the test attempts to load a pack-scoped world.
        await sleep(900);
        await waitForExpression(
          `document.body.textContent?.includes("UNKNOWN YIELD") === true`,
        );
        await waitForExpression(
          `document.querySelector('button[aria-label="Game menu"]') !== null`,
        );
        await evaluate<boolean>(`(() => {
          document.querySelector('button[aria-label="Game menu"]')?.click();
          return true;
        })()`);
        await waitForExpression(
          `document.body.textContent?.includes("Offline content packs") === true`,
        );
        await waitForExpression(
          `[...document.querySelectorAll("button")].some(b => b.textContent?.includes("Start new expedition with built-in content"))`,
        );
        await evaluate<boolean>(`(() => {
          [...document.querySelectorAll("button")].find(b => b.textContent?.includes("Load saved world"))?.click();
          return true;
        })()`);
        await waitForExpression(
          `document.body.textContent?.includes("Site restored") === true`,
        );
        // A successful Load closes the menu, so reopen it before rollback.
        await evaluate<boolean>(`(() => {
          if (!document.body.textContent?.includes("Expedition controls"))
            document.querySelector('button[aria-label="Game menu"]')?.click();
          return true;
        })()`);
        await waitForExpression(
          `[...document.querySelectorAll("button")].some(b => b.textContent?.includes("Start new expedition with built-in content"))`,
        );
        await evaluate<boolean>(`(() => {
          [...document.querySelectorAll("button")].find(b => b.textContent?.includes("Start new expedition with built-in content"))?.click();
          return true;
        })()`);
        await waitForExpression(
          `localStorage.getItem("unknown-yield-active-pack-v1") === null`,
        );
        expect(
          await evaluate<boolean>(`(() => {
          const keys = Object.keys(localStorage);
          return keys.some(k => k.startsWith("industrial-site-save-v15-pack-"));
        })()`),
        ).toBe(true);
        console.log(
          "PHASE19_RUNTIME_PACK_BROWSER " +
            JSON.stringify({
              fingerprint: packEvidence.id,
              scopedSave: true,
              reload: true,
              rollback: true,
            }),
        );
        expect(runtimeErrors, runtimeErrors.join("\\n")).toEqual([]);
      }

      socket.close();
    } catch (error) {
      throw new Error(
        (error instanceof Error ? error.message : String(error)) +
          "\nNext dev output:\n" +
          serverLog.slice(-8000),
        { cause: error },
      );
    } finally {
      stop(browser);
      stop(server);
    }
  },
  300000,
);
