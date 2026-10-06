# Setup for CI deploys

The site is already deployable by hand from a machine where `npx wrangler login` has been done:

```sh
GITHUB_TOKEN=$(gh auth token) npm run deploy
```

For the GitHub Actions workflow (`.github/workflows/deploy.yml`) to deploy on push and on the daily schedule, add two repository secrets. Until you do, the workflow builds and tests, prints a warning and skips the deploy step (it stays green).

1. Create an API token at https://dash.cloudflare.com/profile/api-tokens using the "Edit Cloudflare Workers" template. Scope it to your account only.
2. Find your account ID: `npx wrangler whoami` prints it.
3. Set the secrets (each command prompts for the value, so nothing lands in shell history):

```sh
gh secret set CLOUDFLARE_API_TOKEN --repo Noir-Cpu/noir-hub
gh secret set CLOUDFLARE_ACCOUNT_ID --repo Noir-Cpu/noir-hub
```

4. Run the workflow once: `gh workflow run Deploy --repo Noir-Cpu/noir-hub`, then `gh run watch`.

The workflow uses the built-in `GITHUB_TOKEN` to read the case repositories, which raises the GitHub API limit to 1,000 requests per hour per repository. No secret is needed for that.

## Uptime probe

`.github/workflows/probe.yml` needs no secrets. It uses the workflow's own `GITHUB_TOKEN` (permission `contents: write`) to push to the `status` branch, which it creates on first run. Scheduled workflows only run from the default branch, so the probe starts after the pull request that adds it is merged; start it at once with `gh workflow run Probe --repo Noir-Cpu/noir-hub`. Results: `https://raw.githubusercontent.com/Noir-Cpu/noir-hub/status/summary.json`. Design and limits: [ADR 0005](adr/0005-uptime-probe.md).

If you add a branch-protection rule or ruleset for all branches, exclude `status`, or the probe cannot push. To try the probe locally without pushing: `node scripts/probe.mjs /some/empty/dir`.

## Custom domain

The site is served from `https://noir-hub.noir-cpu.workers.dev`. If you attach a domain, change `site` in `astro.config.mjs` and the `Sitemap:` line in `public/robots.txt`, then redeploy. Also update the canonical host in the `url` of the Person JSON-LD (`src/pages/index.astro`), which reads `Astro.site`, and the expected host in `tests/build.test.ts`.
