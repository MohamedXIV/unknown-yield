import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fixture } from "@site/content";
import {
  Simulation,
  experimentEvidenceKey,
  initializeKnownMarkets,
  type GameCommand,
} from "@site/sim-core";
import { expect, it } from "vitest";

const browserIt = process.env.CI ? it : it.skip;
const appUrl = "http://127.0.0.1:4010/";
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
  "renders the Phase 10 tools truthfully in a real browser",
  async () => {
    const chrome = chromeExecutable();
    expect(chrome, "Chrome/Chromium must be available on the CI runner").toBeTruthy();

    const require = createRequire(import.meta.url);
    const nextBin = require.resolve("next/dist/bin/next");
    const server = spawn(
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
        };
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

      await call("Page.enable");
      await call("Runtime.enable");
      await call("Page.navigate", { url: appUrl });
      await waitForExpression(
        `document.readyState === "complete" &&
          !!document.querySelector("canvas") &&
          !!document.querySelector('nav[aria-label="Build tools"]')`,
      );

      const state = await evaluate<{
        canvas: boolean;
        extractor: { disabled: string | null } | null;
        deep: { disabled: string | null } | null;
        atmosphere: { disabled: string | null } | null;
        sinterer: { disabled: string | null } | null;
        relief: { disabled: string | null } | null;
      }>(`(() => {
        const button = (label) =>
          [...document.querySelectorAll('nav[aria-label="Build tools"] button')]
            .find((entry) => entry.getAttribute("aria-label") === label);
        const state = (label) => {
          const entry = button(label);
          return entry
            ? { disabled: entry.getAttribute("aria-disabled") }
            : null;
        };
        return {
          canvas: !!document.querySelector("canvas"),
          extractor: state("Extractor"),
          deep: state("Deep extractor"),
          atmosphere: state("Atmospheric intake"),
          sinterer: state("Sinterer"),
          relief: state("Relief furnace"),
        };
      })()`);

      expect(state.canvas).toBe(true);
      expect(state.extractor).not.toBeNull();
      expect(state.deep?.disabled).toBe("true");
      expect(state.atmosphere?.disabled).toBe("true");
      expect(state.sinterer?.disabled).toBe("false");
      expect(state.relief?.disabled).toBe("true");

      await evaluate(`(() => {
        const entry = [...document.querySelectorAll('nav[aria-label="Build tools"] button')]
          .find((button) => button.getAttribute("aria-label") === "Deep extractor");
        entry.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('[role="status"].toast.error')
          ?.textContent.includes("confirmed Heat result") === true`,
      );

      await evaluate(`(() => {
        const entry = [...document.querySelectorAll('nav[aria-label="Build tools"] button')]
          .find((button) => button.getAttribute("aria-label") === "Sinterer");
        entry.click();
        return true;
      })()`);
      await waitForExpression(
        `document.querySelector('button[aria-label="Sinterer"]')
          ?.getAttribute("aria-pressed") === "true"`,
      );
      await waitForExpression(
        `document.querySelector(".build-hint strong")?.textContent === "Sinterer"`,
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
          ) === true &&
          document.querySelector('button[aria-label="Relief furnace"]')
            ?.getAttribute("aria-disabled") === "false"`,
      );

      await evaluate(`(() => {
        document.querySelector('button[aria-label="Knowledge notebook"]')?.click();
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Home" }));
        window.dispatchEvent(new KeyboardEvent("keyup", { key: "Home" }));
        return true;
      })()`);

      const factoryPoint = await evaluate<{ x: number; y: number }>(`(() => {
        const canvas = document.querySelector("canvas");
        if (!canvas) throw new Error("Canvas missing");
        const rect = canvas.getBoundingClientRect();
        const X = 32, Y = 24;
        const zoom = Math.min(rect.width / (36 * X), rect.height / (27 * Y));
        const scrollX = 29 * X - rect.width / (2 * zoom);
        const scrollY = 30 * Y - rect.height / (2 * zoom);
        const worldX = 25.5 * X;
        const worldY = 24.5 * Y;
        return {
          x: rect.left + (worldX - scrollX) * zoom,
          y: rect.top + (worldY - scrollY) * zoom,
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
  90000,
);
