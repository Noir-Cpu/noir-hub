#!/usr/bin/env bash
# Run one probe and store the result on the orphan `status` branch, never on main.
#   PUBLISH=1  commit and push to origin/status (the scheduled workflow sets this)
#   otherwise  dry run: probe and compute the summary in a scratch directory, push nothing
# Must be run from the root of a checkout of the repository.
set -euo pipefail

REMOTE="${REMOTE:-origin}"
DIR="${STATUS_DIR:-status-data}"

if [ "${PUBLISH:-0}" != "1" ]; then
  scratch="$(mktemp -d)"
  node scripts/probe.mjs "$scratch"
  cat "$scratch/summary.json" | head -c 600; echo
  exit 0
fi

rm -rf "$DIR"
git worktree prune
# ls-remote exits 2 when the branch is absent and 128 or similar when the remote cannot be reached.
# Only "absent" may start a fresh orphan branch; any other failure stops the job rather than risk forking history.
set +e
git ls-remote --exit-code --heads "$REMOTE" status >/dev/null 2>&1
rc=$?
set -e
if [ "$rc" -eq 0 ]; then
  git fetch --quiet --depth=1 "$REMOTE" status:refs/remotes/"$REMOTE"/status
  git worktree add --force -B status "$DIR" "$REMOTE"/status >/dev/null
elif [ "$rc" -eq 2 ]; then
  echo "No status branch yet: creating an orphan branch."
  git worktree add --detach "$DIR" >/dev/null
  git -C "$DIR" checkout --orphan status >/dev/null 2>&1
  git -C "$DIR" rm -rf --quiet . 2>/dev/null || true
else
  echo "::error::Could not read the remote (git ls-remote exit $rc); not touching the status branch."
  exit 1
fi

node scripts/probe.mjs "$DIR"

cd "$DIR"
git config user.name "noir-hub-probe"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add -A
if git diff --cached --quiet; then
  echo "Nothing to commit."
  exit 0
fi
git commit --quiet -m "probe $(date -u +%Y-%m-%dT%H:%MZ)"

for attempt in 1 2 3; do
  if git push --quiet "$REMOTE" HEAD:refs/heads/status; then
    echo "Pushed to $REMOTE/status."
    exit 0
  fi
  echo "Push attempt $attempt failed; rebasing and retrying."
  git pull --quiet --rebase "$REMOTE" status || { git rebase --abort 2>/dev/null || true; }
  sleep $((attempt * 3))
done
echo "::error::Could not store this probe result on the status branch after three attempts."
exit 1
