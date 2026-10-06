import { describe, expect, it } from "vitest";
import { INTERVAL_MIN, percentile, summarise, windowStats, WINDOWS } from "../scripts/lib/summary.mjs";

const NOW = Date.parse("2026-10-10T12:00:00Z");
const MIN = 60e3;
const at = (minsAgo: number) => new Date(NOW - minsAgo * MIN).toISOString();
const rec = (minsAgo: number, ok = true, ms: number | null = 100, site = "a") => ({ t: at(minsAgo), site, ok, status: ok ? 200 : 500, ms });
const H24 = WINDOWS["24h"];

describe("percentile (nearest rank)", () => {
  it("returns null for no data", () => expect(percentile([], 50)).toBeNull());
  it("returns the only value for one sample", () => {
    expect(percentile([7], 50)).toBe(7);
    expect(percentile([7], 95)).toBe(7);
  });
  it("uses ceil(p/100 * n) on the sorted values, whatever the input order", () => {
    const v = [50, 10, 40, 20, 30];
    expect(percentile(v, 50)).toBe(30);
    expect(percentile(v, 95)).toBe(50);
    expect(percentile(v, 20)).toBe(10);
    expect(percentile(v, 21)).toBe(20);
  });
  it("for an even count, p50 is the lower middle value", () => expect(percentile([1, 2, 3, 4], 50)).toBe(2));
  it("p95 of 100 samples is the 95th", () => {
    const v = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(v, 95)).toBe(95);
    expect(percentile(v, 100)).toBe(100);
  });
  it("does not mutate its input", () => {
    const v = [3, 1, 2];
    percentile(v, 50);
    expect(v).toEqual([3, 1, 2]);
  });
});

describe("window boundaries", () => {
  it("excludes a probe exactly one window old and includes one just inside", () => {
    const s = windowStats([rec(24 * 60, true), rec(24 * 60 - 1, true), rec(0, true)], NOW, H24);
    expect(s.probes).toBe(2);
    expect(s.since).toBe(at(24 * 60 - 1));
  });
  it("includes a probe exactly at now and ignores probes in the future", () => {
    const s = windowStats([rec(0), rec(-5)], NOW, H24);
    expect(s.probes).toBe(1);
  });
  it("marks the window full only when the site was observed before the window started", () => {
    expect(windowStats([rec(24 * 60 + 30), rec(10)], NOW, H24).full).toBe(true);
    expect(windowStats([rec(24 * 60 - 30), rec(10)], NOW, H24).full).toBe(false);
  });
  it("clips 7 d and 30 d to what was observed instead of claiming the whole window", () => {
    const records = [rec(120), rec(110), rec(100, false)];
    const week = windowStats(records, NOW, WINDOWS["7d"]);
    expect(week.full).toBe(false);
    expect(week.since).toBe(at(120));
    expect(week.probes).toBe(3);
    expect(week.availability).toBeCloseTo(2 / 3);
  });
  it("reports no availability, not 100%, when a window has no probes", () => {
    const s = windowStats([rec(60 * 24 * 3)], NOW, H24);
    expect(s.probes).toBe(0);
    expect(s.availability).toBeNull();
    expect(s.p50_ms).toBeNull();
  });
});

describe("gaps", () => {
  const every10 = (from: number, to: number) => Array.from({ length: Math.floor((from - to) / 10) + 1 }, (_, i) => rec(from - i * 10));
  it("finds no gaps in a steady series that ends at now", () => {
    const s = windowStats(every10(120, 0), NOW, H24);
    expect(s.gaps).toBe(0);
    expect(s.longest_gap_min).toBe(10);
    expect(s.expected).toBe(13);
    expect(s.probes).toBe(13);
  });
  it("counts a delayed run as a gap and does not count the gap as downtime", () => {
    const series = [...every10(120, 70), ...every10(10, 0)]; // nothing between 70 and 10 minutes ago
    const s = windowStats(series, NOW, H24);
    expect(s.gaps).toBe(1);
    expect(s.longest_gap_min).toBe(60);
    expect(s.availability).toBe(1);
    expect(s.probes).toBeLessThan(s.expected);
  });
  it("tolerates GitHub jitter below 2.5 intervals", () => {
    const s = windowStats([rec(60), rec(40), rec(15), rec(0)], NOW, H24); // 20, 25, 15 minute spacing
    expect(s.gaps).toBe(0);
  });
  it("counts a silent tail up to now as a gap", () => {
    const s = windowStats([rec(120), rec(110)], NOW, H24);
    expect(s.gaps).toBe(1);
    expect(s.longest_gap_min).toBe(110);
  });
});

describe("availability and latency", () => {
  it("is ok probes over probes, with failed probes counted as down", () => {
    const s = windowStats([rec(30), rec(20, false, null), rec(10), rec(0, false, 900)], NOW, H24);
    expect(s.ok).toBe(2);
    expect(s.availability).toBe(0.5);
  });
  it("takes latency percentiles from ok probes only", () => {
    const recs = [100, 200, 300, 400, 500].map((ms, i) => rec(40 - i * 10, true, ms));
    recs.push(rec(0, false, 9999));
    const s = windowStats(recs, NOW, H24);
    expect(s.p50_ms).toBe(300);
    expect(s.p95_ms).toBe(500);
  });
});

describe("summarise", () => {
  const sites = [
    { id: "a", name: "A", url: "https://a.example/" },
    { id: "b", name: "B", url: "https://b.example/" },
  ];
  it("keeps sites apart, reports the last probe and the first probe overall", () => {
    const s = summarise([rec(30, true, 100, "a"), rec(5, false, null, "a"), rec(2000, true, 50, "b")], sites, new Date(NOW));
    expect(s.interval_minutes).toBe(INTERVAL_MIN);
    expect(s.first_probe).toBe(at(2000));
    const [a, b] = s.sites;
    expect(a.last.ok).toBe(false);
    expect(a.windows["24h"].probes).toBe(2);
    expect(b.windows["24h"].probes).toBe(0);
    expect(b.windows["7d"].probes).toBe(1);
    expect(b.last.ms).toBe(50);
  });
  it("handles an empty history", () => {
    const s = summarise([], sites, new Date(NOW));
    expect(s.first_probe).toBeNull();
    expect(s.sites[0].last).toBeNull();
    expect(s.sites[0].windows["30d"].availability).toBeNull();
  });
  it("skips malformed timestamps", () => {
    const s = summarise([{ t: "not a date", site: "a", ok: true, status: 200, ms: 1 }, rec(1, true, 1, "a")], sites, new Date(NOW));
    expect(s.sites[0].windows["24h"].probes).toBe(1);
  });
});
