---
description: タスク台帳（TASKS.md）に新しいタスクを追加して push する
argument-hint: <タイトル> [実行場所: PC|Cloud|Dispatch]
---

`TASKS.md` の `## Active` 表に新しいタスクを 1 行追加してください。

入力: $ARGUMENTS

手順:
1. `git pull --ff-only` で台帳を最新化する（失敗したら理由を伝えて続行するか確認する）
2. ID は `T-<今日の日付 YYYYMMDD>-<連番2桁>`。同じ日付の既存 ID の最大値 +1
3. 状態は、このセッションですぐ着手するなら `doing`、そうでなければ `todo`
4. 実行場所は引数で指定がなければ、このセッションの環境から判断する
   （ローカル PC なら `PC`、claude.ai/code のクラウドなら `Cloud`、Dispatch から来た依頼なら `Dispatch`）
5. 最終更新は現在の JST（`TZ=Asia/Tokyo date '+%Y-%m-%d %H:%M'`）
6. 「次の一手」に最初にやることを 1 文で書く
7. タイトルと次の一手に API キー・パスワード・個人情報を含めない
8. `tasks: <ID> add` で commit し、現在の作業ブランチに push する
9. 追加した行を表示して終了する
