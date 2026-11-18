/* global window */
// Real-browser first-expedition playthrough (P7, #350). No save injection: every step is
// ordinary mouse/keyboard input against the static export.
// Usage: node scripts/e2e-first-expedition.mjs <baseUrl> <outDir>
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
// Playwright is not a project dependency; resolve it from the global install.
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve("playwright", { paths: [execSync("npm root -g").toString().trim(), process.cwd()] }));
const [base = "http://127.0.0.1:3150", out = "."] = process.argv.slice(2);
const X = 32, Y = 24;
const log = (...a) => console.log(...a);
const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (name) => page.screenshot({ path: `${out}/e2e-${name}.png` });
const wait = (ms) => page.waitForTimeout(ms);
async function screen(cx, cy) {
  const p = await page.evaluate(([x, y]) => window.__UNKNOWN_YIELD_PROJECT_WORLD__(x, y), [cx * X + X / 2, cy * Y + Y / 2]);
  const box = await page.locator("canvas").first().boundingBox();
  return { x: box.x + p.x * box.width, y: box.y + p.y * box.height };
}
async function click(cx, cy) { const s = await screen(cx, cy); await page.mouse.move(s.x, s.y); await wait(120); await page.mouse.click(s.x, s.y); await wait(200); }
async function drag(a, b) {
  const s = await screen(...a), e = await screen(...b);
  await page.mouse.move(s.x, s.y); await wait(120); await page.mouse.down(); await page.mouse.move(e.x, e.y, { steps: 8 }); await wait(120); await page.mouse.up(); await wait(250);
}
const tool = (name) => page.getByRole("button", { name: new RegExp("^" + name) }).first().click();
async function settle(ms) { const end = Date.now() + ms; while (Date.now() < end) { await acknowledge(); await wait(500); } }
async function acknowledge() { for (let i = 0; i < 6 && (await page.locator(".proclamation-scrim").count()); i++) { await page.keyboard.press("Enter"); await wait(450); } }
const hud = async () => (await page.locator("header").first().innerText()).replace(/\s+/g, " ");


/** Hold a build group button open (the same hold a player uses), then pick a related tool. */
async function groupTool(group, label) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const b = await page.locator(`nav[aria-label="Build tools"] [data-build-group="${group}"]`).boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down(); await wait(600 + attempt * 200); await page.mouse.up(); await wait(400);
    const item = page.locator(".build-submenu button", { hasText: label }).first();
    if (await item.count()) { await item.click(); await wait(200); return; }
    await page.keyboard.press("Escape"); await wait(200);
  }
  throw new Error("Build submenu never opened for " + group);
}

// ---------------------------------------------------------------- the playthrough
const must = (cond, msg) => { if (!cond) throw new Error("E2E FAILED: " + msg); log("ok  -", msg); };
const beat = () => page.locator("[data-onboarding-beat]").first().getAttribute("data-onboarding-beat").catch(() => "none");
const stats = async () => {
  const m = (await hud()).match(/(\d+) PLATES (\d+) FUEL/);
  return { plates: Number(m?.[1]), fuel: Number(m?.[2]), tools: (await page.locator('nav[aria-label="Build tools"]').innerText()).replace(/\s+/g, " ") };
};
async function toMenu() {
  await page.getByLabel("Game menu").click(); await wait(500);
  await page.getByRole("button", { name: /Return to Main Menu/ }).click(); await wait(800);
  if (await page.locator(".menu-danger").count()) await page.getByRole("button", { name: /Save & Return/ }).click();
  await page.waitForSelector(".menu-action", { timeout: 30000 });
}

