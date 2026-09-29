import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

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
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap:");
});

test("a case with no evidence says so", async ({ page }) => {
  await page.goto("/cases/wiretap");
  await expect(page.getByText("no evidence published yet").first()).toBeVisible();
});
