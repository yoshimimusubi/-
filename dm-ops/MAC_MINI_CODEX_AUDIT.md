# Mac mini の Codex への依頼文（第1段階：送信実績の確定・読み取りのみ）

下の枠内をそのまま Mac mini の Codex に貼り付ける。
この段階では何も送らない・何も止めない・何も書き換えない。結果が届いてから次の段階（送付再開の可否）を決める。

---

```
タレントDM案件（IGGゲームイベント／コンテンツプリント）の送信実績を確定するための調査をお願いします。
クライアントに正確な数字を説明する必要があるので、推定や復元で埋めず「見つかった証拠」と「見つからなかったこと」を分けて報告してください。
今回は読み取りと集計だけです。DMの送信、定期実行の停止・変更、元ファイルの書き換えはしません。

■ 正本（Google Drive）
フォルダ「タレント台帳_統合正本_2026-09-27_両端末照合済み」
https://drive.google.com/drive/folders/11EE9qCD4PLtYVTiHADLKCj_SOWsuRhnY
（talent_master.csv 4,700行 / contact_history.csv 854行 / needs_review.csv / identity_aliases.csv / summary.md ほか）
※ 以前の依頼文にあった「他端末照合待ち」フォルダは削除済み。使わない。

■ ツール
git clone -b claude/codex-chat-task-handoff-ntokd5 https://github.com/yoshimimusubi/-.git ~/dm-ops/tools
（既にあれば cd ~/dm-ops/tools && git fetch && git checkout claude/codex-chat-task-handoff-ntokd5 && git pull）
手順書: ~/dm-ops/tools/dm-ops/RUNBOOK.md

■ やること（この順番で）

A. 定期実行の棚卸し【最優先】
   次を読み取りだけで調べ、DMの送信・いいね・フォローに関わるものを一覧にする。
   - launchctl list、~/Library/LaunchAgents・/Library/LaunchAgents の plist
   - crontab -l
   - Codex / Claude の自動実行（automations・scheduled tasks）の設定
   - ps aux で動いている dm / igg / x / twitter / playwright / selenium / puppeteer 関連のプロセス
   各項目について: 名前、実行ファイルのパス、スケジュール、有効か、最後に動いた日時、最後のログ行、実際にDMを送る処理か
   → 9/27 以降に DM を送った形跡があるもの、または今も送信が有効なものがあれば、
     B 以降に進む前にその時点で作業を止め、内容だけ報告する（止める・無効にするのはこちらで判断する）

B. 送信の証拠を集める（2026-07-11 〜 今日）
   Mac mini 全体から、送信を示すファイルを探す。例:
   dm_send_log*.csv, dm_igg_send_log*.csv, *send_log*, *sent*, x_like_log*.csv, キュー・ロック・結果ファイル,
   dm/ や igg-dm-3/ などの運用フォルダ、自動実行のログ、送信時のスクリーンショット
   見つかったファイルごとに: パス、更新日時、行数、中の記録の最初と最後の日時
   送信1件ごとの記録を send_evidence.csv にまとめる。列:
     sent_at_jst, campaign, sender_account, x_handle, talent_id, result, evidence_type, evidence_path, evidence_line
   evidence_type は「送信ログ」「自動実行ログ」「キュー結果」「スクリーンショット」「その他」のどれか。
   日時や宛先が読み取れないものは空欄のままにし、推測で埋めない。

C. 接触履歴との突合
   正本の contact_history.csv と send_evidence.csv を、identity_aliases.csv の全ハンドル・X ID・YouTube URL で照合する
   （talent_id は端末間で一致しないのでキーにしない）。
   - missing_in_history.csv … 証拠はあるのに接触履歴に無い送付
   - unverified_history.csv … 接触履歴の 7/11 以降の行のうち、証拠が1つも見つからないもの

D. 重複・禁止違反の洗い出し（期間の制限なし・全期間）
   violations.csv に1件1行で、どの種類かと根拠の行を書く:
   - 同じ案件で同じ人に2回以上送っている
   - 両方の案件から同じ人に送っている（summary.md の「両案件送付 24行」も含めて確認）
   - 台帳で 送付不明（再送禁止）/ 連絡禁止 / do_not_contact=yes の人に送っている（その状態になった後の送付か前かも）
   - notes に「送信不可（オプトイン未記録）」がある人に送っている

E. 件数の突合
   次の数字がなぜ食い違うかを count_reconciliation.md に表で説明する:
   - 台帳の送付済み（IGG 108 / コンテンツプリント 439、summary.md より）
   - contact_history.csv の案件別件数
   - スプレッドシート「IGG_VTuber_DM候補管理_2026年7月」の「過去DM送信ログ」シート（45行）
   - 同シートの「DM最優先50_YYYY-MM-DD」（8/25〜9/27）で、実際に送った記録があるもの
   - B で集めた send_evidence.csv

F. ツールの動作確認（送信なし）
   mkdir -p ~/dm-ops/talent-master-20260927-canonical に正本の talent_master.csv / contact_history.csv /
   needs_review.csv / identity_aliases.csv をコピーして、
     cd ~/dm-ops/talent-master-20260927-canonical
     cp ~/dm-ops/tools/dm-ops/config.example.json config.json
     python3 ~/dm-ops/tools/dm-ops/talent_queue.py --master . inspect
     python3 ~/dm-ops/tools/dm-ops/talent_queue.py --master . queue --campaign IGG --dry-run
     python3 ~/dm-ops/tools/dm-ops/talent_queue.py --master . queue --campaign プリント --dry-run
   の出力を tool_check.txt にそのまま保存する。gap-ok は実行しない。

■ 成果物の置き場所
正本フォルダの中に新しいサブフォルダ「audit_macmini_YYYYMMDD」を作り、次を置く:
  report.md（下の「報告」と同じ内容）/ automation_inventory.md / source_files.csv / send_evidence.csv /
  missing_in_history.csv / unverified_history.csv / violations.csv / count_reconciliation.md / tool_check.txt
正本フォルダ内の既存ファイルは上書き・削除しない。

■ 守ること
- X・YouTube を開かない。DM送信・いいね・フォロー・返信をしない
- 定期実行・キュー・ロック・ログは読むだけ。停止・無効化・編集・移動をしない
- Mac mini 上の元ファイルは動かさない・書き換えない（アップロードはコピーで）
- 見つからないものを復元・推定で埋めない。「見つからない」と書く
- 事実（ファイルで確認できたこと）と推定をはっきり分けて書く
- 認証情報・トークン・Cookie・パスワードを成果物に含めない
- gap-ok を実行しない

■ 報告（report.md と、このチャットへの返信の両方）
1. 定期実行: DM関連のジョブ一覧と、今も送信が有効なものの有無
2. 見つかった送信ログの最新日時と件数（案件別・送信元アカウント別）
3. 7/11 以降で証拠のある送付件数 / 接触履歴に無かった件数 / 接触履歴にあるが証拠の無い件数
4. violations.csv の種類別件数
5. count_reconciliation.md の結論（どの数字を正とすべきか、その根拠）
6. tool_check.txt の inspect「要対応」の有無と、dry-run の送付可人数
7. 調べられなかったこと・分からなかったこと
```

---

## 届いたあとにやること

- 定期実行で今も送信が有効なものがあった → 送付を続けるか止めるかを決める（Codex には止めさせていない）
- `missing_in_history.csv` がある → その分を接触履歴に反映してから `RUNBOOK.md` の手順1へ
- `violations.csv` がある → クライアントへの説明とお詫びの対象を確定する
- すべて確認できたら `gap-ok`（人が実行する）→ 送付再開
