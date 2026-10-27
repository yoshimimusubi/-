---
name: yoshimi-site-ops
description: >-
  ヨシミムスビ公式サイト（EmDash）の中身を、MCP（yoshimi-site）経由で更新するときの手順と決まりごと。
  「お知らせを追加して」「メンバーを更新して」「会社概要を直して」「トップページの構成を変えて」
  「予約公開して」など、サイトのコンテンツに触れる依頼のときに必ず読む。
  コード（ページや部品）を変える依頼のときは .agents/skills/building-emdash-site を先に読む。
---

# ヨシミムスビ公式サイトの運用

## 最初に確認すること

1. `yoshimi-site` の MCP ツール（`content_list` など）が使えるか。使えなければ docs/AI_OPERATIONS.md の「つなぐ」を案内して止まる
2. どのサイトに対して操作しているか（本番／ローカル）を `settings_get` で確かめ、サイト名と URL をユーザーに伝える

## コンテンツの型

| コレクション | 主な項目 | URL |
|---|---|---|
| `talents`（メンバー） | `title`（名前）, `name_kana`, `name_en`, `theme`（発信テーマ・必須）, `catchphrase`, `summary`, `profile`（本文）, `portrait`（画像）, `color`（#から始まる 6 桁）, `x_url`, `youtube_url`, `sort_order`（小さいほど先） | `/talents/<slug>` |
| `news`（お知らせ） | `title`, `excerpt`（一覧に出る短い文）, `featured_image`, `content`（本文）。分類 `news_category`: `info` / `event` / `goods` / `media` | `/news/<slug>` |
| `pages`（固定ページ） | `title`, `content`（ブロックの配列） | `/<slug>`（`home` は `/`） |

固定ページ: `home`, `talents`, `company`, `contact`, `ai-native`。
ブロックの種類と項目は `schema_list_block_types` / `schema_get_block_type` で確かめてから書く。
このサイト独自のブロック: `talent_showcase`（メンバー紹介）, `news_list`（お知らせ一覧）, `company_profile`（会社概要の表。`rows` に `{label, value, url?}`）。

正確な項目は、書き込む前に必ず `schema_get_collection` で確認する（人が管理画面で項目を足していることがある）。

## 決まりごと

1. **下書きで作る**: `content_create` / `content_update` は下書きのまま。`content_publish` や `status: "published"` は、
   ユーザーがプレビューを確認して「公開して」と言ったときだけ使う
2. **プレビューを返す**: 作ったら、プレビューの URL（または管理画面の編集 URL `/_emdash/admin/content/<collection>/<id>`）を伝える
3. **医療・健康の断定をしない**: 「治る」「効く」「必ず」などの言い切りを書かない。「〜と言われています」「人によって違います」で受ける。
   あっぷるぐみの発信方針（寄り添う・現場への敬意・宣伝しすぎない）に合わせる
4. **個人情報を書かない**: 依頼者や関係者の氏名・連絡先・金額などは、本文にもメタ情報にも入れない
5. **事実を作らない**: 日時・URL・出演者・価格など、ユーザーから聞いていないことは書かずに質問する
6. **画像**: 渡された画像だけを `media_upload` で登録し、`alt`（代替テキスト）を日本語で付ける。ネット上の画像を勝手に使わない
7. **削除はゴミ箱まで**: `content_delete`（復元可能）は確認を取ってから。`content_permanent_delete` は使わない
8. **ブロックを書き換えるとき**: ページの `content` は配列ごと置き換わる。`content_get` で今の配列を取り、
   変えるブロックだけを直して、ほかのブロック（`_key` を含む）はそのまま戻す
9. **予約公開**: `content_schedule` の日時は日本時間で聞き、ISO 8601（`+09:00` 付き）で渡す

## よくある依頼の手順

### お知らせを追加

1. 足りない情報（タイトル、日時、URL、種類）を確認する
2. 画像があれば `media_upload`
3. `content_create`（collection: `news`、本文は Markdown で可、`excerpt` は 60〜80 字）
4. 種類を付ける（`news_category` の `info` / `event` / `goods` / `media`）
5. プレビュー URL を返し、公開・予約公開の指示を待つ

### メンバーを追加・更新

- 追加: `sort_order` は既存メンバーの最大値 +10。`color` はユーザーに聞く（なければ聞いたうえで空にする）
- 更新: `content_get` で今の値を見せてから、変える項目だけを `content_update`

### 会社概要

固定ページ `company` の `company_profile` ブロックの `rows` を直す。項目名は短く（社名・代表者・設立・所在地・事業内容・お問い合わせ）。

## コードの変更が必要な依頼

新しいコレクション（例: 実績、素材ダウンロード）の表示ページや、新しいブロックの見た目を作る依頼は、
コンテンツ操作ではなくコード変更。`.agents/skills/building-emdash-site/SKILL.md` を読み、
`seed/seed.json`・`src/pages/`・`src/components/blocks/` を変更し、ユーザーの承認を取ってから commit と `npm run deploy` を行う。
