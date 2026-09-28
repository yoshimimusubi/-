#!/usr/bin/env bash
# macOS: start `claude remote-control` in this repo at login (launchd),
# wrapped in `caffeinate -i` so the Mac does not idle-sleep while it runs.
#
#   bash scripts/remote-control/install-mac.sh            # install / reinstall
#   bash scripts/remote-control/install-mac.sh uninstall  # remove
set -euo pipefail

LABEL="com.yoshimimusubi.claude-remote-control"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_DIR="$HOME/Library/Logs/claude-remote-control"

if [ "${1:-}" = "uninstall" ]; then
  launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Removed $LABEL"
  exit 0
fi

command -v claude >/dev/null 2>&1 || { echo "claude コマンドが見つかりません。先に Claude Code をインストールしてください。"; exit 1; }

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>cd "$REPO_DIR" &amp;&amp; exec /usr/bin/caffeinate -i claude remote-control</string>
  </array>
  <key>WorkingDirectory</key><string>$REPO_DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$LOG_DIR/out.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/err.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed $LABEL (repo: $REPO_DIR)"
echo "ログ: $LOG_DIR"
echo "スマホの Claude アプリ → Code タブにこの Mac が表示されるか確認してください。"
