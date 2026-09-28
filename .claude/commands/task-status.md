---
description: タスク台帳（TASKS.md）の進行中タスクを要約表示する
---

タスク台帳を要約してください。スマホで読みやすいよう短く。

手順:
1. `git pull --ff-only` と `git fetch origin` を実行（失敗しても続行し、失敗したことだけ伝える）
2. `TASKS.md` の `## Active` から状態ごとに並べる。順番は `waiting` → `doing` → `todo`
   - `waiting` は「あなたの判断待ち」として先頭に目立たせる
3. `origin/claude/*` ブランチの `TASKS.md` にしかない `doing` / `waiting` 行があれば
   「クラウドで進行中（未マージ）」として別に示す（`git show origin/<branch>:TASKS.md`）
4. 最終更新から 3 日以上経っている `doing` は「止まっている可能性あり」と注記する
5. 各タスクは `ID タイトル — 次の一手（実行場所）` の 1 行で出す
