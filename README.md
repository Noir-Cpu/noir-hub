# CASE 000 / HUB

**John Balogun, NOIR: a static case index that reads its own evidence from the case repositories.**

Live: https://noir-hub.noir-cpu.workers.dev (status: v0, deployed by hand; CI deploy needs two secrets, see [docs/SETUP.md](docs/SETUP.md))

## The brief

A recruiter should be able to see in about 90 seconds who John Balogun is, what the four NOIR cases are, and what is actually true of each. Constraints: free tier, solo, no invented numbers. v0 is a case index and nothing more: no admin, no search, no blog.

## The evidence

Measured on this machine, 2026-09-29, against the built `dist/` site.

| Check | Command | Result |
| --- | --- | --- |
| Lighthouse, mobile, `/` `/cases/witness` `/status` | `npm run lighthouse` | performance 99, 99, 99; accessibility 100; best practices 100; SEO 100 |
| Lighthouse, desktop, same pages | same | performance 100; accessibility 100; best practices 100; SEO 100 |
| Unit and build tests | `npm test` | 15 passed |
| Playwright + axe (WCAG 2.2 AA tags), phone and desktop, 7 pages, plus dark scheme | `npm run e2e` | 24 passed |

Lighthouse uses simulated throttling against a local static server, so it does not include Cloudflare network time.

## The method

- Astro static output, deployed as Workers static assets named `noir-hub` ([ADR 0001](docs/adr/0001-astro-static-on-workers-assets.md)).
- At build, `src/lib/github.ts` reads `noir.json`, the latest completed CI run, last commit and latest release for `Noir-Cpu/noir-witness`, `noir-dispatch`, `noir-informant`, `noir-wiretap` ([ADR 0002](docs/adr/0002-build-time-github-facts.md)). Missing repos and manifests are tolerated; rate limits stop further calls. `GITHUB_TOKEN` is used when set.
- Editorial copy lives in `src/data/cases.ts`; anything that changes over time comes from the repos.
- A workflow rebuilds and deploys daily and on push.
- Brand layer and tokens: [ADR 0003](docs/adr/0003-noir-brand-layer.md). Social cards: [ADR 0004](docs/adr/0004-social-cards-at-build.md).
- `tests/build.test.ts` fails the build if any page contains a metric-looking figure (percent, ms, users, p95...) or placeholder text.

## The verdict

Not yet written: the site has been live for less than a day. What is known: it needs no database or runtime, and its numbers cannot be invented because it has none.

## Open leads

See [docs/NEXT.md](docs/NEXT.md). Evidence panels for uptime and load tests wait for the case repos to publish them.

## Develop

```sh
npm ci
GITHUB_TOKEN=$(gh auth token) npm run build   # token optional; without it the API limit is 60/hour
npm test && npm run e2e
npm run deploy                                # wrangler deploy
```