await page.goto(base + "/?perf=1", { waitUntil: "networkidle" });
await page.waitForSelector(".menu-action", { timeout: 60000 });
await page.getByRole("button", { name: /Begin Assignment/ }).click(); await wait(1200);
await page.locator("input[type=text]").first().fill("Expedition A");
await page.getByRole("button", { name: /Create Expedition/ }).click();
await page.waitForSelector(".proclamation-card", { timeout: 60000 });
must((await page.locator(".proclamation-card").innerText()).includes("APPOINT"), "appointment poster on a new expedition");
await acknowledge();
await page.waitForFunction(() => typeof window.__UNKNOWN_YIELD_PROJECT_WORLD__ === "function" && window.__UNKNOWN_YIELD_PROJECT_WORLD__(500, 500) !== null);
must((await stats()).tools.includes("Extractor") && !(await stats()).tools.includes("Factory"), "only extractor and belt are issued at the start");

await tool("Extractor"); await click(18, 26); await wait(600);
must(await page.locator('.proclamation-scrim[data-proclamation-kind="authorization"]').count() === 1, "first extractor earns the premises authorization");
await acknowledge();
must((await beat()) === "physical-inventory", "brief advances to order B");
await tool("Factory"); await drag([24, 22], [33, 31]); await wait(500); await acknowledge();
await groupTool("factory", "Wall port"); await click(24, 27); await click(33, 27);
await tool("Furnace"); await click(27, 26);
await tool("Belt"); await drag([20, 27], [26, 27]); await drag([29, 27], [37, 27]);
await page.keyboard.press("Escape");
for (let i = 0; i < 90 && (await beat()) === "experiment"; i++) await wait(1000);
await settle(9000);
must((await beat()) !== "experiment", "a real, unknown furnace experiment produced evidence");
await page.getByLabel("Knowledge notebook").click(); await wait(700);
await shot("notebook");
await page.getByLabel("Knowledge notebook").click(); await wait(300); await settle(1500);
await page.getByRole("button", { name: /^Inspect/ }).click(); await click(26, 24);
await page.getByRole("button", { name: /Close roof/ }).click(); await wait(500);
await page.locator(".context-panel button", { hasText: /Open interior/ }).first().click(); await wait(500);
await settle(2000);
await page.getByLabel("Close panel").click().catch(() => {});
must((await beat()) === "complete", "orders reach complete after a real first export");
await page.getByLabel("Pause simulation").click(); await wait(600); // freeze so the comparison below is exact
const A = await stats();
must(A.tools.includes("Pressure line"), "expansion authorization issued by the first export");
await shot("A-complete");

await toMenu();
await page.getByRole("button", { name: /Resume Duty/ }).click();
await page.waitForSelector('nav[aria-label="Build tools"]', { timeout: 30000 }); await wait(1500); await acknowledge();
await page.getByLabel(/Pause|Resume/).first().evaluate((e) => e).catch(() => {}); const A2 = await stats();
log("A", JSON.stringify(A), "A2", JSON.stringify(A2));
// The resumed world is running again, so allow a few seconds of normal fuel burn; the plates and
// authorizations must be exactly as saved.
must(Math.abs(A2.plates - A.plates) <= 2 && Math.abs(A2.fuel - A.fuel) <= 8 && A2.tools === A.tools, "Expedition A resumes with its stock, fuel and authorizations intact");
must(await page.locator('.proclamation-scrim').count() === 0, "loading a slot replays no old proclamations");

await toMenu();
await page.getByRole("button", { name: /Begin Assignment/ }).click(); await wait(1200);
await page.locator("input[type=text]").first().fill("Expedition B");
await page.getByRole("button", { name: /Create Expedition/ }).click();
await page.waitForSelector("[data-onboarding-beat]", { timeout: 60000 }); await wait(1200); await acknowledge();
const B = await stats();
must(B.plates === 600 && B.fuel === 120 && !B.tools.includes("Wall port"), "Expedition B is a fresh, separate world");
await toMenu();
await page.getByRole("button", { name: /Personnel Archives/ }).click(); await wait(1000);
const list = await page.locator("body").innerText();
must(/Expedition A[\s\S]*units exported/.test(list) && list.includes("Expedition B") && !/Expedition A[^\n]*\b0 units exported/.test(list), "archive lists both expeditions; A keeps its export, B untouched");
await shot("archives");
must(errors.length === 0, "no uncaught page errors (" + errors.join("; ") + ")");
await browser.close();
log("E2E PASSED");
