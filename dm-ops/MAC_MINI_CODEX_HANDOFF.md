# Mac mini の Codex への依頼文

下の枠内をそのまま Mac mini の Codex に貼り付ける。

---

```
タレント台帳の端末間照合をお願いします。MacBook Pro 側で統合した版を Google Drive に置きました。

■ 共有フォルダ（フォルダ名に「他端末照合待ち」とあります）
https://drive.google.com/drive/folders/1GbQ_P7vcVtUOfkEh0xdGoiF6EF2jJZRz

中身（9ファイル）:
- talent_master.csv / talent_master.xlsx … 統合台帳 3,405行（xlsx は閲覧用）
- contact_history.csv … 接触履歴 826行（9/16まで。ただし7/11以降は実ログではなく復元）
- needs_review.csv … 要確認 1,393件
- identity_aliases.csv … 同一人物の別ハンドル・X ID・YouTube URL
- field_provenance.csv … 採用値の根拠
- source_inventory.csv … 読んだ資料の一覧（not_found 378件を含む）
- summary.md … 統合結果の要約
- mac_mini_merge_notes.md … Mac mini から欲しい資料と併合ルール ← 最初に読んでください

■ お願いしたいこと
1. mac_mini_merge_notes.md を読む
2. Mac mini にある次の資料を探して、見つかったものの一覧（パス・更新日時・行数）を出す
   - dm_send_log.csv / dm_igg_send_log.csv（特に 2026-07-11 より新しい送信記録）
   - x_like_log.csv、送付不明・返信の個別記録
   - Mac mini 側で作った talent_master.csv / contact_history.csv / source_inventory.csv があればそれも
3. 見つかった資料を、共有フォルダの中に新しいサブフォルダ「macmini_YYYYMMDD」を作ってそこへアップロードする
   （元ファイルはコピーでアップロード。Mac mini 上の元ファイルは動かさない・書き換えない）
4. 余力があれば、mac_mini_merge_notes.md の「併合方法」に沿って照合し、
   統合版を別の新規サブフォルダ「merged_YYYYMMDD」に出力する
   - 照合キーは identity_aliases.csv の全ハンドル・X ID・YouTube URL（talent_id は端末間で一致しない）
   - 片方にでも接触証拠があれば「未接触」に戻さない
   - 送付不明・連絡禁止は全案件共通で除外のまま
   - 7/11以降に Mac mini だけにある送付が何件あったかを summary に書く

■ 守ること
- X・YouTube の閲覧・DM送信・いいね・フォローはしない（照合に X 操作は不要）
- 共有フォルダ内の既存9ファイルは上書き・削除しない
- 定期実行・キュー・ロック・ログの設定は変更しない
- 認証情報・秘密値をアップロードしない

■ 終わったら
アップロードしたサブフォルダ名と、見つかった送信ログの最新日時・件数を教えてください。
```

---

## 届いたあとにやること（MacBook Pro 側）

- `merged_YYYYMMDD` が来た → その CSV で `RUNBOOK.md` の手順0からやり直す
- 送信ログだけ来た → 接触履歴に無い 7/11以降の送付を `talent_queue.py record` で追記 → `gap-ok`
