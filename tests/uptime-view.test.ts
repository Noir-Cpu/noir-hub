import { describe, expect, it } from "vitest";
import { esc, fmtAvailability, parseSummary, renderUptime, type Summary } from "../src/lib/uptime-view";

const win = (over = {}) => ({ since: "2026-10-01T00:00:00.000Z", full: false, probes: 10, ok: 9, availability: 0.9, expected: 10, gaps: 0, longest_gap_min: 10, p50_ms: 120, p95_ms: 300, ...over });
const summary = (over: Partial<Summary> = {}): Summary => ({
  generated_at: "2026-10-02T12:00:00.000Z",
  interval_minutes: 10,
  first_probe: "2026-10-01T00:00:00.000Z",
  sites: [
    {
      id: "a",
      name: "Site <A>",
      url: "https://a.example/",
      last: { t: "2026-10-02T11:55:00.000Z", ok: true, status: 200, ms: 120 },
      windows: { "24h": win(), "7d": win(), "30d": win() },
    },
  ],
  ...over,
});

describe("fmtAvailability", () => {
  it("never rounds a failure up to 100%", () => {
    expect(fmtAvailability(9999, 10000)).toBe("99.99%");
    expect(fmtAvailability(99999, 100000)).toBe("99.99%");
    expect(fmtAvailability(1439, 1440)).toBe("99.93%");
  });
  it("is exact for all ok and for no data", () => {
    expect(fmtAvailability(144, 144)).toBe("100%");
    expect(fmtAvailability(0, 0)).toBe("no data");
    expect(fmtAvailability(0, 5)).toBe("0.00%");
  });
});

describe("parseSummary", () => {
  it("accepts a well-formed summary and rejects malformed ones", () => {
    expect(parseSummary(summary())).not.toBeNull();
    expect(parseSummary(null)).toBeNull();
    expect(parseSummary({ ...summary(), generated_at: "yesterday" })).toBeNull();
    expect(parseSummary({ ...summary(), sites: "x" })).toBeNull();
    const bad = summary();
    (bad.sites[0]!.windows["7d"] as any).ok = 99;
    expect(parseSummary(bad)).toBeNull();
  });
});

describe("renderUptime", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  it("says since when, how many probes, and escapes names", () => {
    const html = renderUptime(summary(), now);
    expect(html).toContain("Observed since <strong>2026-10-01</strong>");
    expect(html).toContain("10\u00a0probes in the last 30 days across 1\u00a0site.");
    expect(html).toContain("Site &lt;A&gt;");
    expect(html).not.toContain("Site <A>");
    expect(html).toContain("not yet a full 7 day window");
  });
  it("warns when the latest probe is more than an hour old", () => {
    expect(renderUptime(summary(), now)).not.toContain("more than an hour old");
    expect(renderUptime(summary(), new Date("2026-10-02T14:00:00Z"))).toContain("more than an hour old");
  });
  it("shows an honest empty state, not zeros", () => {
    const html = renderUptime(null, now, "the status branch does not exist yet");
    expect(html).toContain("No uptime figures to show: the status branch does not exist yet");
    expect(html).not.toMatch(/%|\bms\b/);
  });
  it("does not link a non-https URL", () => {
    const s = summary();
    s.sites[0]!.url = "javascript:alert(1)";
    expect(renderUptime(s, now)).not.toContain("javascript:");
  });
  it("escapes", () => expect(esc(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;"));
});
