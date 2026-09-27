# セットアップ手順とプロンプト集

リポジトリ側の設定（台帳・運用ルール・フック・スラッシュコマンド・常駐スクリプト）はコミット済み。
残りは **PC 本体でしかできない作業** なので、下の手順とプロンプトを使う。

## 0. 事前チェック（手動・3分）

1. スマホに Claude アプリ、PC に Claude デスクトップアプリ（または Claude Code CLI）を入れる
2. **両方を同じメールアドレスでログイン**（つながらない原因の第1位）
3. アプリを最新版に更新
4. claude.ai/code で GitHub を連携し、`yoshimimusubi/-` にアクセスできることを確認

## 1. PC の Claude Code に渡すセットアッププロンプト

このリポジトリを PC に clone し、そのフォルダで `claude` を起動して、以下をそのまま貼り付ける。

```
PC とスマホ（Claude アプリ）の両方からタスクを相互管理できるように、この PC 側の設定を仕上げてください。
リポジトリ側の設定はコミット済みです。まず次を読んでください:
- docs/task-sync/REQUIREMENTS.md（要件定義）
- CLAUDE.md（台帳の運用ルール）
- .claude/settings.json と .claude/hooks/task-sync-start.sh（SessionStart フック）
- scripts/remote-control/（常駐スクリプト）

変更を加える前に、OS・claude のバージョン・git の状態を確認し、やることの計画を見せて承認を取ってください。

## やること
1. `git pull` で最新化し、`bash .claude/hooks/task-sync-start.sh` を実行して台帳の要約が出ることを確認
2. OS に合わせて Remote Control の常駐を設定
   - macOS: `bash scripts/remote-control/install-mac.sh`
   - Windows: `powershell -ExecutionPolicy Bypass -File scripts\remote-control\install-windows.ps1`
   - 実行前にスクリプトの中身を説明し、実行後にプロセスが動いていることとログを確認
3. 作業中に PC がスリープしない設定を案内（mac は caffeinate で idle スリープは防げるが、
   ノートの蓋を閉じた場合や電源設定は別。現在の設定を確認し、変更が必要なら手順を示して私の承認を待つ）
4. `/task-status` を実行して台帳が読めることを確認
5. 台帳の T-20260927-01 を doing（実行場所 PC）に更新して commit & push

## 完了条件
- スマホの Claude アプリの Code タブにこの PC が表示され、セッションを開始できる
- スマホで追加したタスクが、PC で次にセッションを開いたときに表示される
- 最後に「スマホ側で確認してほしい動作確認手順」を箇条書きで出す
- すべて確認できたら T-20260927-01 を /task-done で完了にする
```

## 2. スマホから使うときの定型プロンプト

### 既存セッションの続きを頼む（Code タブ → 緑マークのセッション）

```
続きをお願いします。終わったら TASKS.md の <ID> を更新して push、判断が要るところは waiting にして教えてください。
```

### 新しい作業を外から頼む（Dispatch / Code タブの新規セッション）

```
新規タスクです。Claude Code で進めてください。
まず /task-add で「<タイトル>」を台帳に追加してから着手してください（実行場所は Cloud）。
内容: <やってほしいこと>
判断が必要になったら waiting にして止まり、何を決めればよいかを 1〜2 行で教えてください。
```

### 今の状況を知りたい

```
/task-status
```

### 家に帰って PC で引き取る（PC のターミナル）

```
claude --teleport
```
で引き取りたいクラウドセッションを選ぶ。引き取ったら「T-xxxx の実行場所を PC にして続きをやって」と頼む。

## 3. 動作確認チェックリスト

- [ ] PC 再起動 → ログインだけでスマホの Code タブに PC が出る
- [ ] PC で始めたセッションにスマホから送信 → PC のターミナルにも反映される
- [ ] スマホ（クラウド）で `/task-add` → PC で新しいセッションを開くと要約に出る
- [ ] PC で `/task-done` → スマホで `/task-status` すると消えている
- [ ] つながらないときは「アカウント一致 → アプリ更新 → PC とスマホの再起動」の順で確認
