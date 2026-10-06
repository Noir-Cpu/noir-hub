# ADR 0005: Uptime probe in GitHub Actions, results on an orphan branch

Status: accepted

## Context

The strategy doc asks for a status page "published from your uptime checks". The constraints are the same as the rest of the hub: free tier, solo, no accounts beyond GitHub and Cloudflare, no invented numbers. Hosted monitors need an account and a token; a probe running on the Workers being probed would measure itself.

## Decision

- `.github/workflows/probe.yml` runs every 10 minutes (`schedule: */10 * * * *`) and on `workflow_dispatch`. It runs `scripts/publish-status.sh`, which runs `scripts/probe.mjs`.
- The probe sends **one GET per site per run** to the five URLs in `scripts/probe-sites.json`, with the User-Agent `noir-hub-probe/1.0 (+https://github.com/Noir-Cpu/noir-hub; uptime check every 10 minutes)` and a 10 second timeout. A site is **up** if the final status after redirects is 2xx within the timeout. Latency is the time to response headers, from a runner that has no warm connection, so it includes DNS and TLS.
- **Fail-soft.** `probeSite` never throws: a timeout, refused connection or 5xx becomes a record with `ok: false`. The job fails only if it cannot store the result (after three push attempts) or cannot read the remote.
- **Storage.** Results go to an orphan branch `status`, never to `main`. `data/YYYY-MM.jsonl` gets one JSON line per site per run (`t`, `site`, `ok`, `status`, `ms`, `err`). `summary.json` is recomputed on every run from the files that overlap the last 30 days. Monthly files keep each file near 2 MB (5 sites x 144 runs x 30 days of short lines). One commit per run means the branch grows by about 4,300 commits a month; it can be squashed or truncated by force-push without touching `main`, because nothing else reads its history.
- **Summary maths** (`scripts/lib/summary.mjs`, tested in `tests/summary.test.ts`):
  - A window is the half-open interval (now - W, now]. W is 24 hours, 7 days or 30 days.
  - Availability is ok probes divided by probes in the window. Missing probes are unknown, not down.
  - The window is clipped to what was observed. `full` is false until the site has been probed for the whole window, and the page prints "since <date>" and the probe count instead of claiming 7 or 30 days.
  - Latency p50 and p95 use the nearest-rank method over ok probes only.
  - A gap is a spacing of more than 2.5 intervals (25 minutes) between consecutive probes, including the silence between the last probe and now. Gaps are counted and shown, never turned into downtime.
- **The page.** `/status` fetches `summary.json` from `raw.githubusercontent.com` at build time, so the HTML is complete with JavaScript off. A small script re-fetches the same file in the browser and re-renders with the same code (`src/lib/uptime-view.ts`), validating the shape and escaping every value. If the fetch fails the build-time content stays. `public/_headers` gains `connect-src 'self' https://raw.githubusercontent.com` for this; without it the CSP blocks the refresh (checked both ways in a browser). raw.githubusercontent.com sends `access-control-allow-origin: *` and caches for 5 minutes.
- On pull requests that touch the probe, the workflow runs in dry-run mode: it probes once and prints the summary but pushes nothing.

## Limits, stated so nobody over-reads the numbers

- **Scheduling jitter.** GitHub documents that scheduled workflows can be delayed under load and that runs can be dropped. Expect gaps and uneven spacing. The `*/10` schedule is a request, not a promise.
- **Scheduled workflows can be disabled.** GitHub disables scheduled workflows in a repository with no activity for 60 days. Whether commits to the `status` branch count as activity was not tested here. The page flags a latest probe older than an hour, so a silent stop is visible, not hidden.
- **One probe location, from GitHub's network.** Every probe comes from a GitHub-hosted runner (a cloud datacentre; GitHub does not promise which region). It cannot see routing or regional problems a visitor in South Africa might have, and a site could block or rate-limit GitHub's addresses without being down for people. Cloudflare Workers and GitHub's network both being healthy is what "up" means here.
- **A health endpoint is a shallow check.** HTTP 2xx from `/` or `/api/health` says the Worker answered; it does not say the database behind it is healthy or that a user flow works.
- **Not an SLA.** The numbers are a record of what the probe saw. No availability target is promised, and the 24 hour figure with 144 possible probes moves by about 0.7 percentage points per failed probe.
- **Public data.** The branch and `summary.json` are public. Nothing secret is in them; the probe uses no tokens apart from the workflow's own `GITHUB_TOKEN` to push.
- The probe makes five requests every 10 minutes to sites John owns, with an identifying User-Agent. It should not be pointed at third-party sites.

## Alternatives

- A Cloudflare Worker with a cron trigger and KV or D1: probes from Cloudflare's own network (which is also where the sites run), needs the Cloudflare API token that CI does not have yet.
- A hosted service (UptimeRobot, Better Stack): needs an account, and its status page is theirs, not part of this site.
- Committing results to `main`: pollutes history and would trigger the Deploy workflow every 10 minutes.
