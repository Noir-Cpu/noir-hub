/**
 * Renders the uptime section from summary.json. Used twice: at build time (static HTML, so the page reads
 * correctly with JavaScript off) and in the browser (progressive refresh), so both always show the same thing.
 * summary.json comes over the network, so every value is validated and escaped here.
 */

export type WindowStats = {
  since: string | null;
  full: boolean;
  probes: number;
  ok: number;
  availability: number | null;
  expected: number;
  gaps: number;
  longest_gap_min: number;
  p50_ms: number | null;
  p95_ms: number | null;
};
export type SiteSummary = {
  id: string;
  name: string;
  url: string;
  last: { t: string; ok: boolean; status: number | null; ms: number | null } | null;
  windows: Record<"24h" | "7d" | "30d", WindowStats>;
};
export type Summary = { generated_at: string; interval_minutes: number; first_probe: string | null; sites: SiteSummary[] };

export const SUMMARY_URL = "https://raw.githubusercontent.com/Noir-Cpu/noir-hub/status/summary.json";
export const STALE_AFTER_MIN = 60;

const WINDOW_LABEL = { "24h": "24 hours", "7d": "7 days", "30d": "30 days" } as const;
const isIso = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(v) && !Number.isNaN(Date.parse(v));
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;
const isMs = (v: unknown): v is number | null => v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0);

function validWindow(w: any): w is WindowStats {
  return (
    w && (w.since === null || isIso(w.since)) && typeof w.full === "boolean" && isCount(w.probes) && isCount(w.ok) && w.ok <= w.probes &&
    isCount(w.expected) && isCount(w.gaps) && isCount(w.longest_gap_min) && isMs(w.p50_ms) && isMs(w.p95_ms)
  );
}

/** Shape check for data that arrived over the network. */
export function parseSummary(raw: unknown): Summary | null {
  const s = raw as any;
  if (!s || !isIso(s.generated_at) || !(s.first_probe === null || isIso(s.first_probe)) || !Array.isArray(s.sites)) return null;
  for (const site of s.sites) {
    if (typeof site?.id !== "string" || typeof site.name !== "string" || typeof site.url !== "string") return null;
    if (site.last !== null && !(isIso(site.last?.t) && typeof site.last.ok === "boolean" && isMs(site.last.ms))) return null;
    for (const k of ["24h", "7d", "30d"]) if (!validWindow(site.windows?.[k])) return null;
  }
  return s as Summary;
}

export const esc = (v: unknown) =>
  String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const fmtUtc = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

/** Availability as a percentage, cut (never rounded up) to two decimals, so one failed probe never shows as 100%. */
export function fmtAvailability(ok: number, probes: number): string {
  if (probes === 0) return "no data";
  if (ok === probes) return "100%";
  return `${(Math.floor((ok * 10000) / probes) / 100).toFixed(2)}%`;
}

const ms = (v: number | null) => (v === null ? "n/a" : `${Math.round(v)}\u00a0ms`);
const safeHref = (u: string) => (/^https:\/\/[a-z0-9.-]+(\/[^\s"'<>]*)?$/i.test(u) ? u : null);

function windowRow(key: keyof typeof WINDOW_LABEL, w: WindowStats): string {
  const notes: string[] = [];
  if (w.probes > 0 && !w.full) notes.push(`Observed since ${esc(w.since!.slice(0, 10))}; not yet a full ${WINDOW_LABEL[key].replace(/s$/, "")} window.`);
  if (w.gaps > 0) notes.push(`${w.gaps} gap${w.gaps === 1 ? "" : "s"} in the probes, longest ${w.longest_gap_min}\u00a0minutes. Gaps are not counted as downtime.`);
  const row = `<tr><th scope="row">${WINDOW_LABEL[key]}</th><td>${esc(fmtAvailability(w.ok, w.probes))}</td><td>${w.probes}<span class="muted"> / ${w.expected}</span></td><td>${ms(w.p50_ms)}</td><td>${ms(w.p95_ms)}</td></tr>`;
  return notes.length ? row + `<tr class="note"><td colspan="5">${notes.join(" ")}</td></tr>` : row;
}

export function renderUptime(summary: Summary | null, now: Date, reason = "no probe results have been published yet"): string {
  if (!summary || summary.first_probe === null) {
    return `<p class="muted">No uptime figures to show: ${esc(reason)}. The probe stores one result per site every 10 minutes; this section fills in when the first results exist.</p>`;
  }
  const last = summary.sites.flatMap((s) => (s.last ? [s.last.t] : [])).sort().at(-1);
  const ageMin = last ? Math.round((now.getTime() - Date.parse(last)) / 60000) : null;
  const stale = ageMin === null || ageMin > STALE_AFTER_MIN;
  const total = summary.sites.reduce((n, s) => n + s.windows["30d"].probes, 0);
  const head =
    `<p>Observed since <strong>${esc(summary.first_probe.slice(0, 10))}</strong> (first probe ${esc(fmtUtc(summary.first_probe))}). ` +
    `${total}\u00a0probes in the last 30 days across ${summary.sites.length}\u00a0site${summary.sites.length === 1 ? "" : "s"}. Latest probe ${last ? esc(fmtUtc(last)) : "unknown"}.</p>` +
    (stale
      ? `<p class="notice"><strong>The latest probe is more than an hour old${ageMin === null ? "" : ` (${ageMin}\u00a0minutes)`}.</strong> Scheduled runs may be delayed or have stopped, so the figures below could be out of date.</p>`
      : "");
  const sites = summary.sites
    .map((s) => {
      const href = safeHref(s.url);
      const name = href ? `<a href="${esc(href)}">${esc(s.name)}</a>` : esc(s.name);
      const state = s.last
        ? `<span class="status" data-status="${s.last.ok ? "live" : "down"}"><i aria-hidden="true"></i>${s.last.ok ? "up" : "down"}</span> <span class="muted">last probe ${esc(fmtUtc(s.last.t))}${s.last.status ? `, HTTP ${s.last.status}` : ", no response"}${s.last.ms !== null ? `, ${esc(ms(s.last.ms))}` : ""}</span>`
        : `<span class="muted">not probed yet</span>`;
      return `<section class="site" aria-labelledby="up-${esc(s.id)}"><div class="site-head"><h3 id="up-${esc(s.id)}">${name}</h3><p>${state}</p></div>` +
        `<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(s.name)} availability and latency by window"><table class="uptime"><thead><tr><th scope="col">Window</th><th scope="col">Available</th><th scope="col">Probes / expected</th><th scope="col">p50</th><th scope="col">p95</th></tr></thead><tbody>` +
        (["24h", "7d", "30d"] as const).map((k) => windowRow(k, s.windows[k])).join("") +
        `</tbody></table></div></section>`;
    })
    .join("");
  return head + sites;
}
