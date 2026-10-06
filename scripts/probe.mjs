// Probe every site once, append the results to <dir>/data/YYYY-MM.jsonl and rewrite <dir>/summary.json.
// Usage: node scripts/probe.mjs <dir>
// Exit code is 0 whatever the sites did: an outage is a data point, not a workflow failure.
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { probeSite } from "./lib/probe.mjs";
import { summarise, WINDOWS } from "./lib/summary.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/probe.mjs <dir>");
  process.exit(2);
}
const sites = JSON.parse(readFileSync(join(here, "probe-sites.json"), "utf8"));
const results = await Promise.all(sites.map((s) => probeSite(s))); // one request per site, different hosts in parallel

const dataDir = join(dir, "data");
mkdirSync(dataDir, { recursive: true });
const month = results[0].t.slice(0, 7);
appendFileSync(join(dataDir, `${month}.jsonl`), results.map((r) => JSON.stringify(r)).join("\n") + "\n");

// Read only the monthly files that can overlap the longest window.
const cutoff = Date.now() - Math.max(...Object.values(WINDOWS));
const records = [];
for (const f of readdirSync(dataDir).filter((n) => /^\d{4}-\d{2}\.jsonl$/.test(n)).sort()) {
  const [y, m] = f.slice(0, 7).split("-").map(Number);
  if (Date.UTC(y, m, 1) <= cutoff) continue; // the whole file ends before the window starts
  for (const line of readFileSync(join(dataDir, f), "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      // A torn line is skipped, not fatal.
    }
  }
}
const summary = summarise(records, sites);
// first_probe describes the whole history, which may be older than the files read above.
const prevPath = join(dir, "summary.json");
if (existsSync(prevPath)) {
  try {
    const prev = JSON.parse(readFileSync(prevPath, "utf8"));
    if (prev.first_probe && (!summary.first_probe || prev.first_probe < summary.first_probe)) summary.first_probe = prev.first_probe;
  } catch {
    // An unreadable previous summary is replaced.
  }
}
writeFileSync(prevPath, JSON.stringify(summary, null, 2) + "\n");
if (!existsSync(join(dir, "README.md"))) {
  writeFileSync(
    join(dir, "README.md"),
    "# status branch\n\nWritten only by `.github/workflows/probe.yml` in Noir-Cpu/noir-hub. `data/YYYY-MM.jsonl` holds one JSON line per site per probe; `summary.json` is recomputed on every run. See docs/adr/0005-uptime-probe.md on main for the design and its limits. Nothing here is hand edited.\n",
  );
}

for (const r of results) console.log(`${r.ok ? "up  " : "DOWN"} ${r.site.padEnd(10)} ${String(r.status ?? "-").padEnd(4)} ${r.ms ?? "-"} ms${r.err ? `  (${r.err})` : ""}`);
