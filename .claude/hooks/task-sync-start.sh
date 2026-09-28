#!/usr/bin/env bash
# SessionStart hook: pull the latest task ledger and print a summary.
# Output on stdout is added to Claude's context. Never fails the session.

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" 2>/dev/null || exit 0
LEDGER="TASKS.md"

# macOS has no `timeout` by default; fall back to gtimeout or no limit.
with_timeout() {
  if command -v timeout >/dev/null 2>&1; then timeout 20 "$@"
  elif command -v gtimeout >/dev/null 2>&1; then gtimeout 20 "$@"
  else "$@"; fi
}

# Pull quietly; skip on no network, no upstream or a dirty tree.
if git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
  with_timeout git pull --ff-only --quiet >/dev/null 2>&1 \
    || echo "[task-sync] git pull をスキップしました（オフライン・競合・未コミット変更のいずれか）。"
fi
with_timeout git fetch --quiet origin >/dev/null 2>&1 || true

[ -f "$LEDGER" ] || { echo "[task-sync] $LEDGER がありません。"; exit 0; }

# Active rows only: stop at the Archive section.
active_rows() {
  awk '/^## Archive/{exit} /^\| T-/'
}

echo "## タスク台帳（$LEDGER）"
rows=$(active_rows < "$LEDGER" | grep -E '\| *(doing|waiting|todo) *\|')
if [ -n "$rows" ]; then
  echo "| ID | タイトル | 状態 | 実行場所 | 最終更新 | 次の一手 |"
  echo "|---|---|---|---|---|---|"
  echo "$rows"
else
  echo "進行中のタスクはありません。"
fi

# Ledger rows that only exist on cloud-session branches (not merged yet).
current=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
extra=""
for ref in $(git for-each-ref --format='%(refname:short)' 'refs/remotes/origin/claude/*' 2>/dev/null); do
  [ "$ref" = "origin/$current" ] && continue
  branch_rows=$(git show "$ref:$LEDGER" 2>/dev/null | active_rows | grep -E '\| *(doing|waiting) *\|')
  [ -n "$branch_rows" ] || continue
  new_rows=$(echo "$branch_rows" | grep -vxF -f "$LEDGER")
  [ -n "$new_rows" ] && extra="${extra}
### ${ref#origin/}
${new_rows}"
done
if [ -n "$extra" ]; then
  echo
  echo "## クラウドセッションのブランチ上で更新中のタスク（未マージ）"
  echo "$extra"
fi

exit 0
