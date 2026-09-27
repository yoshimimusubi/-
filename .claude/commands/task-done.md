---
description: タスクを完了（done）にして TASKS.md を commit & push する
argument-hint: <タスクID> [完了メモ]
---

タスクを完了にしてください。

入力: $ARGUMENTS

手順:
1. `git pull --ff-only` で台帳を最新化する
2. 指定 ID の行の状態を `done`、最終更新を現在の JST、「次の一手」を完了メモ（なければ「完了」）にする
   - ID が見つからなければ候補を示して確認する
3. `## Archive` の下に今月の `### YYYY-MM` 見出しがなければ作り、その行を移動する
4. 月をまたいで残っている `done` 行があれば、同様にそれぞれの月の見出しへ移動する
5. `tasks: <ID> done` で commit し、現在の作業ブランチに push する
6. 残っている `waiting` / `doing` の件数を 1 行で伝えて終了する
