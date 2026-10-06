# CASE 000 / HUB

**John Balogun's personal site: who he is, what he teaches and builds, and four NOIR case files that read their own evidence from the case repositories.**

Live: https://noir-hub.noir-cpu.workers.dev (static Astro on Workers assets; CI deploys on push to `main` and daily, see [docs/SETUP.md](docs/SETUP.md))

## The brief

A visitor from a CV or LinkedIn should see in about 90 seconds who John Balogun is, how to email him, and what is actually true of his projects. Constraints: free tier, solo, no invented numbers, nothing published that he has not supplied (no phone number, grades, or CV file). No admin, no search, no blog.

## The evidence

Measured on this machine, 2026-10-06, against the built `dist/` site.

| Check | Command | Result |
| --- | --- | --- |
| Lighthouse, mobile, `/` `/cases/witness` `/status` | `npm run lighthouse` | performance 97, 98, 98; accessibility 100; SEO 100; best practices 100, 100, 96 |
| Lighthouse, desktop, same pages | same | performance 100; accessibility 100; SEO 100; best practices 100, 100, 96 |
| Unit and build tests | `npm test` | 63 passed (summary maths, probe, uptime view, build rules) |
| Playwright + axe (WCAG 2.2 AA tags), phone and desktop, 7 pages, populated status page in light and dark, JS-off and refresh-failure cases | `npm run e2e` | 38 passed |

The 96 on `/status` is one console error: `summary.json` returns 404 until the probe has created the `status` branch, and the browser logs the failed request. It should disappear after the first probe run; that has not been measured yet. Lighthouse uses simulated throttling against a local static server, so it does not include Cloudflare network time.

## The probe

[`probe.yml`](.github/workflows/probe.yml) checks five NOIR sites every 10 minutes from GitHub Actions and stores the results on the orphan `status` branch (`data/YYYY-MM.jsonl` and a rolling `summary.json` with 24 hour, 7 day and 30 day availability and p50/p95 latency). [`/status`](https://noir-hub.noir-cpu.workers.dev/status) shows them, only over the time actually observed. Design and limits (scheduling delays, one location, not an SLA): [ADR 0005](docs/adr/0005-uptime-probe.md).

## The method

- Astro static output, deployed as Workers static assets named `noir-hub` ([ADR 0001](docs/adr/0001-astro-static-on-workers-assets.md)).
- At build, `src/lib/github.ts` reads `noir.json`, the latest completed CI run, last commit and latest release for `Noir-Cpu/noir-witness`, `noir-dispatch`, `noir-informant`, `noir-wiretap` ([ADR 0002](docs/adr/0002-build-time-github-facts.md)). Missing repos and manifests are tolerated; rate limits stop further calls. `GITHUB_TOKEN` is used when set.
- Facts about John live in `src/data/profile.ts`; case copy lives in `src/data/cases.ts`; anything that changes over time comes from the repos or the probe. Page order and what is never published: [ADR 0006](docs/adr/0006-personal-first-home.md).
- A workflow rebuilds and deploys daily and on push.
- Brand layer and tokens: [ADR 0003](docs/adr/0003-noir-brand-layer.md). Social cards: [ADR 0004](docs/adr/0004-social-cards-at-build.md).
- `tests/build.test.ts` fails the build if any page contains a phone-number-shaped string, a percentage or grade wording, citizenship or visa wording, a metric-looking figure outside the probe's measured region, placeholder text, or if a PDF is shipped. Uptime figures appear only with a first-probe date and a probe count.

## The verdict

Not yet written. What is known: the site needs no database or runtime, and its only live numbers are the probe's, which carry their own observation window.

## Open leads

See [docs/NEXT.md](docs/NEXT.md): copy for John to review, a redacted CV, and starting the probe after merge. Load-test panels wait for the case repos to publish them.

## Develop

```sh
npm ci
GITHUB_TOKEN=$(gh auth token) npm run build   # token optional; without it the API limit is 60/hour
npm test && npm run e2e
npm run deploy                                # wrangler deploy
```
