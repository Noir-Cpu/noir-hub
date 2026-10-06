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

/**
 * Visible text only: no scripts, styles or JSON-LD. Text inside <probe-data> (the uptime figures read from the
 * probe's summary.json) is removed here and checked by its own tests below, because it is the one place where
 * percentages and milliseconds are real measurements.
 */
const visibleText = (html: string) =>
  html.replace(/<probe-data[\s\S]*?<\/probe-data>/g, " ").replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ").replace(/\s+/g, " ");

// A measured-looking number: a figure with a unit, percentage, or claim of users.
const METRIC = /\b\d[\d,.]*\s?(%|ms|s\/req|req\/s|rps|users?|visitors?|downloads?|stars?|x faster)\b|\bp9[59]\b|\b(lorem ipsum|placeholder|todo|tbd|coming soon)\b|\bXX+\b|\{\{|\bundefined\b|\bNaN\b|\[object Object\]/i;

// Things that must never be published. John's own phone number is deliberately not written in this repository,
// so the phone check is shape-based: any run of nine or more digits that is not an ISO date.
const NEVER_PUBLISH = /\b(GPA|cum laude|distinction|first[- ]class|B\.?\s?Eng|citizen(ship)?|visa|passport|work permit|residency permit|ID number)\b|\b(grade|mark|average|score)s?\s+(of|was|were|is)\s+\d|\b\d{2,3}\s?%/i;
function phoneLike(text: string): string | undefined {
  const noDates = text.replace(/\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?/g, " ");
  for (const m of noDates.matchAll(/\+?\(?\d[\d\s().-]{6,}\d/g)) {
    if (m[0].replace(/\D/g, "").length >= 9) return m[0];
  }
  return undefined;
}

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

  for (const f of files) {
    const name = f.slice(DIST.length + 1);
    it(`${name}: no phone number, grade, citizenship or unfinished-degree text`, () => {
      const html = readFileSync(f, "utf8");
      const text = visibleText(html);
      expect(phoneLike(text), `phone-like number in ${name}`).toBeUndefined();
      expect(phoneLike(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? ""), `phone-like number in JSON-LD of ${name}`).toBeUndefined();
      expect(html).not.toMatch(/href="tel:|"telephone"/i);
      const m = text.match(NEVER_PUBLISH);
      expect(m?.[0], `found "${m?.[0]}" in ${name}`).toBeUndefined();
    });
  }

  it("hosts no CV or other PDF", () => {
    const all = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? all(join(dir, f)) : [join(dir, f)]));
    expect(all(DIST).filter((f) => /\.(pdf|docx?)$/i.test(f))).toEqual([]);
  });

  it("case pages show the load test as missing and the uptime as either missing or a measured figure", () => {
    for (const slug of ["witness", "dispatch", "informant", "wiretap"]) {
      const html = readFileSync(join(DIST, "cases", `${slug}.html`), "utf8");
      expect(visibleText(html)).toMatch(/Load test no evidence published yet/);
      const measured = html.match(/<dt>Uptime<\/dt>\s*<dd>\s*<probe-data[^>]*>([\s\S]*?)<\/probe-data>/)?.[1];
      if (measured) expect(measured).toMatch(/of \d+ probes since \d{4}-\d{2}-\d{2}/);
      else expect(visibleText(html)).toMatch(/Uptime no evidence published yet/);
    }
  });

  it("home: email is the call to action, as visible text and a mailto link, in the hero and in Contact", () => {
    const html = readFileSync(join(DIST, "index.html"), "utf8");
    const email = "oluwasegunbalogun@outlook.com";
    expect(html.split(`href="mailto:${email}"`).length - 1).toBeGreaterThanOrEqual(2);
    expect(visibleText(html.match(/<section class="hero"[\s\S]*?<\/section>/)![0])).toContain(email);
    expect(visibleText(html.match(/<section class="band" id="contact"[\s\S]*?<\/section>/)![0])).toContain(email);
    expect(html).toContain("https://www.linkedin.com/in/john-balogun");
    expect(html).toContain("https://github.com/Noir-Cpu");
  });

  it("home has the sections in order: hero, about, now, projects, teaching and work, skills, research, contact", () => {
    const html = readFileSync(join(DIST, "index.html"), "utf8");
    const ids = [...html.matchAll(/<section[^>]*?(?:id="([a-z]+)"|class="hero")/g)].map((m) => m[1] ?? "hero");
    expect(ids).toEqual(["hero", "about", "now", "projects", "teaching", "skills", "research", "contact"]);
  });

  it("home JSON-LD is a Person with the agreed fields", () => {
    const html = readFileSync(join(DIST, "index.html"), "utf8");
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]!);
    expect(ld["@type"]).toBe("Person");
    expect(ld.name).toBe("John Balogun");
    expect(ld.jobTitle).toBe("Computer Science Honours student");
    expect(ld.alumniOf.name).toBe("Stellenbosch University");
    expect(ld.affiliation.name).toBe("Stellenbosch University");
    expect(ld.sameAs).toEqual(["https://github.com/Noir-Cpu", "https://www.linkedin.com/in/john-balogun"]);
    expect(ld.url).toBe("https://noir-hub.noir-cpu.workers.dev");
    expect(ld.email).toBe("mailto:oluwasegunbalogun@outlook.com");
  });

  it("every page has OpenGraph and Twitter cards with an absolute image URL", () => {
    for (const f of files) {
      const html = readFileSync(f, "utf8");
      for (const k of ["og:title", "og:description", "og:image", "og:url", "twitter:title", "twitter:description", "twitter:image"]) {
        expect(html, `${k} in ${f}`).toMatch(new RegExp(`(property|name)="${k}" content="[^"]+"`));
      }
      expect(html.match(/property="og:image" content="([^"]+)"/)![1]).toMatch(/^https:\/\/noir-hub\.noir-cpu\.workers\.dev\/og\/[a-z]+\.png$/);
    }
  });

  it("sitemap lists every page", () => {
    const xml = readFileSync(join(DIST, "sitemap.xml"), "utf8");
    for (const p of ["", "/status", "/cases/witness", "/cases/dispatch", "/cases/informant", "/cases/wiretap"]) {
      expect(xml).toContain(`<loc>https://noir-hub.noir-cpu.workers.dev${p || "/"}</loc>`);
    }
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  });

  it("status page states the limits in plain HTML, with or without JavaScript", () => {
    const text = visibleText(readFileSync(join(DIST, "status.html"), "utf8"));
    expect(text).toMatch(/GitHub can delay or skip scheduled runs, so there are gaps/);
    expect(text).toMatch(/one place, GitHub.s network/);
    expect(text).toMatch(/not a service-level agreement/);
  });

  it("status page uptime figures exist only with a first-probe date and probe counts", () => {
    const html = readFileSync(join(DIST, "status.html"), "utf8");
    const measured = html.match(/<probe-data[^>]*>([\s\S]*?)<\/probe-data>/)![1]!;
    if (/%|\bms\b/.test(measured.replace(/<[^>]+>/g, " "))) {
      expect(measured).toMatch(/Observed since <strong>\d{4}-\d{2}-\d{2}<\/strong>/);
      expect(measured).toMatch(/\d+\u00a0probes in the last 30 days/);
    } else {
      expect(measured).toMatch(/No uptime figures to show/);
    }
  });

  it("pairs NOIR with the real name in every title", () => {
    for (const f of files) {
      const title = readFileSync(f, "utf8").match(/<title>(.*?)<\/title>/)?.[1] ?? "";
      expect(title, f).toContain("John Balogun, NOIR");
    }
  });
});
