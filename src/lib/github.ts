/** Build-time GitHub facts for one case repo. Every field can be null: a missing repo, manifest or run is normal. */

export type Manifest = {
  case: string;
  codename: string;
  status: string;
  liveUrl: string | null;
  stack: string[];
  links?: Record<string, string>;
};

export type RepoFacts = {
  owner: string;
  repo: string;
  /** "ok" = repo found; "missing" = 404; "unavailable" = API failure or rate limit. */
  state: "ok" | "missing" | "unavailable";
  reason?: string;
  url: string | null;
  manifest: Manifest | null;
  manifestProblem: string | null;
  /** Conclusion of the latest completed workflow run on the default branch. */
  ci: { conclusion: string | null; status: string; url: string; at: string } | null;
  lastCommit: { date: string; sha: string; url: string } | null;
  release: { tag: string; url: string; at: string } | null;
};

const API = "https://api.github.com";

class RateLimited extends Error {}

export type Fetcher = typeof fetch;

export function createClient(fetcher: Fetcher = fetch, token = process.env.GITHUB_TOKEN) {
  let limited = false;
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "noir-hub-build",
  };
  if (token) headers.authorization = `Bearer ${token}`;

  /** Returns parsed JSON, or null on 404. Throws RateLimited or Error otherwise. */
  async function get<T>(path: string, accept?: string): Promise<T | null> {
    if (limited) throw new RateLimited("GitHub API rate limit reached earlier in this build");
    const res = await fetcher(`${API}${path}`, {
      headers: accept ? { ...headers, accept } : headers,
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 404) return null;
    if (res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0")) {
      limited = true;
      throw new RateLimited("GitHub API rate limit reached");
    }
    if (!res.ok) throw new Error(`GitHub API ${res.status} for ${path}`);
    return (await res.json()) as T;
  }

  return { get };
}

function parseManifest(raw: unknown): { manifest: Manifest | null; problem: string | null } {
  if (!raw || typeof raw !== "object") return { manifest: null, problem: "noir.json is not an object" };
  const m = raw as Record<string, unknown>;
  if (typeof m.case !== "string" || typeof m.codename !== "string" || typeof m.status !== "string") {
    return { manifest: null, problem: "noir.json lacks case, codename or status" };
  }
  const stack = Array.isArray(m.stack) ? m.stack.filter((s): s is string => typeof s === "string") : [];
  const liveUrl = typeof m.liveUrl === "string" && /^https:\/\//.test(m.liveUrl) ? m.liveUrl : null;
  const links: Record<string, string> = {};
  if (m.links && typeof m.links === "object") {
    for (const [k, v] of Object.entries(m.links)) if (typeof v === "string" && /^https:\/\//.test(v)) links[k] = v;
  }
  return { manifest: { case: m.case, codename: m.codename, status: m.status, liveUrl, stack, links }, problem: null };
}

type GhRepo = { html_url: string; default_branch: string };
type GhRuns = { workflow_runs: { conclusion: string | null; status: string; html_url: string; updated_at: string }[] };
type GhCommits = { sha: string; html_url: string; commit: { committer: { date: string } } }[];
type GhRelease = { tag_name: string; html_url: string; published_at: string };

export async function loadRepoFacts(
  client: ReturnType<typeof createClient>,
  owner: string,
  repo: string,
): Promise<RepoFacts> {
  const base: RepoFacts = {
    owner, repo, state: "unavailable", url: null, manifest: null, manifestProblem: null,
    ci: null, lastCommit: null, release: null,
  };
  try {
    const info = await client.get<GhRepo>(`/repos/${owner}/${repo}`);
    if (!info) return { ...base, state: "missing", reason: "repository not found" };
    const facts: RepoFacts = { ...base, state: "ok", url: info.html_url };
    const branch = encodeURIComponent(info.default_branch);

    // Each fact is fetched independently so one failure does not hide the others.
    const settle = async <T>(p: Promise<T>): Promise<T | null> => {
      try { return await p; } catch (e) {
        if (e instanceof RateLimited) facts.reason = e.message;
        return null;
      }
    };

    const [manifestRaw, runs, commits, release] = await Promise.all([
      settle(client.get<unknown>(`/repos/${owner}/${repo}/contents/noir.json?ref=${branch}`, "application/vnd.github.raw+json")),
      settle(client.get<GhRuns>(`/repos/${owner}/${repo}/actions/runs?branch=${branch}&status=completed&per_page=1`)),
      settle(client.get<GhCommits>(`/repos/${owner}/${repo}/commits?sha=${branch}&per_page=1`)),
      settle(client.get<GhRelease>(`/repos/${owner}/${repo}/releases/latest`)),
    ]);

    if (manifestRaw) {
      const { manifest, problem } = parseManifest(manifestRaw);
      facts.manifest = manifest;
      facts.manifestProblem = problem;
    } else {
      facts.manifestProblem = "no noir.json on the default branch";
    }
    const run = runs?.workflow_runs?.[0];
    if (run) facts.ci = { conclusion: run.conclusion, status: run.status, url: run.html_url, at: run.updated_at };
    const c = commits?.[0];
    if (c) facts.lastCommit = { date: c.commit.committer.date, sha: c.sha.slice(0, 7), url: c.html_url };
    if (release) facts.release = { tag: release.tag_name, url: release.html_url, at: release.published_at };
    return facts;
  } catch (e) {
    return { ...base, reason: e instanceof Error ? e.message : "unknown error" };
  }
}
