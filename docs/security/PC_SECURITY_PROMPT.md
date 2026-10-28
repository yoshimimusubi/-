# PC のセキュリティ点検と「ダウンロードフォルダで作業しない」設定

背景と点検結果は `docs/security/DOWNLOADS_ATTACK_CHECK.md`。
クラウドからは PC の中が見えないので、PC 本体で下の手順とプロンプトを使う。

## 0. ブラウザの設定（手動・2分）

ページを開いただけでファイルが無音で保存されるのを防ぐ（表記は版によって多少違う）。

- Chrome: 設定 → ダウンロード → 「ダウンロード前に各ファイルの保存場所を確認する」をオン
- Edge: 設定 → ダウンロード → 「ダウンロード時の保存場所を毎回確認する」をオン
- Safari: 設定 → Web サイト → ダウンロード → 「その他の Web サイトを訪問中」を「確認」にする

## 1. PC の Claude Code に渡すプロンプト

このリポジトリの PC 側の clone（**Downloads 配下ではないこと**）で `claude` を起動して、以下をそのまま貼り付ける。

```
「ダウンロードフォルダで AI エージェントを起動すると、置かれた CLAUDE.md / AGENTS.md の指示で設定を書き換えられ乗っ取られる」
という手口への対策を、この PC で点検・設定してください。まず次を読んでください:
- docs/security/DOWNLOADS_ATTACK_CHECK.md（点検結果と対策の一覧）
- scripts/security/guard-downloads.sh（ダウンロードフォルダでの作業を止めるフック）

変更を加える前に、OS・claude のバージョン・このリポジトリの場所を確認し、やることの計画を見せて承認を取ってください。
ファイルを書き換える前には必ずバックアップを取り、管理者権限（sudo / 管理者 PowerShell）が要る操作はコマンドを示すだけにして、私が自分で実行します。

## A. 点検（読むだけ。結果を表で報告）
1. このリポジトリの場所が Downloads（ダウンロード）配下でないか
2. Downloads とホーム直下に CLAUDE.md / CLAUDE.local.md / AGENTS.md / .mcp.json が無いか（あれば中身を表示し、消さずに報告）
3. ~/.claude/settings.json と ~/.claude/CLAUDE.md の中身: env（特に ANTHROPIC_BASE_URL）、hooks、mcpServers、apiKeyHelper、
   permissions.defaultMode に見覚えのない物や bypassPermissions が無いか
4. シェルの設定（~/.zshrc 等 / PowerShell の $PROFILE）に claude の別名や --dangerously-skip-permissions が無いか
5. 管理者設定（macOS: /Library/Application Support/ClaudeCode/managed-settings.json、
   Windows: C:\Program Files\ClaudeCode\managed-settings.json）があるか、/status で組織の管理設定が効いているか

## B. 見張りフックの設定（承認後）
1. scripts/security/guard-downloads.sh を ~/.claude/hooks/guard-downloads.sh にコピーし、実行権限を付ける
2. ~/.claude/settings.json に次のフックを追加する（既存の設定は消さずにマージ）
   - SessionStart / UserPromptSubmit / PreToolUse（matcher "*"）の 3 つ
   - command は bash "$HOME/.claude/hooks/guard-downloads.sh"
   - ブラウザの保存先を Downloads 以外にしている場合は、env の CLAUDE_GUARD_DIRS にそのフォルダを追加
3. 動作確認: Downloads の下に一時フォルダを作り、そこで claude -p "hello" を実行して止まること、
   このリポジトリでは普通に動くことを確認し、一時フォルダは消す
   （Windows で Git Bash が無くフックが動かない場合は、同じ判定の PowerShell 版を作って確認）

## C. 任意の追加対策（それぞれ要否を私に聞いてから）
1. シェル関数: Downloads で claude コマンドを打ったら起動前に止める（zsh は ~/.zshrc、Windows は $PROFILE）
2. AGENTS.md を読まない: ~/.claude/settings.json に
   "pluginConfigs": {"cc-plugin-agents-md@builtin": {"options": {"instructionFiles": "claude-md"}}}
3. 管理者設定（AI が ~/.claude/settings.json を書き換えても消せない）: managed-settings.json に
   - "allowedProviders": ["anthropic"]（Anthropic 以外の接続先では起動を拒否）
   - "permissions": {"disableBypassPermissionsMode": "disable"}
   - 見張りフック（スクリプトも管理者しか書けない場所に置く）
   の内容案とコマンドを示す。私が実行したら、claude の起動・ログイン・Remote Control が今まで通り動くことを確認
4. サンドボックス（macOS / WSL2 のみ）: /sandbox で有効化し、"allowUnsandboxedCommands": false にするか。
   git push など普段の作業への影響を先に説明する

## 完了条件
- A の点検結果を表で出す（問題があれば最初に書く）
- Downloads 配下では止まり、このリポジトリでは普通に動くことを確認済み
- 最後に TASKS.md の T-20261028-01 を更新して commit & push（全部終わったら /task-done）
```

## 2. 日々の使い方

- ダウンロードしたファイルを AI に整理・解凍させたいときは、空フォルダ（例: `~/work/inbox`）を作り、**対象ファイルだけ**移してからそこで起動する
- Downloads 配下に clone・展開したプロジェクトでも止まるので、作業用フォルダへ移してから使う
- 起動時の「Quick safety check（このフォルダを信頼するか）」は、中身を知らないフォルダでは「信頼しない」を選ぶ
- 設定ファイル（`.claude/` 配下、`settings.json`）への書き込み確認が出たら、自分が頼んだ変更でない限り許可しない
