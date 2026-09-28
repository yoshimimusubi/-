---
name: talent-contact-research
description: >
  タレント台帳（talent_master）の保留者を1人ずつ公開プロフィールで調べ、DM開放・お仕事依頼の受付方針・
  本人が公開しているビジネス用メールアドレス・フォロワー数・活動状況を research_results.csv に記録するスキル。
  「タレントをリサーチして」「DM開放を確認して」「連絡先メールを調べて」「送れるように調べて」
  「research_targets を処理して」「オプトイン未記録を解消したい」などと言われたら、スキル名を言われなくても使う。
  IGGゲームイベント／コンテンツプリントのDM案件の送付前調査が対象。送信・いいね・フォローは一切しない。
---

# タレント連絡先リサーチ

保留になっているタレントを公開情報で確認し、送れる根拠（または送れない理由）を記録する。
記録は `talent_queue.py` が読み、次回の送付キューに自動で反映される。**このスキルでは何も送らない。**

## 使うもの

- 作業フォルダ: 台帳 CSV と `config.json` がある場所（例 `~/dm-ops/talent-master-20260927-canonical`）。以下 `$M`
- ツール: `dm-ops/talent_queue.py`（このリポジトリ）。以下 `$T`
- ブラウザ: Mac 上の Chrome（Claude in Chrome）など、**X に送信元アカウントでログイン済み**のもの

## 手順

### 1. 対象リストを作る

```bash
python3 $T --master $M research-list --campaign all --include-sendable --limit 100
```

- `out/research_targets_全案件_<日付>.csv` … 調べる人（優先度A→B順）。`check` 列に保留理由
- `research_results.csv` … 結果の追記先（無ければヘッダーだけ作られる）

1回の作業は最大100名まで。続きは翌日以降に同じコマンドを実行する（調べ済みは自動で外れる）。

### 2. 1人ずつ確認して、すぐ1行追記する

各項目の判定基準と記入値は [references/fields.md](references/fields.md) を必ず見る。要点:

1. `x_url` を開く → `account_status`（存在／凍結／削除／鍵／見つからない）。存在以外ならそこで記録して次へ
2. 固定以外の最新投稿日 → `last_post_date`、`activity_status`
3. プロフィール・固定投稿・リンク先（lit.link 等）・YouTube 概要欄を読む
   - 事務所・企業所属の記載 → `is_individual=no`、`agency` に事務所名
   - 日本語で活動 → `is_japanese_activity=yes`
   - お仕事依頼の受付方針 → `inquiry_policy`、根拠の文言をそのまま `inquiry_evidence` に
   - 本人／所属事務所が公開しているビジネス用メール → `contact_email`、載っていたページを `email_source_url` に
   - 問い合わせフォーム → `contact_form_url`
4. プロフィールに「メッセージ」ボタン（封筒アイコン）があるか → `dm_open`。見たアカウントを `dm_checked_as` に
   （IGG は @kocho_kurono、コンテンツプリントは @ukamoto_marino で見るのが正。別アカウントで見たら必ずそう書く）
5. フォロワー数、YouTube 登録者数 → `x_followers`、`youtube_subscribers`（表示のまま「1.2万」でよい）
6. `research_results.csv` に1行追記する（`researched_at_jst` は今日の日付、`researcher` は作業者名）

### 3. 反映を確認する

```bash
python3 $T --master $M queue --campaign IGG --dry-run
python3 $T --master $M queue --campaign プリント --dry-run
```

キューの `channel` 列が送付手段（DM／メール／フォーム）になる。

### 4. 報告

調べた人数と、`inquiry_policy` 別・`dm_open` 別・メール取得数・`account_status` が存在以外の人数を表にして返す。
送付可が何名増えたか（キューの「送付可」の前後）も書く。

## 絶対に守ること

- **送らない・触らない**: DM作成画面を開かない、フォロー・いいね・リポスト・返信・ブロックをしない。「メッセージ」ボタンは**見るだけ**でクリックしない
- **推測しない**: メールアドレスを名前から組み立てない。検索結果のスニペット、まとめサイト、第三者のデータベース、流出リストは使わない。本人か所属事務所の公式ページに書かれているものだけ
- **用途限定の窓口は業務窓口にしない**: イラスト・ボイス等の有償依頼専用、切り抜き報告用、マシュマロ・mond 等の匿名質問箱は `inquiry_policy` の根拠にもメールにも使わない（notes にだけ書く）
- **DM開放は同意ではない**: メッセージボタンがあるだけでは `inquiry_policy=DM可` にしない。依頼を受け付ける旨の記載があるときだけ
- **CAPTCHA・ログイン壁を越えない**: YouTube の「メールアドレスを表示」（reCAPTCHA 付き）は解かない。notes に「YouTubeビジネスメールあり（手動表示が必要）」と書いて次へ
- **間隔をあける**: 1人ごとに20〜60秒程度あける。X に制限・警告・再ログイン要求が出たら、その場で止めて報告する
- **元データを書き換えない**: 触ってよいのは `research_results.csv` への追記と `out/` の中だけ。台帳・接触履歴・要確認は編集しない
- **ログイン中のアカウントを勝手に切り替えない**: 切り替えが必要なら人に頼む
