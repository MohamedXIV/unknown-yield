import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { expect, it } from "vitest";

const browserIt = process.env.CI ? it : it.skip;
const appUrl = "http://127.0.0.1:4010/";
const debugPort = 9333;

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
        };
      })()`);

      expect(state.canvas).toBe(true);
      expect(state.extractor).not.toBeNull();
      expect(state.deep?.disabled).toBe("true");
      expect(state.atmosphere?.disabled).toBe("true");
      expect(state.sinterer?.disabled).toBe("false");

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
