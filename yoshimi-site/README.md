# ヨシミムスビ公式サイト（リニューアル版）

Cloudflare 製のオープンソース CMS「[EmDash](https://github.com/emdash-cms/emdash)」で作った、ヨシミムスビ公式サイトのリニューアル版です。
AI エージェント（Claude Code、Claude アプリ）と人が、同じ管理画面・同じデータを使ってサイトを更新します。

- 土台: EmDash 公式の `marketing` テンプレート（Cloudflare 版）を日本語化・拡張
- 動く場所: Cloudflare Workers（サーバー）・D1（データベース）・R2（画像）。無料枠で始められる
- 管理画面: `/_emdash/admin`（パスキーでログイン、日本語表示に対応）
- AI の窓口: `/_emdash/api/mcp`（MCP。OAuth でログインして使う）

## ドキュメント

| ファイル | 内容 |
|---|---|
| [docs/EMDASH_MAPPING.md](docs/EMDASH_MAPPING.md) | 元資料（EmDash 解説動画のまとめ）の内容を、このサイトのどこにどう取り入れたか |
| [docs/AI_OPERATIONS.md](docs/AI_OPERATIONS.md) | Claude Code・スマホの Claude から更新する手順と、頼み方の例 |
| [docs/REPLACE_CHECKLIST.md](docs/REPLACE_CHECKLIST.md) | 公開前に差し替える仮の情報（【】の部分など）の一覧 |
| [docs/preview/](docs/preview/) | デザイン確認用の静的プレビューとスクリーンショット |
| `.claude/skills/yoshimi-site-ops/` | Claude Code がこのサイトを運用するときの手順書（スキル） |
| `.agents/skills/` | EmDash 公式のスキル（サイト構築・プラグイン・CLI） |

## ページ構成

| URL | 中身 | どこで編集するか |
|---|---|---|
| `/` | トップ（ヒーロー・メンバー紹介・活動・方針・お知らせ・FAQ） | 固定ページ「ホーム」のブロック |
| `/talents` | メンバー一覧 | 固定ページ「メンバー」のブロック ＋ メンバーコレクション |
| `/talents/<slug>` | メンバー個別ページ | メンバーコレクション |
| `/news` | お知らせ一覧（種類で絞り込み・ページ送り） | お知らせコレクション |
| `/news/<slug>` | お知らせ個別ページ | お知らせコレクション |
| `/company` | 会社概要 | 固定ページ「会社概要」の「会社概要の表」ブロック |
| `/contact` | お問い合わせ | 固定ページ「お問い合わせ」（フォームはフォームプラグインで作って埋め込む） |
| `/ai-native` | このサイトの仕組み（AI と人で更新していること） | 固定ページ「このサイトの仕組み」 |
| `/llms.txt` | AI 向けのサイト要約（CMS の内容から自動生成） | 自動 |
| `/rss.xml`・`/sitemap.xml` | RSS・サイトマップ | 自動 |

固定ページは「ブロック」を並べて作ります。テンプレートの 11 種類（ヒーロー、特徴・サービス、文章と画像、FAQ など）に、
このサイト用の 3 種類を足しています。

- **メンバー紹介**: メンバーコレクションから表示順に並べる
- **お知らせ一覧**: お知らせコレクションの新しい順に数件を並べる
- **会社概要の表**: 項目名と内容の組（構造化データ）を表で見せる

## コンテンツの型（コレクション）

- **メンバー（talents）**: 名前・よみがな・英字表記・発信テーマ・ひとこと・紹介文・プロフィール本文・立ち絵・イメージカラー・X・YouTube・表示順
- **お知らせ（news）**: タイトル・概要・アイキャッチ画像・本文、分類「お知らせの種類」（お知らせ／イベント・出演／グッズ／メディア・タイアップ）
- **固定ページ（pages）**: タイトル・ブロック

型と初期データは `seed/seed.json` にあります。初回起動時に空のデータベースへ自動で入ります。

## ローカルで動かす（PC）

Node.js 22.12 以上が必要です。

```bash
npm install
npm run dev
```

- サイト: http://localhost:4321/
- 管理画面: http://localhost:4321/_emdash/admin （初回は管理者の作成とパスキー登録の画面が出る）

`emdash-env.d.ts`（型定義）は dev サーバーの起動時に自動で作り直されます。

## Cloudflare に公開する

```bash
npx wrangler login     # ブラウザで Cloudflare にログイン
npm run deploy         # 初回で D1 データベースと R2 バケットが作られる
```

公開後、公開した URL の `/_emdash/admin` で管理者を作り、パスキーを PC とスマホの 2 台で登録します。
独自ドメインを使う場合は、`wrangler.jsonc` の `EMDASH_SITE_URL` と `routes` を設定してから本番の初期設定をします
（パスキーは初期設定したアドレスでしか使えないため）。

`.env` や暗号化キー（`EMDASH_ENCRYPTION_KEY`）は commit しないでください。

## 費用について

- Workers・D1・R2 には無料枠があり、小規模なサイトなら無料で運用できる見込みです（上限は Cloudflare の料金ページで確認）
- **プラグインの隔離実行（サンドボックス）**は Workers の有料プラン（月 $5〜）が必要です。無料プランのままでも、
  このサイトで使っている公式のフォームプラグインは動きます。有料にしたら `wrangler.jsonc` の `worker_loaders` を有効にします
