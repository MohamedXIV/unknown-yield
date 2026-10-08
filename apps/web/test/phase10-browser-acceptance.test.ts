import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fixture, enCatalog } from "@site/content";
import { createContentStore, serializeStudioBundle } from "@site/content/studio";
import { createStudioEntity, setStudioLocaleText } from "../game/studio-workbench";
import {
  Simulation,
  experimentEvidenceKey,
  initializeKnownMarkets,
  type GameCommand,
} from "@site/sim-core";
import { expect, it } from "vitest";

function runtimePackBrowserFixture(): string {
  const store = createContentStore(fixture, enCatalog);
  store.setCell("meta", "content", "version", "world-01-v14-browser-content-pack");
  createStudioEntity(store, "material", "powder");
  createStudioEntity(store, "operation", "polish");
  createStudioEntity(store, "machine", "polisher");
  createStudioEntity(store, "reaction", "polish-raw");
  store.setCell("materials", "powder", "color", "#8899aa");
  setStudioLocaleText(store, "material.powder.name", "Polished powder");
  setStudioLocaleText(store, "operation.polish.name", "Polish");
  setStudioLocaleText(store, "machine.polisher.name", "Polisher");
  setStudioLocaleText(store, "reaction.polish-raw.observation", "Polishing produces powder.");
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
const productionBrowser = browserAcceptanceMode === "production";
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
  expect(
    sim.command({ type: "rotateDivert", beltId: diverterId }).ok,
  ).toBe(true);
  expect(
    sim.command({ type: "rotateDivert", beltId: diverterId }).ok,
  ).toBe(true);

  return {
    save: sim.serialize(),
    factoryId,
    machineId,
    diverterId,
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
      ? join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe")
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
  return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null;
}

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
    expect(chrome, "Chrome/Chromium must be available on the CI runner").toBeTruthy();

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
        socket.addEventListener("error", () => reject(new Error("CDP socket failed")), {
          once: true,
        });
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
          runtimeErrors.push(detail?.exception?.description ?? detail?.text ?? "Unspecified JS exception");
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
        await submenuState("solid-logistics", ["Underground belt", "Elevated gantry"]),
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
        x: number; y: number; width: number; height: number;
      }>(`(() => {
        const canvas = document.querySelector(".world-host canvas");
        if (!canvas) throw new Error("Canvas missing");
        const rect = canvas.getBoundingClientRect();
        return { x: 640 - rect.left, y: 420 - rect.top,
          width: canvas.width, height: canvas.height };
      })()`);
      const worldAtWheel = (view: { scrollX: number; scrollY: number; zoom: number }) => ({
        x: view.scrollX + wheelViewport.width / 2 +
          (wheelViewport.x - wheelViewport.width / 2) / view.zoom,
        y: view.scrollY + wheelViewport.height / 2 +
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
      await evaluate<void>(`new Promise((resolve) => setTimeout(resolve, 500))`);
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

      const touchPanBefore = await evaluate<{ scrollX: number; scrollY: number }>(
        `window.__UNKNOWN_YIELD_CAMERA__()`,
      );
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
      const screenshotData = (screenshotResult as unknown as { data?: string }).data;
      expect(screenshotData, "Mobile screenshot data must be captured").toBeTruthy();
      const screenshotBytes = Buffer.from(screenshotData!, "base64");
      const screenshotSha256 = createHash("sha256")
        .update(screenshotBytes)
        .digest("hex");
      const frameReport = await evaluate<unknown>(
        `window.__UNKNOWN_YIELD_PERF__?.report() ?? null`,
      );
      // The screenshot bytes are NOT persisted as an Actions artifact.
      // Log size/digest and data provenance for the integrated exit review.
      console.log("PHASE18_INTEGRATED_BROWSER_EVIDENCE " + JSON.stringify({
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
      }));
      expect(runtimeErrors, runtimeErrors.join("\n")).toEqual([]);

      if (productionBrowser) {
        // Real prebuilt browser, no Studio route or code rebuild: inject an
        // actual exported Studio JSON as a file-input change (not a sim shortcut).
        const payload = runtimePackBrowserFixture();
        await evaluate<boolean>(`(() => {
          const menu = document.querySelector('button[aria-label="Game menu"]');
          menu?.click();
          return true;
        })()`);
        await waitForExpression(`document.querySelector('input[aria-label="Choose Studio JSON content pack"]') !== null`);
        await evaluate<boolean>(`(() => {
          const input = document.querySelector('input[aria-label="Choose Studio JSON content pack"]');
          const file = new File([\${JSON.stringify(payload)}], "studio-playtest.json", { type: "application/json" });
          const transfer = new DataTransfer();
          transfer.items.add(file);
          input.files = transfer.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        })()`);
        await waitForExpression(`[...document.querySelectorAll("button")].some(b => b.textContent?.includes("Play new expedition with imported pack"))`);
        await evaluate<boolean>(`(() => {
          [...document.querySelectorAll("button")].find(b => b.textContent?.includes("Play new expedition with imported pack"))?.click();
          return true;
        })()`);
        await waitForExpression(`localStorage.getItem("unknown-yield-active-pack-v1") !== null`);
        await evaluate<boolean>(`(() => {
          document.querySelector('button[aria-label="Game menu"]')?.click();
          return true;
        })()`);
        await waitForExpression(`document.body.textContent?.includes("Imported ·") === true`);
        await evaluate<boolean>(`(() => {
          [...document.querySelectorAll("button")].find(b => b.textContent?.includes("Save world"))?.click();
          return true;
        })()`);
        const packEvidence = await evaluate<{ id: string; scopedSave: boolean; locale: string }>(`(() => {
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
        await waitForExpression(`document.body.textContent?.includes("UNKNOWN YIELD") === true`);
        await waitForExpression(`document.querySelector('button[aria-label="Game menu"]') !== null`);
        await evaluate<boolean>(`(() => {
          document.querySelector('button[aria-label="Game menu"]')?.click();
          return true;
        })()`);
        await waitForExpression(`document.body.textContent?.includes("Imported ·") === true`);
        await evaluate<boolean>(`(() => {
          [...document.querySelectorAll("button")].find(b => b.textContent?.includes("Load saved world"))?.click();
          return true;
        })()`);
        expect(await evaluate<boolean>(`document.body.textContent?.includes("Site restored") === true`)).toBe(true);
        await evaluate<boolean>(`(() => {
          [...document.querySelectorAll("button")].find(b => b.textContent?.includes("Start new expedition with built-in content"))?.click();
          return true;
        })()`);
        await waitForExpression(`localStorage.getItem("unknown-yield-active-pack-v1") === null`);
        expect(await evaluate<boolean>(`(() => {
          const keys = Object.keys(localStorage);
          return keys.some(k => k.startsWith("industrial-site-save-v15-pack-"));
        })()`)).toBe(true);
        console.log("PHASE19_RUNTIME_PACK_BROWSER " + JSON.stringify({ fingerprint: packEvidence.id, scopedSave: true, reload: true, rollback: true }));
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
  120000,
);
