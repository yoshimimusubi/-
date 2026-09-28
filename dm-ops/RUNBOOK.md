# タレントDM送付 運用手順（talent_master 版）

対象案件と送信元アカウント（接触履歴の実績から）:

| 案件 | `--campaign` に使える名前 | 送信元 |
|---|---|---|
| IGGゲームイベント | IGG / igg / ゲームイベント | @kocho_kurono |
| コンテンツプリント | プリント / content_print / コンテンツ | @ukamoto_marino |

ツールは「送ってよい相手を1日分だけ抜き出す」まで。X・YouTube には一切アクセスしない。
送信は必ず人がプロフィールを確認してから手で行う。

## 使うファイル（2026-09-27 両端末統合正本）

Drive: [タレント台帳_統合正本_2026-09-27_両端末照合済み](https://drive.google.com/drive/folders/11EE9qCD4PLtYVTiHADLKCj_SOWsuRhnY)

以前の「他端末照合待ち」フォルダ（3,405行版）は削除済み。数字も下の正本の値を使う。

| ファイル | ツールでの役割 |
|---|---|
| `talent_master.csv`（4,700行） | 台帳。案件ごとの状態・適合・禁止・notes をここで判定 |
| `contact_history.csv`（854行） | 接触履歴。同じ案件の送付済み・他案件接触・直近接触を判定 |
| `needs_review.csv`（3,871件／1,545 ID） | 要確認。載っている人は保留 |
| `identity_aliases.csv` | 同じ人の別ハンドル・別URL。旧ハンドルで送った履歴も拾う |
| `talent_master.xlsx` / `field_provenance.csv` / `source_inventory.csv` / `research_queue.csv` / `public_research_log.csv` / `summary.md` / `mac_mini_merge_notes.md` | 閲覧・根拠確認用（ツールは読まない） |

「送付不明・再送禁止」「両案件送付済み」は別ファイルではなく、台帳の `do_not_contact`・`igg_status`・`content_print_status` 列で判定する。

## 送付キューに入る条件（すべて満たす人だけ）

台帳の列:
- その案件の状態が `未接触`、その案件の適合が `yes`（`fit_igg` / `fit_content_print`）
- `is_japanese_activity=yes`、`is_individual=yes`、`activity_status=活動中`
- `do_not_contact` が yes でない
- 送付手段がある: DM が閉じていない、または DM が閉じていてもリサーチで公開メール／フォームが取れている
- どちらの案件の状態も `送付不明（再送禁止）`・`連絡禁止` でない
- もう一方の案件の状態が `未接触` か `対象外`（＝他案件で接触していない）

notes（書いてあったら保留）:
- 全案件: `送信不可`（オプトイン未記録）、`already queued`、`連絡禁止`、`送付不明`、`再送禁止`
- コンテンツプリントだけ: `要再確認：フォロワー／登録者数`（3,000〜30,000人という条件が古い数値のままのため）

照合（ID・Xハンドル・YouTube・別名のどれか1つでも当たったら保留）:
- `needs_review.csv` に載っている
- `contact_history.csv` にその案件の接触がある／もう一方の案件の接触がある／直近30日以内の接触がある
- X / YouTube が無い、同じ名前の行があって区別できない

並び順は notes の `IGG元リスト優先度=A` → `B` → その他。

## 送付可人数

正本（4,700行版）ではまだツールを通していない。Mac mini の監査（[MAC_MINI_CODEX_AUDIT.md](MAC_MINI_CODEX_AUDIT.md) の F）の
`tool_check.txt` で確定させる。summary.md の条件適合・未接触在庫は IGG 710 / コンテンツプリント 196
（他案件接触も除外すると 691 / 192）だが、notes・要確認による保留を引く前の数字で、送付可人数ではない。

> 旧版（3,405行）での試算「IGG 315名 / プリント 18名」は台帳が変わったため無効。

## リサーチで送付可を増やす

保留理由のうち、次のものは公開プロフィールを調べれば解消しうる:

| 保留理由 | リサーチで何が分かれば解消するか |
|---|---|
| notes「送信不可（オプトイン未記録）」 | プロフィール等に「お仕事依頼はDMへ／メールへ／フォームへ」の記載（`inquiry_policy`）。**DM開放だけでは解消しない** |
| notes「要再確認：フォロワー／登録者数」（プリント） | 今日のフォロワー数・登録者数（3,000〜30,000 なら適合） |
| 条件外 is_individual / is_japanese_activity / activity_status（unknown・不明） | 所属の有無、日本語活動、最新投稿日 |
| DM閉鎖 | 公開ビジネスメール、または問い合わせフォーム → `channel` がメール／フォームになる |

手順はスキル [.claude/skills/talent-contact-research/SKILL.md](../.claude/skills/talent-contact-research/SKILL.md)、
貼り付け用プロンプトは [RESEARCH_PROMPT.md](RESEARCH_PROMPT.md)。

```bash
python3 ../tools/dm-ops/talent_queue.py --master . research-list --campaign all --include-sendable --limit 100
```

結果は作業フォルダの `research_results.csv` に1人1行で追記する。queue は次回から自動でこれを読み、
台帳の値（活動状況・個人か・日本語活動・DM開放・数値）をリサーチ結果で上書きして判定する。
30日より古いリサーチは使わない。対象人数は正本（4,700行版）では未計測（旧版では両案件で約1,750名）。

キューの `channel` 列:
- `DM` … 送信元アカウントからDM
- `メール` … `contact_email` 宛て（本人が「メールへ」と指定している場合や、DMが閉じている場合）
- `フォーム` … `contact_form_url` から

## 手順

### 0. 準備（Mac）

```bash
cd ~/dm-ops
git clone -b claude/codex-chat-task-handoff-ntokd5 https://github.com/yoshimimusubi/-.git tools   # 2回目以降は cd tools && git pull
mkdir -p talent-master-20260927-canonical && cd talent-master-20260927-canonical
#   ↑ Drive フォルダの talent_master.csv / contact_history.csv / needs_review.csv / identity_aliases.csv をここに置く
cp ../tools/dm-ops/config.example.json config.json
python3 ../tools/dm-ops/talent_queue.py --master . inspect
```

inspect の最後に「要対応」が出なければ、列の読み取りは問題ない。

### 1. 空白期間の確認（送信前に必須・1回だけ）

`dm_send_log.csv` / `dm_igg_send_log.csv` の実ファイルは **7/11より新しいものが見つかっていない**。
接触履歴は 9/16 まで入っているが、7/11以降は自動化メモリやスレッドからの復元で、実ログではない。

1. @kocho_kurono（IGG）と @ukamoto_marino（コンテンツプリント）の X の DM 送信済み一覧を 7/11 以降でさかのぼる
2. 接触履歴に無い送付を見つけたら記録する
   ```bash
   python3 ../tools/dm-ops/talent_queue.py --master . record --campaign IGG --key @handle --result sent --note "7/11以降 送信BOXで確認"
   ```
   送れたかどうか分からない相手は `--result unknown`（以後、全案件で再送禁止）
3. Mac mini 側の送信ログ（下の「Mac mini との照合」）が届いたら、それも同じように反映する
4. 終わったら記録を残す
   ```bash
   python3 ../tools/dm-ops/talent_queue.py --master . gap-ok --checked-by 名前 --note "7/11〜9/27 2アカウント確認、追記○件、Mac mini ログ照合済み"
   ```

`gap-ok` までは、queue は `DRYRUN_` 付き（送信禁止版）しか作らない。

### 2. 本日分のキュー

```bash
python3 ../tools/dm-ops/talent_queue.py --master . queue --campaign IGG
python3 ../tools/dm-ops/talent_queue.py --master . queue --campaign プリント --cap 10
```

`out/queue_<案件>_<日付>.csv` に、送付手段（channel）・送信元アカウント・X URL・メール・フォロワー数・数値確認日・notes 付きで出る。
`out/held_<案件>_<日付>.csv` に、保留した全員と理由が出る。

### 3. 送信と記録（1件ずつ）

1. キューの `x_url` を開き、本人であること・活動中であること・DMが開いていることをその場で確認
2. `channel` が DM なら送信元アカウントから、メールなら `contact_email` 宛てに、フォームなら `contact_form_url` から手で送る
3. 送った直後に記録する
   ```bash
   python3 ../tools/dm-ops/talent_queue.py --master . record --campaign IGG --key @aare_mine --result sent
   python3 ../tools/dm-ops/talent_queue.py --master . record --campaign IGG --key @xxx --result failed --note "DM閉鎖"
   python3 ../tools/dm-ops/talent_queue.py --master . record --campaign IGG --key @yyy --result unknown --note "送信後にエラー"
   ```
   `sent` はその案件から外れ、もう一方の案件でも保留になる。`failed` は次回また候補に戻る。`unknown` は全案件で再送禁止。

## Mac mini との照合

台帳・接触履歴の両端末統合は 2026-09-27 に完了（正本フォルダ）。ただし 7/11 より新しい送信ログは両端末とも見つかっておらず、
Mac mini には定期送信の設定が残っている（mac_mini_merge_notes.md「定期送信は変更していない」）。
送信実績の確定は Codex の監査で行う: [MAC_MINI_CODEX_AUDIT.md](MAC_MINI_CODEX_AUDIT.md)。
それまでは「未接触」を「重複なし」の保証として扱わない。

Mac mini の送信ログが届いたら:
- 新しい統合版（talent_master / contact_history）が来た場合 → 新しいフォルダに置いて inspect からやり直す
- 送信ログだけ来た場合 → 接触履歴に無い送付を `record` で追記する（上の手順1）

## Claude / Codex に任せる場合

- やってよい: `inspect`、`queue --dry-run`、`queue`（gap-ok 済みのとき）、人が「送った」と言った分の `record`、保留理由の集計、
  `research-list` とスキルに沿った公開プロフィールの確認（`research_results.csv` への追記）
- やらない: X・YouTube の閲覧・送信・いいね・フォロー、自己判断での `gap-ok`、元ファイルの上書き、定期実行の変更

## テスト

```bash
python3 -m unittest ../tools/dm-ops/test_talent_queue.py
```
