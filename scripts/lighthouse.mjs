// Runs Lighthouse against the built site (npm run build first). Prints real scores; writes nothing to git.
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const port = 4322;
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".xml": "application/xml", ".txt": "text/plain" };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x").pathname;
  const candidates = [url, `${url}.html`, `${url}/index.html`].map((u) => join("dist", normalize(u)));
  for (const f of candidates) {
    try {
      if (!(await stat(f)).isFile()) continue;
      res.writeHead(200, { "content-type": types[extname(f)] ?? "application/octet-stream", "cache-control": "public, max-age=31536000" });
      return res.end(await readFile(f));
    } catch {}
  }
  res.writeHead(404).end("not found");
}).listen(port, "127.0.0.1");
const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ["--headless=new", "--no-sandbox"] });
mkdirSync("lighthouse-report", { recursive: true });
const rows = [];
try {
  for (const form of ["mobile", "desktop"]) {
    for (const path of ["/", "/cases/witness", "/status"]) {
      const cfg = form === "desktop" ? { extends: "lighthouse:default", settings: { formFactor: "desktop", screenEmulation: { disabled: true }, throttlingMethod: "simulate", throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 } } } : undefined;
      const r = await lighthouse(`http://127.0.0.1:${port}${path}`, { port: chrome.port, output: "json", logLevel: "error" }, cfg);
      if (r.lhr.runtimeError) console.error(r.lhr.runtimeError.message);
      const c = r.lhr.categories;
      rows.push({ form, path, performance: Math.round(c.performance.score * 100), accessibility: Math.round(c.accessibility.score * 100), bestPractices: Math.round(c["best-practices"].score * 100), seo: Math.round(c.seo.score * 100) });
    }
  }
} finally {
  await chrome.kill();
  server.close();
}
console.table(rows);
writeFileSync("lighthouse-report/scores.json", JSON.stringify(rows, null, 2));
