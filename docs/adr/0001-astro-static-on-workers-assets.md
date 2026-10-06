# ADR 0001: Astro, static output, Workers static assets

Status: accepted

The hub is content-heavy and changes when a case repo changes, not when a visitor acts. Astro emits plain HTML and ships no client JavaScript by default, so there is nothing to hydrate and no adapter to maintain. It deploys as Workers static assets (same platform as the template, see the template's ADR 0001), not Pages.

Trade-off: no server means no runtime data. Freshness comes from rebuilding daily and on push, so status can be up to a day old between pushes. The `/status` page prints the build time so this is visible.

Update: the one piece of live data is the uptime figures on `/status`, refreshed in the browser from the probe's `summary.json` ([ADR 0005](0005-uptime-probe.md)). It is progressive enhancement; the page is complete without it.
