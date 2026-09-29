# Next

## Actions only John can do, in order
1. Let CI deploy: follow [SETUP.md](SETUP.md) (`gh secret set CLOUDFLARE_API_TOKEN --repo Noir-Cpu/noir-hub`, `gh secret set CLOUDFLARE_ACCOUNT_ID --repo Noir-Cpu/noir-hub`, then `gh workflow run Deploy --repo Noir-Cpu/noir-hub`).
2. Make sure `noir-dispatch` and `noir-wiretap` each get a `noir.json` (case, codename, status, liveUrl, stack). Until then the hub shows editorial defaults for them.
3. Optional: `gh repo edit Noir-Cpu/noir-hub --homepage https://noir-hub.noir-cpu.workers.dev`.
4. Optional: add branch protection on `main` with the `check`, `e2e` and `gitleaks` jobs required, so Dependabot auto-merge is gated.

## Questions
1. Contact route: the site says "GitHub is the fastest route". Add a public email address? Default: no, until you give one.
2. Job title in the Person structured data and the About text says "software engineer". Change it? Default: keep.
3. Show `template` as a status for a case whose repo is only scaffolded (noir-dispatch today)? Default: yes, it is what the manifest says.
4. Custom domain? Default: stay on workers.dev.

## Not built (by design for v0)
Admin, AI search, blog, career-mode filters, uptime and load-test panels (no data source yet).
