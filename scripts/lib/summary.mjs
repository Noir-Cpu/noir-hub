// Summary maths for the uptime probe. Pure functions, no I/O, so they can be unit tested.
//
// A record is one probe of one site: { t: ISO string, site: string, ok: boolean, status: number|null, ms: number|null }.
// Definitions (the status page and ADR 0005 repeat these):
//  - Window: the half-open interval (now - W, now]. A probe exactly W old is outside; one exactly at `now` is inside.
//  - Availability: ok probes / probes in the window. Missing probes (gaps) are unknown, never counted as down.
//  - Observed window: the window is clipped to the first probe the site has. `full` is false until a site has
//    been observed for the whole window, and the page must say "since <date>" instead of claiming 7 d or 30 d.
//  - Latency percentiles: nearest-rank over probes that were ok. A probe with no response has no latency.
//  - Gap: two consecutive probes of one site further apart than GAP_FACTOR x the interval (and the time from
//    the last probe to `now` counts too).

export const INTERVAL_MIN = 10;
export const GAP_FACTOR = 2.5;
export const WINDOWS = { "24h": 24 * 3600e3, "7d": 7 * 24 * 3600e3, "30d": 30 * 24 * 3600e3 };

/** Nearest-rank percentile (p in 0..100) of a numeric array; null when empty. */
export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[Math.min(rank, sorted.length) - 1];
}

/** Statistics for one site over one window ending at `nowMs`. `records` must all belong to the site. */
export function windowStats(records, nowMs, windowMs) {
  const start = nowMs - windowMs;
  const inWin = records
    .map((r) => ({ ...r, ms_t: Date.parse(r.t) }))
    .filter((r) => Number.isFinite(r.ms_t) && r.ms_t > start && r.ms_t <= nowMs)
    .sort((a, b) => a.ms_t - b.ms_t);
  if (!inWin.length) {
    return { since: null, full: false, probes: 0, ok: 0, availability: null, expected: 0, gaps: 0, longest_gap_min: 0, p50_ms: null, p95_ms: null };
  }
  const first = inWin[0].ms_t;
  const okRecords = inWin.filter((r) => r.ok);
  const latencies = okRecords.map((r) => r.ms).filter((m) => typeof m === "number" && Number.isFinite(m));
  const limit = GAP_FACTOR * INTERVAL_MIN * 60e3;
  let gaps = 0;
  let longest = 0;
  for (let i = 1; i <= inWin.length; i++) {
    const to = i < inWin.length ? inWin[i].ms_t : nowMs;
    const span = to - inWin[i - 1].ms_t;
    if (span > limit) gaps++;
    if (span > longest) longest = span;
  }
  // Whether the whole window has been observed: the first probe of the site, not of the window.
  const siteFirst = Math.min(...records.map((r) => Date.parse(r.t)).filter(Number.isFinite));
  return {
    since: new Date(first).toISOString(),
    full: siteFirst <= start,
    probes: inWin.length,
    ok: okRecords.length,
    availability: okRecords.length / inWin.length,
    expected: Math.floor((nowMs - first) / (INTERVAL_MIN * 60e3)) + 1,
    gaps,
    longest_gap_min: Math.round(longest / 60e3),
    p50_ms: percentile(latencies, 50),
    p95_ms: percentile(latencies, 95),
  };
}

/** Build the whole summary.json object. */
export function summarise(records, sites, now = new Date()) {
  const nowMs = now.getTime();
  const valid = records.filter((r) => Number.isFinite(Date.parse(r.t)) && Date.parse(r.t) <= nowMs);
  const firstAll = valid.length ? new Date(Math.min(...valid.map((r) => Date.parse(r.t)))).toISOString() : null;
  return {
    generated_at: now.toISOString(),
    interval_minutes: INTERVAL_MIN,
    first_probe: firstAll,
    sites: sites.map((s) => {
      const mine = valid.filter((r) => r.site === s.id);
      const last = mine.reduce((a, b) => (!a || Date.parse(b.t) > Date.parse(a.t) ? b : a), null);
      return {
        id: s.id,
        name: s.name,
        url: s.url,
        last: last ? { t: last.t, ok: last.ok, status: last.status, ms: last.ms } : null,
        windows: Object.fromEntries(Object.entries(WINDOWS).map(([k, ms]) => [k, windowStats(mine, nowMs, ms)])),
      };
    }),
  };
}
