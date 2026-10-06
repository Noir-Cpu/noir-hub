import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const fixture = () => {
  const sites = ["hub", "informant", "wiretap", "witness", "dispatch"];
  const win = (probes: number, ok: number, full: boolean, gaps = 0) => ({ since: "2026-10-05T10:00:00.000Z", full, probes, ok, availability: ok / probes, expected: probes + gaps, gaps, longest_gap_min: gaps ? 60 : 10, p50_ms: 111, p95_ms: 222 });
  const now = new Date();
  return {
    generated_at: now.toISOString(),
    interval_minutes: 10,
    first_probe: "2026-10-05T10:00:00.000Z",
    sites: sites.map((id, i) => ({ id, name: id.toUpperCase(), url: `https://${id}.example/`, last: { t: now.toISOString(), ok: i !== 2, status: i !== 2 ? 200 : 503, ms: 111 }, windows: { "24h": win(40, 39, false, 1), "7d": win(40, 39, false), "30d": win(40, 39, false) } })),
  };
};
const SUMMARY = "https://raw.githubusercontent.com/Noir-Cpu/noir-hub/status/summary.json";

const pages = ["/", "/cases/witness", "/cases/dispatch", "/cases/informant", "/cases/wiretap", "/status", "/no-such-page"];

for (const path of pages) {
  test(`${path}: axe clean, no horizontal scroll, one h1`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(path === "/no-such-page" ? 404 : 200);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("h1")).toHaveCount(1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("dark scheme is axe clean on home and a case page", async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: "dark", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const path of ["/", "/cases/informant", "/status"]) {
    await page.goto(`http://localhost:4321${path}`);
    const results = await new AxeBuilder({ page }).withTags(["wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations, path).toEqual([]);
  }
  await ctx.close();
});

test("home: email button is visible, is a mailto link, and is reachable by keyboard", async ({ page }) => {
  await page.goto("/");
  const cta = page.getByRole("link", { name: /Email me.*oluwasegunbalogun@outlook\.com/ }).first();
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute("href", "mailto:oluwasegunbalogun@outlook.com");
  const box = await cta.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  // The call to action is on screen without scrolling, on phone and desktop.
  const viewport = page.viewportSize()!;
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  await cta.focus();
  await expect(cta).toBeFocused();
});

test("home: every section is present and nothing is wider than the viewport", async ({ page }) => {
  await page.goto("/");
  for (const id of ["about", "now", "projects", "teaching", "skills", "research", "contact"]) await expect(page.locator(`section#${id}`)).toBeVisible();
  const wide = await page.evaluate(() => [...document.querySelectorAll("main *")].filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && !e.closest(".table-wrap")).map((e) => e.tagName + "." + e.className));
  expect(wide).toEqual([]);
});

test("status: reads correctly with JavaScript off, and states the limits", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("http://localhost:4321/status");
  await expect(page.getByText("GitHub can delay or skip scheduled runs", { exact: false })).toBeVisible();
  await expect(page.locator("probe-data")).toContainText(/No uptime figures to show|Observed since/);
  await ctx.close();
});

test("status: with JavaScript, the uptime section refreshes from the status branch and says since when", async ({ page }) => {
  await page.route(SUMMARY, (r) => r.fulfill({ json: fixture(), headers: { "access-control-allow-origin": "*" } }));
  await page.goto("/status");
  await expect(page.locator("#uptime-note")).toContainText("Refreshed from the status branch");
  await expect(page.locator("probe-data")).toContainText("Observed since 2026-10-05");
  await expect(page.locator("probe-data")).toContainText("97.50%");
  await expect(page.locator("probe-data")).toContainText("not yet a full 30 day window");
  await expect(page.locator("probe-data")).toContainText("1 gap in the probes");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(wide).toBeLessThanOrEqual(0);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`status with live figures (including a down site) is axe clean, ${colorScheme}`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme, reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.route(SUMMARY, (r) => r.fulfill({ json: fixture(), headers: { "access-control-allow-origin": "*" } }));
    await page.goto("http://localhost:4321/status");
    await expect(page.locator("#uptime-note")).toContainText("Refreshed");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations).toEqual([]);
    await ctx.close();
  });
}

test("status: if the refresh fails the page keeps its build-time content", async ({ page }) => {
  await page.route("https://raw.githubusercontent.com/**", (r) => r.abort());
  await page.goto("/status");
  await expect(page.locator("#uptime-note")).toContainText("Could not refresh");
  await expect(page.locator("probe-data")).not.toBeEmpty();
});

test("home lists all four cases with status and case-number badges", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/John\s+Balogun/);
  for (const [n, name] of [["001", "WITNESS"], ["002", "DISPATCH"], ["003", "INFORMANT"], ["004", "WIRETAP"]]) {
    await expect(page.getByRole("link", { name })).toBeVisible();
    await expect(page.getByText(`[ ${n} ]`).first()).toBeVisible();
  }
});

test("brand: square corners, display font, keyboard reaches a case", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('900 1em "Archivo Variable"'))).toBe(true);
  const radius = await page.locator(".panel, .linkrow, .chips li, .row").first().evaluate((el) => getComputedStyle(el).borderRadius);
  expect(radius).toBe("0px");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});

test("meta: title, description, canonical, OG image and Person JSON-LD", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/John Balogun, NOIR/);
  expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(og).toMatch(/\/og\/home\.png$/);
  const img = await request.get(new URL(og!).pathname);
  expect(img.headers()["content-type"]).toBe("image/png");
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld["@type"]).toBe("Person");
  expect(ld.name).toBe("John Balogun");
  expect(ld.jobTitle).toBe("Computer Science Honours student");
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap:");
});

test("a case with no evidence says so", async ({ page }) => {
  await page.goto("/cases/wiretap");
  await expect(page.getByText("no evidence published yet").first()).toBeVisible();
});
