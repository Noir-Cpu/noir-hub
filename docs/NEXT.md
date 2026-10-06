# Next

## Actions only John can do, in order
1. If the Deploy workflow reports that it skipped the deploy, add the Cloudflare secrets: follow [SETUP.md](SETUP.md) (`gh secret set CLOUDFLARE_API_TOKEN --repo Noir-Cpu/noir-hub`, `gh secret set CLOUDFLARE_ACCOUNT_ID --repo Noir-Cpu/noir-hub`, then `gh workflow run Deploy --repo Noir-Cpu/noir-hub`).
2. After the personal-site-and-status PR is merged: start the probe once with `gh workflow run Probe --repo Noir-Cpu/noir-hub`, check that a `status` branch with `summary.json` exists, then run Deploy once so the status page is built with data. Until the first probe the page says no figures exist, and the browser logs one 404 for `summary.json` on `/status`.
3. Make sure `noir-dispatch` and `noir-wiretap` each get a `noir.json` (case, codename, status, liveUrl, stack). Until then the hub shows editorial defaults for them.
4. Optional: `gh repo edit Noir-Cpu/noir-hub --homepage https://noir-hub.noir-cpu.workers.dev`.
5. Optional: add branch protection on `main` with the `check`, `e2e` and `gitleaks` jobs required, so Dependabot auto-merge is gated.
6. Check once a month that the Probe workflow is still enabled (Actions tab). GitHub disables scheduled workflows after 60 days without repository activity; see ADR 0005.

## DRAFT FOR JOHN (review before you share the site)
The site text reads as final, but these were written from your CV facts and need your eye:
- **Bio paragraphs** (`ABOUT` in `src/data/profile.ts`, shown under About). DRAFT FOR JOHN.
- **"What I am looking for" line** (`LOOKING_FOR` in the same file). DRAFT FOR JOHN. It currently says a first full-time role or an internship once Honours ends in November 2026, in software engineering or on a team building tools for learning. Change it to what is true.
- Also worth a read: the hero line (`ONE_LINER`), the Honours project paragraph (`NOW`), the project descriptions (`PROJECTS`), and the label "In the NOIR cases, some still in design" over the cloud and data tools in Skills.
- Confirm the golf-ball figures (0.215, 0.861, 1.703) are the ones you want shown and are worded the way you would say them. They come from your CV; the site presents them as your own cross-validation results and nothing here re-ran them.

## TODO: CV
- TODO: add a CV link or PDF **only after** John supplies a copy with the phone number removed (both current versions contain it). Put it in `public/`, link it from Contact, and keep `tests/build.test.ts` "hosts no CV or other PDF" in step (it will need an allowance for that one file name).

## Questions
1. Custom domain? Default: stay on workers.dev. The Person JSON-LD, canonical URLs and sitemap would all need the new `site` (see SETUP.md).
2. Show `template` as a status for a case whose repo is only scaffolded? Default: yes, it is what the manifest says.
3. Should the probe also check a real user flow (for example a WITNESS poll page), not only `/` and `/api/health`? Default: no, health endpoints only.
4. A photo? Not added. A portrait would make the hero more personal; supply one with the licence you want it under.

## Not built (by design)
Admin, AI search, blog, career-mode filters, load-test panels (no data source yet), a contact form (email is the route), a hosted CV.
