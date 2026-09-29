# ADR 0002: Read case repos at build time, not from a database

Status: accepted

The strategy doc sketches an Action writing manifests to Neon and triggering a rebuild. For v0 (a static case index) that adds a database no page needs. Instead the build reads `noir.json` and GitHub facts (latest completed CI run on the default branch, last commit, latest release) directly, and a scheduled workflow rebuilds daily.

Failure handling: a missing repository, a missing or malformed manifest, or an exhausted rate limit yields "no evidence published yet" and a reason on `/status`. The build never fails because a case repo is absent. After the first rate-limit response the client makes no further calls in that build.

Trade-off: no history. Uptime and deploy counts need stored data, which arrives with WIRETAP or a database later, and the pages say "no evidence published yet" until then.
