import { describe, expect, it } from "vitest";
import { createClient, loadRepoFacts } from "../src/lib/github";

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });

function fakeFetch(routes: Record<string, () => Response>) {
  const calls: string[] = [];
  const f = (async (url: string) => {
    calls.push(url);
    const key = Object.keys(routes).find((k) => url === k) ?? Object.keys(routes).find((k) => !k.startsWith("https://") && url.includes(k));
    return key ? routes[key]!() : new Response("{}", { status: 404 });
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe("loadRepoFacts", () => {
  it("reports a missing repository without throwing", async () => {
    const { f } = fakeFetch({});
    const facts = await loadRepoFacts(createClient(f, undefined), "o", "gone");
    expect(facts.state).toBe("missing");
    expect(facts.manifest).toBeNull();
  });

  it("reads manifest, CI, commit and release", async () => {
    const { f } = fakeFetch({
      "/contents/noir.json": () => json({ case: "001", codename: "WITNESS", status: "design", liveUrl: null, stack: ["a"] }),
      "/actions/runs": () => json({ workflow_runs: [{ conclusion: "success", status: "completed", html_url: "https://x", updated_at: "2026-01-02T00:00:00Z" }] }),
      "/commits": () => json([{ sha: "abcdef123", html_url: "https://c", commit: { committer: { date: "2026-01-01T00:00:00Z" } } }]),
      "/releases/latest": () => json({ tag_name: "REV 0.1", html_url: "https://r", published_at: "2026-01-03T00:00:00Z" }),
      "https://api.github.com/repos/o/r": () => json({ html_url: "https://github.com/o/r", default_branch: "main" }),
    });
    const facts = await loadRepoFacts(createClient(f, undefined), "o", "r");
    expect(facts.state).toBe("ok");
    expect(facts.manifest?.codename).toBe("WITNESS");
    expect(facts.ci?.conclusion).toBe("success");
    expect(facts.lastCommit?.sha).toBe("abcdef1");
    expect(facts.release?.tag).toBe("REV 0.1");
  });

  it("tolerates a missing manifest and a malformed one", async () => {
    const base = { "https://api.github.com/repos/o/r": () => json({ html_url: "u", default_branch: "main" }) };
    let facts = await loadRepoFacts(createClient(fakeFetch(base).f, undefined), "o", "r");
    expect(facts.state).toBe("ok");
    expect(facts.manifest).toBeNull();
    expect(facts.manifestProblem).toMatch(/no noir\.json/);
    const bad = fakeFetch({ ...base, "/contents/noir.json": () => json({ nope: 1 }) });
    facts = await loadRepoFacts(createClient(bad.f, undefined), "o", "r");
    expect(facts.manifest).toBeNull();
    expect(facts.manifestProblem).toMatch(/lacks/);
  });

  it("stops calling GitHub after a rate limit and marks the repo unavailable", async () => {
    const limited = () => new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0" } });
    const { f, calls } = fakeFetch({ "/repos/o/": limited });
    const client = createClient(f, undefined);
    const a = await loadRepoFacts(client, "o", "one");
    const b = await loadRepoFacts(client, "o", "two");
    expect(a.state).toBe("unavailable");
    expect(b.state).toBe("unavailable");
    expect(calls).toHaveLength(1);
  });

  it("sends the token as a bearer header and never returns it", async () => {
    let auth = "";
    const f = (async (_u: string, init: RequestInit) => {
      auth = (init.headers as Record<string, string>).authorization ?? "";
      return new Response("{}", { status: 404 });
    }) as unknown as typeof fetch;
    const facts = await loadRepoFacts(createClient(f, "tok"), "o", "r");
    expect(auth).toBe("Bearer tok");
    expect(JSON.stringify(facts)).not.toContain("tok");
  });
});
