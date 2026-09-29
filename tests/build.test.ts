import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Runs against dist/. `npm test` is run after `npm run build` in CI and locally.
const DIST = join(process.cwd(), "dist");

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (f === "_astro") return [];
    return statSync(p).isDirectory() ? htmlFiles(p) : p.endsWith(".html") ? [p] : [];
  });
}

/** Visible text only: no scripts, styles or JSON-LD. */
const visibleText = (html: string) =>
  html.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ").replace(/\s+/g, " ");

// A measured-looking number: a figure with a unit, percentage, or claim of users.
const METRIC = /\b\d[\d,.]*\s?(%|ms|s\/req|req\/s|rps|users?|visitors?|downloads?|stars?|x faster)\b|\bp9[59]\b|\b(lorem ipsum|placeholder|todo|tbd|coming soon)\b|\bXX+\b|\{\{|\bundefined\b|\bNaN\b|\[object Object\]/i;

describe.skipIf(!existsSync(DIST))("built site", () => {
  const files = existsSync(DIST) ? htmlFiles(DIST) : [];

  it("has the expected pages", () => {
    const names = files.map((f) => f.slice(DIST.length + 1)).sort();
    expect(names).toEqual(["404.html", "cases/dispatch.html", "cases/informant.html", "cases/wiretap.html", "cases/witness.html", "index.html", "status.html"]);
  });

  for (const f of files) {
    const name = f.slice(DIST.length + 1);
    it(`${name}: no invented metric or placeholder text`, () => {
      const text = visibleText(readFileSync(f, "utf8"));
      const m = text.match(METRIC);
      expect(m?.[0], `found "${m?.[0]}" in ${name}`).toBeUndefined();
    });
  }

  it("case pages show 'no evidence published yet' for load test and uptime", () => {
    for (const slug of ["witness", "dispatch", "informant", "wiretap"]) {
      const text = visibleText(readFileSync(join(DIST, "cases", `${slug}.html`), "utf8"));
      expect(text).toMatch(/Load test no evidence published yet/);
      expect(text).toMatch(/Uptime no evidence published yet/);
    }
  });

  it("pairs NOIR with the real name in every title", () => {
    for (const f of files) {
      const title = readFileSync(f, "utf8").match(/<title>(.*?)<\/title>/)?.[1] ?? "";
      expect(title, f).toContain("John Balogun, NOIR");
    }
  });
});
